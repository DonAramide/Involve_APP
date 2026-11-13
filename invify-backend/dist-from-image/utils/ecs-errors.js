"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsError = exports.EcsErrorCode = void 0;
var EcsErrorCode;
(function (EcsErrorCode) {
    EcsErrorCode["CONFIG_NOT_FOUND"] = "CONFIG_NOT_FOUND";
    EcsErrorCode["CONFIG_VALIDATION_FAILED"] = "CONFIG_VALIDATION_FAILED";
    EcsErrorCode["CONFIG_PROVIDER_NOT_REGISTERED"] = "CONFIG_PROVIDER_NOT_REGISTERED";
    EcsErrorCode["CONFIG_ENVIRONMENT_INVALID"] = "CONFIG_ENVIRONMENT_INVALID";
    EcsErrorCode["CONFIG_SECRET_WRITE_FAILED"] = "CONFIG_SECRET_WRITE_FAILED";
    EcsErrorCode["CONFIG_HEALTHCHECK_FAILED"] = "CONFIG_HEALTHCHECK_FAILED";
    EcsErrorCode["CONFIG_CONFLICT"] = "CONFIG_CONFLICT";
    EcsErrorCode["CONFIG_UNAUTHORIZED"] = "CONFIG_UNAUTHORIZED";
})(EcsErrorCode || (exports.EcsErrorCode = EcsErrorCode = {}));
class EcsError extends Error {
    code;
    message;
    details;
    constructor(code, message, details = []) {
        super(message);
        this.code = code;
        this.message = message;
        this.details = details;
        this.name = 'EcsError';
    }
}
exports.EcsError = EcsError;
//# sourceMappingURL=ecs-errors.js.map