import { RequestHandler } from 'express';
import { SchoolCardService } from './school-card.service';
export declare function createUnappliedSchoolCardService(): SchoolCardService;
export declare function registerSchoolCardRoutes(app: {
    get: Function;
    put: Function;
    post: Function;
}, authenticate: RequestHandler, service?: SchoolCardService): void;
