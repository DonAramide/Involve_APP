"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeRequestService = void 0;
class ChangeRequestService {
    static requests = new Map();
    static seq = 0;
    static clearMockData() {
        this.requests.clear();
        this.seq = 0;
    }
    static create(input) {
        const id = `CR-${++this.seq}-${Date.now().toString(36).toUpperCase()}`;
        const now = new Date().toISOString();
        const cr = {
            id,
            type: input.type,
            proposedData: input.proposedData,
            requestedBy: input.requestedBy,
            changeReason: input.changeReason,
            status: 'DRAFT',
            policyId: input.policyId ?? null,
            approvals: [],
            rejections: [],
            createdAt: now,
            updatedAt: now,
            correlationId: `CORR-${id}`,
        };
        this.requests.set(id, cr);
        return cr;
    }
    static getById(id) {
        return this.requests.get(id) ?? null;
    }
    static getAll() {
        return Array.from(this.requests.values());
    }
    static getPending() {
        return this.getAll().filter((r) => r.status === 'PENDING_REVIEW');
    }
    static updateStatus(id, status, extra = {}) {
        const cr = this.requests.get(id);
        if (!cr)
            throw new Error(`[ChangeRequestService] Request ${id} not found.`);
        const updated = { ...cr, ...extra, status, updatedAt: new Date().toISOString() };
        this.requests.set(id, updated);
        return updated;
    }
    static addApproval(id, approverId, comment) {
        const cr = this.requests.get(id);
        if (!cr)
            throw new Error(`[ChangeRequestService] Request ${id} not found.`);
        const updated = {
            ...cr,
            approvals: [...cr.approvals, { approverId, approvedAt: new Date().toISOString(), comment }],
            updatedAt: new Date().toISOString(),
        };
        this.requests.set(id, updated);
        return updated;
    }
    static addRejection(id, rejectedBy, reason) {
        const cr = this.requests.get(id);
        if (!cr)
            throw new Error(`[ChangeRequestService] Request ${id} not found.`);
        const updated = {
            ...cr,
            rejections: [...cr.rejections, { rejectedBy, rejectedAt: new Date().toISOString(), reason }],
            status: 'REJECTED',
            updatedAt: new Date().toISOString(),
        };
        this.requests.set(id, updated);
        return updated;
    }
}
exports.ChangeRequestService = ChangeRequestService;
//# sourceMappingURL=ChangeRequestService.js.map