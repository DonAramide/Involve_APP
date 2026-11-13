"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsProviderRegistry = void 0;
const provider_1 = require("./qip/provider");
const provider_2 = require("./contabo/provider");
class EcsProviderRegistry {
    static instance;
    providers = new Map();
    constructor() {
        this.registerProvider(new provider_1.QipEcsProvider());
        this.registerProvider(new provider_2.ContaboEcsProvider());
    }
    static getInstance() {
        if (!EcsProviderRegistry.instance) {
            EcsProviderRegistry.instance = new EcsProviderRegistry();
        }
        return EcsProviderRegistry.instance;
    }
    registerProvider(provider) {
        this.providers.set(provider.namespace, provider);
    }
    getProvider(namespace) {
        return this.providers.get(namespace);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
}
exports.EcsProviderRegistry = EcsProviderRegistry;
//# sourceMappingURL=registry.js.map