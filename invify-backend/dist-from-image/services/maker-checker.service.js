"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakerCheckerService = void 0;
exports.makerCheckerPublicView = makerCheckerPublicView;
exports.isMakerCheckerApply = isMakerCheckerApply;
exports.submitSupportChange = submitSupportChange;
exports.holdForSupportApproval = holdForSupportApproval;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const support_approver_1 = require("../utils/support-approver");
function queueFilePath() {
    if (process.env.MAKER_CHECKER_QUEUE_FILE)
        return process.env.MAKER_CHECKER_QUEUE_FILE;
    const variant = String(process.env.NODE_ENV || 'local').replace(/[^a-z0-9_-]/gi, '') || 'local';
    const name = `maker-checker-queue-${variant}.json`;
    const shared = '/srv/invify/shared';
    try {
        if (fs.existsSync(shared)) {
            fs.accessSync(shared, fs.constants.W_OK);
            return path.join(shared, name);
        }
    }
    catch {
        /* local fallback */
    }
    return path.join(process.cwd(), name);
}
function readQueue() {
    const filePath = queueFilePath();
    try {
        if (!fs.existsSync(filePath))
            return [];
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeQueue(rows) {
    const filePath = queueFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
}
function makerCheckerPublicView(row) {
    return {
        id: row.id,
        domain: row.domain,
        action: row.action,
        target: row.target,
        summary: row.summary,
        makerEmail: row.maker?.email || '',
        status: row.status,
        createdAt: row.createdAt,
        decidedAt: row.decidedAt || null,
        checkerEmail: row.checkerEmail || null,
    };
}
function actorFrom(req) {
    const user = req.user || {};
    return {
        id: String(user.id || ''),
        email: String(user.email || '').trim().toLowerCase(),
        role: String(user.role || ''),
        tenantId: user.tenantId || user.tenant_id || null,
    };
}
function isMakerCheckerApply(req) {
    return req.makerCheckerApply === true;
}
class MakerCheckerService {
    static propose(input) {
        if (!input.maker.email) {
            throw Object.assign(new Error('Sign in is required before submitting a change.'), { status: 401 });
        }
        const rows = readQueue();
        const target = String(input.target || '');
        const existing = rows.find((row) => row.status === 'pending' &&
            row.domain === input.domain &&
            row.action === input.action &&
            row.target === target);
        const next = {
            id: existing?.id || (0, crypto_1.randomUUID)(),
            domain: input.domain,
            action: input.action,
            target,
            summary: String(input.summary || input.action).slice(0, 240),
            body: input.body || {},
            params: input.params || {},
            maker: input.maker,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        const without = rows.filter((row) => row.id !== next.id);
        without.unshift(next);
        writeQueue(without.slice(0, 200));
        return next;
    }
    static list(domain) {
        const rows = readQueue().filter((row) => row.status === 'pending');
        if (!domain)
            return rows;
        return rows.filter((row) => row.domain === domain);
    }
    static peek(id) {
        return readQueue().find((item) => item.id === id);
    }
    static async approve(id, actorEmail) {
        const rows = readQueue();
        const row = rows.find((item) => item.id === id);
        if (!row || row.status !== 'pending') {
            throw Object.assign(new Error('This change is no longer waiting for approval.'), { status: 404 });
        }
        const gate = (0, support_approver_1.canApproveAsSupport)(actorEmail, row.maker.email);
        if (!gate.ok)
            throw Object.assign(new Error(gate.error), { status: 403 });
        const applied = await applyRequest(row);
        if (applied.statusCode >= 400) {
            const message = applied.body?.error || applied.body?.message || 'The change could not be applied.';
            throw Object.assign(new Error(message), { status: applied.statusCode });
        }
        row.status = 'approved';
        row.decidedAt = new Date().toISOString();
        row.checkerEmail = String(actorEmail || '').trim().toLowerCase();
        writeQueue(rows);
        return { request: makerCheckerPublicView(row), result: applied.body };
    }
    static reject(id, actorEmail) {
        const rows = readQueue();
        const row = rows.find((item) => item.id === id);
        if (!row || row.status !== 'pending') {
            throw Object.assign(new Error('This change is no longer waiting for approval.'), { status: 404 });
        }
        const gate = (0, support_approver_1.canApproveAsSupport)(actorEmail, row.maker.email);
        if (!gate.ok)
            throw Object.assign(new Error(gate.error), { status: 403 });
        row.status = 'rejected';
        row.decidedAt = new Date().toISOString();
        row.checkerEmail = String(actorEmail || '').trim().toLowerCase();
        writeQueue(rows);
        void MakerCheckerService.notifyRejectedBilling(row).catch((e) => console.warn('[maker-checker] reject notify failed:', e?.message || e));
        return makerCheckerPublicView(row);
    }
    static async notifyRejectedBilling(row) {
        if (row.domain !== 'tenant_billing' || row.action !== 'post_payment')
            return;
        const { notifyTenantBillingPayment } = await Promise.resolve().then(() => __importStar(require('../modules/tenant-billing/notify')));
        const amountNaira = row.body?.amountNaira != null ? Number(row.body.amountNaira) : null;
        await notifyTenantBillingPayment({
            tenantId: String(row.body?.tenantId || ''),
            stage: 'rejected',
            amountLabel: amountNaira != null && Number.isFinite(amountNaira)
                ? `₦${amountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : undefined,
            amountKobo: row.body?.amountKobo != null ? Number(row.body.amountKobo) : undefined,
            reference: row.body?.reference,
        });
    }
}
exports.MakerCheckerService = MakerCheckerService;
function submitSupportChange(req, input) {
    return MakerCheckerService.propose({ ...input, maker: actorFrom(req) });
}
async function holdForSupportApproval(req, res, input) {
    if (isMakerCheckerApply(req))
        return false;
    try {
        const row = submitSupportChange(req, input);
        res.status(202).json({
            pending: true,
            id: row.id,
            message: 'Submitted. Only support@iips.app can approve this change.',
        });
        return true;
    }
    catch (error) {
        res.status(error.status || 400).json({ error: error.message || 'Could not submit this change.' });
        return true;
    }
}
function captureResponse() {
    const out = { statusCode: 200, body: null };
    const res = {
        status(code) {
            out.statusCode = code;
            return this;
        },
        json(body) {
            out.body = body;
            return this;
        },
        send(body) {
            out.body = body;
            return this;
        },
    };
    return { out, res };
}
async function applyRequest(row) {
    const { out, res } = captureResponse();
    const req = {
        body: row.body || {},
        params: row.params || {},
        query: {},
        headers: { 'x-forwarded-for': 'maker-checker' },
        socket: { remoteAddress: 'maker-checker' },
        ip: 'maker-checker',
        user: {
            id: row.maker.id,
            email: row.maker.email,
            role: row.maker.role,
            tenantId: row.maker.tenantId,
        },
        makerCheckerApply: true,
    };
    if (row.action === 'routing_config') {
        const { PosController } = await Promise.resolve().then(() => __importStar(require('../controllers/pos.controller')));
        await PosController.updateRoutingConfig(req, res);
    }
    else if (row.action === 'quasar_base_url') {
        const { AdminController } = await Promise.resolve().then(() => __importStar(require('../controllers/admin.controller')));
        await AdminController.updateGlobalSettings(req, res);
    }
    else if (row.action === 'user_create') {
        const { UserController } = await Promise.resolve().then(() => __importStar(require('../controllers/user.controller')));
        await UserController.createUser(req, res);
    }
    else if (row.action === 'user_update') {
        const { UserController } = await Promise.resolve().then(() => __importStar(require('../controllers/user.controller')));
        await UserController.updateUser(req, res);
    }
    else if (row.action === 'user_reset_mfa') {
        const { UserController } = await Promise.resolve().then(() => __importStar(require('../controllers/user.controller')));
        await UserController.resetUserMfa(req, res);
    }
    else if (row.action === 'user_reset_password') {
        const { AuthController } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
        req.body = { userId: row.params?.id || row.body?.userId, newPassword: row.body?.newPassword };
        await AuthController.resetPassword(req, res);
    }
    else if (row.action === 'staff_invite') {
        const { InviteController } = await Promise.resolve().then(() => __importStar(require('../controllers/invite.controller')));
        await InviteController.sendInvite(req, res);
    }
    else if (row.action === 'create_plan') {
        const { TenantBillingController } = await Promise.resolve().then(() => __importStar(require('../controllers/tenant-billing.controller')));
        await TenantBillingController.createPlan(req, res);
    }
    else if (row.action === 'post_payment') {
        const { TenantBillingController } = await Promise.resolve().then(() => __importStar(require('../controllers/tenant-billing.controller')));
        await TenantBillingController.postPayment(req, res);
    }
    else {
        out.statusCode = 400;
        out.body = { error: 'Unknown change type.' };
    }
    return out;
}
//# sourceMappingURL=maker-checker.service.js.map