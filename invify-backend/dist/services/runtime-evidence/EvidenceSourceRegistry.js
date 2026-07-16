"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceSourceRegistry = void 0;
class EvidenceSourceRegistry {
    static providers = new Map();
    static collectionsCount = 0;
    static register(provider) {
        this.providers.set(provider.name, provider);
    }
    static getProvider(name) {
        return this.providers.get(name);
    }
    static getAllProviders() {
        return Array.from(this.providers.values());
    }
    static clearRegistry() {
        this.providers.clear();
        this.collectionsCount = 0;
    }
    static incrementCollections() {
        this.collectionsCount++;
    }
    static getCollectionsCount() {
        return this.collectionsCount;
    }
}
exports.EvidenceSourceRegistry = EvidenceSourceRegistry;
//# sourceMappingURL=EvidenceSourceRegistry.js.map