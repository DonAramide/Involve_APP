"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QipEcsProvider = void 0;
const schema_1 = require("./schema");
const validator_1 = require("./validator");
const health_1 = require("./health");
class QipEcsProvider {
    namespace = 'qip';
    displayName = 'Quasar Identity Platform';
    description = 'Core platform identity planes';
    supportsSecrets = true;
    metadata() {
        return {
            namespace: this.namespace,
            displayName: this.displayName,
            category: 'Identity',
            supportsSecrets: this.supportsSecrets,
            supportsHealthChecks: true,
            version: '1.0'
        };
    }
    getDefinitions() {
        return schema_1.QipEcsDefinitions;
    }
    async validate(values) {
        return (0, validator_1.validateQipConfig)(values);
    }
    async healthCheck(resolvedConfig) {
        return (0, health_1.checkQipHealth)(resolvedConfig);
    }
    async migrate() {
        // QIP configuration migration logic would go here
        return Promise.resolve();
    }
}
exports.QipEcsProvider = QipEcsProvider;
//# sourceMappingURL=provider.js.map