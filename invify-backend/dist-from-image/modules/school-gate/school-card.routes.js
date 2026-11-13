"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnappliedSchoolCardService = createUnappliedSchoolCardService;
exports.registerSchoolCardRoutes = registerSchoolCardRoutes;
const school_card_service_1 = require("./school-card.service");
const school_card_store_1 = require("./school-card.store");
const school_card_errors_1 = require("./school-card.errors");
const school_card_persistence_1 = require("./school-card.persistence");
const school_gate_scan_1 = require("./school-gate.scan");
function createUnappliedSchoolCardService() {
    return new school_card_service_1.SchoolCardService(new school_card_store_1.UnappliedSchoolCardStore());
}
function registerSchoolCardRoutes(app, authenticate, service = createUnappliedSchoolCardService()) {
    const route = (method, path, handler) => {
        app[method](path, authenticate, (req, res, next) => {
            Promise.resolve()
                .then(() => handler(req, res))
                .catch((error) => {
                if (error instanceof school_card_errors_1.SchoolCardError) {
                    if (!res.headersSent)
                        res.status(error.status).json({ error: error.message, code: error.code });
                    return;
                }
                next(error);
            });
        });
    };
    route('get', '/api/school/id-cards/templates', (req, res) => {
        res.json({ templates: service.templates(actor(req)) });
    });
    route('get', '/api/school/id-cards/settings', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json({ settings: await (0, school_card_persistence_1.readSettingsThroughDatabase)(actor(req)) });
            return;
        }
        res.json({ settings: service.getSettings(actor(req)) });
    });
    route('put', '/api/school/id-cards/settings', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json({ settings: await (0, school_card_persistence_1.saveSettingsThroughDatabase)(actor(req), body(req)) });
            return;
        }
        res.json({ settings: service.saveSettings(actor(req), body(req)) });
    });
    route('post', '/api/school/id-cards/signature', async (req, res) => {
        const saved = await service.acceptSignature(actor(req), body(req).image);
        res.status(201).json(saved);
    });
    route('get', '/api/school/id-cards/eligible', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json(await (0, school_card_persistence_1.listEligibleThroughDatabase)(actor(req)));
            return;
        }
        res.json(service.listEligible(actor(req)));
    });
    route('get', '/api/school/id-cards/preview', async (req, res) => {
        const request = { subjectType: req.query.subjectType, subjectId: req.query.subjectId };
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json({ face: await (0, school_card_persistence_1.previewThroughDatabase)(actor(req), request) });
            return;
        }
        res.json({ face: service.preview(actor(req), request) });
    });
    route('get', '/api/school/id-cards', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json({ cards: await (0, school_card_persistence_1.listCardsThroughDatabase)(actor(req)) });
            return;
        }
        res.json({ cards: service.listCards(actor(req)) });
    });
    route('get', '/api/school/id-cards/mine', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json(await (0, school_card_persistence_1.readMyCardThroughDatabase)(actor(req)));
            return;
        }
        res.json(service.myCard(actor(req)));
    });
    route('post', '/api/school/id-cards/issue', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.status(201).json(await (0, school_card_persistence_1.issueCardThroughDatabase)(actor(req), subject(req)));
            return;
        }
        res.status(201).json(service.issue(actor(req), subject(req)));
    });
    route('post', '/api/school/id-cards/batch', async (req, res) => {
        const people = Array.isArray(body(req).people) ? body(req).people : [];
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.status(201).json({ cards: await (0, school_card_persistence_1.batchThroughDatabase)(actor(req), people) });
            return;
        }
        res.status(201).json({ cards: service.batch(actor(req), people) });
    });
    route('post', '/api/school/id-cards/:cardId/replace', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.status(201).json(await (0, school_card_persistence_1.replaceCardThroughDatabase)(actor(req), String(req.params.cardId || '')));
            return;
        }
        res.status(201).json(service.replace(actor(req), String(req.params.cardId || '')));
    });
    route('post', '/api/school/id-cards/:cardId/revoke', async (req, res) => {
        if ((0, school_card_persistence_1.schoolCardSqlRequested)()) {
            res.json(await (0, school_card_persistence_1.revokeCardThroughDatabase)(actor(req), String(req.params.cardId || ''), body(req).reason));
            return;
        }
        res.json({ card: service.revoke(actor(req), String(req.params.cardId || ''), body(req).reason) });
    });
    route('post', '/api/school/gate/scans', async (req, res) => {
        const result = await (0, school_gate_scan_1.scanThroughDatabase)(actor(req), body(req));
        res.status((0, school_gate_scan_1.scanHttpStatus)(result)).json(result);
    });
    route('get', '/api/school/gate/sessions', async (req, res) => {
        res.json(await (0, school_gate_scan_1.listGateSessionsThroughDatabase)(actor(req), req.query));
    });
}
function actor(req) {
    const user = req.user || {};
    return { id: user.id, role: user.role, tenantId: user.tenantId, email: user.email };
}
function body(req) {
    return req.body && typeof req.body === 'object' ? req.body : {};
}
function subject(req) {
    const value = body(req);
    return { subjectType: value.subjectType, subjectId: value.subjectId, expiresAt: value.expiresAt };
}
//# sourceMappingURL=school-card.routes.js.map