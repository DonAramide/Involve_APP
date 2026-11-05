"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContaboEcsProvider = void 0;
const schema_1 = require("./schema");
const validator_1 = require("./validator");
const health_1 = require("./health");
class ContaboEcsProvider {
    namespace = 'contabo';
    displayName = 'Contabo Object Storage';
    description = 'S3-compatible global storage endpoints';
    supportsSecrets = true;
    metadata() {
        return {
            namespace: this.namespace,
            displayName: this.displayName,
            category: 'Cloud Storage',
            supportsSecrets: this.supportsSecrets,
            supportsHealthChecks: true,
            version: '1.0'
        };
    }
    getDefinitions() {
        return schema_1.ContaboEcsDefinitions;
    }
    async validate(values) {
        return (0, validator_1.validateContaboConfig)(values);
    }
    async healthCheck(resolvedConfig) {
        return (0, health_1.checkContaboHealth)(resolvedConfig);
    }
    async migrate() {
        // Contabo configuration migration logic would go here
        return Promise.resolve();
    }
}
exports.ContaboEcsProvider = ContaboEcsProvider;
//# sourceMappingURL=provider.js.map