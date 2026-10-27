import { Request, Response, NextFunction, RequestHandler } from 'express';
import { SchoolCardService } from './school-card.service';
import { UnappliedSchoolCardStore } from './school-card.store';
import { SchoolCardError } from './school-card.errors';
import { CardActor } from './school-card.types';
import {
  schoolCardSqlRequested,
  issueCardThroughDatabase,
  replaceCardThroughDatabase,
  revokeCardThroughDatabase,
  saveSettingsThroughDatabase,
  readSettingsThroughDatabase,
  listEligibleThroughDatabase,
  listCardsThroughDatabase,
  previewThroughDatabase,
  readMyCardThroughDatabase,
  batchThroughDatabase,
} from './school-card.persistence';
import { listGateSessionsThroughDatabase, scanHttpStatus, scanThroughDatabase } from './school-gate.scan';

export function createUnappliedSchoolCardService(): SchoolCardService {
  return new SchoolCardService(new UnappliedSchoolCardStore());
}

export function registerSchoolCardRoutes(
  app: { get: Function; put: Function; post: Function },
  authenticate: RequestHandler,
  service: SchoolCardService = createUnappliedSchoolCardService(),
): void {
  const route = (method: 'get' | 'put' | 'post', path: string, handler: (req: Request, res: Response) => void | Promise<void>) => {
    app[method](path, authenticate, (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve()
        .then(() => handler(req, res))
        .catch((error: unknown) => {
          if (error instanceof SchoolCardError) {
            if (!res.headersSent) res.status(error.status).json({ error: error.message, code: error.code });
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
    if (schoolCardSqlRequested()) {
      res.json({ settings: await readSettingsThroughDatabase(actor(req)) });
      return;
    }
    res.json({ settings: service.getSettings(actor(req)) });
  });
  route('put', '/api/school/id-cards/settings', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.json({ settings: await saveSettingsThroughDatabase(actor(req), body(req)) });
      return;
    }
    res.json({ settings: service.saveSettings(actor(req), body(req)) });
  });
  route('post', '/api/school/id-cards/signature', async (req, res) => {
    const saved = await service.acceptSignature(actor(req), body(req).image);
    res.status(201).json(saved);
  });
  route('get', '/api/school/id-cards/eligible', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.json(await listEligibleThroughDatabase(actor(req)));
      return;
    }
    res.json(service.listEligible(actor(req)));
  });
  route('get', '/api/school/id-cards/preview', async (req, res) => {
    const request = { subjectType: req.query.subjectType, subjectId: req.query.subjectId };
    if (schoolCardSqlRequested()) {
      res.json({ face: await previewThroughDatabase(actor(req), request) });
      return;
    }
    res.json({ face: service.preview(actor(req), request) });
  });
  route('get', '/api/school/id-cards', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.json({ cards: await listCardsThroughDatabase(actor(req)) });
      return;
    }
    res.json({ cards: service.listCards(actor(req)) });
  });
  route('get', '/api/school/id-cards/mine', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.json(await readMyCardThroughDatabase(actor(req)));
      return;
    }
    res.json(service.myCard(actor(req)));
  });
  route('post', '/api/school/id-cards/issue', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.status(201).json(await issueCardThroughDatabase(actor(req), subject(req)));
      return;
    }
    res.status(201).json(service.issue(actor(req), subject(req)));
  });
  route('post', '/api/school/id-cards/batch', async (req, res) => {
    const people = Array.isArray(body(req).people) ? body(req).people : [];
    if (schoolCardSqlRequested()) {
      res.status(201).json({ cards: await batchThroughDatabase(actor(req), people) });
      return;
    }
    res.status(201).json({ cards: service.batch(actor(req), people) });
  });
  route('post', '/api/school/id-cards/:cardId/replace', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.status(201).json(await replaceCardThroughDatabase(actor(req), String(req.params.cardId || '')));
      return;
    }
    res.status(201).json(service.replace(actor(req), String(req.params.cardId || '')));
  });
  route('post', '/api/school/id-cards/:cardId/revoke', async (req, res) => {
    if (schoolCardSqlRequested()) {
      res.json(await revokeCardThroughDatabase(actor(req), String(req.params.cardId || ''), body(req).reason));
      return;
    }
    res.json({ card: service.revoke(actor(req), String(req.params.cardId || ''), body(req).reason) });
  });
  route('post', '/api/school/gate/scans', async (req, res) => {
    const result = await scanThroughDatabase(actor(req), body(req));
    res.status(scanHttpStatus(result)).json(result);
  });
  route('get', '/api/school/gate/sessions', async (req, res) => {
    res.json(await listGateSessionsThroughDatabase(actor(req), req.query as Record<string, unknown>));
  });
}

function actor(req: Request): CardActor {
  const user = (req as Request & { user?: CardActor }).user || {};
  return { id: user.id, role: user.role, tenantId: user.tenantId, email: user.email };
}

function body(req: Request): Record<string, any> {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function subject(req: Request) {
  const value = body(req);
  return { subjectType: value.subjectType, subjectId: value.subjectId, expiresAt: value.expiresAt };
}
