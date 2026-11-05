"use strict";
// invify-backend/src/contracts/billing/FeeStructures.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionTier = exports.FeeCategory = exports.FeeType = void 0;
var FeeType;
(function (FeeType) {
    FeeType["FLAT"] = "FLAT";
    FeeType["PERCENTAGE"] = "PERCENTAGE";
    FeeType["HYBRID"] = "HYBRID"; // Base flat fee + percentage
})(FeeType || (exports.FeeType = FeeType = {}));
var FeeCategory;
(function (FeeCategory) {
    FeeCategory["SUBSCRIPTION"] = "SUBSCRIPTION";
    FeeCategory["TRANSACTION"] = "TRANSACTION";
    FeeCategory["WALLET"] = "WALLET";
    FeeCategory["WITHDRAWAL"] = "WITHDRAWAL";
    FeeCategory["SMS"] = "SMS";
    FeeCategory["MAINTENANCE"] = "MAINTENANCE";
    FeeCategory["OTA"] = "OTA";
    FeeCategory["DEVICE_ENROLLMENT"] = "DEVICE_ENROLLMENT";
    FeeCategory["NOTIFICATION"] = "NOTIFICATION";
    FeeCategory["AI_INTELLIGENCE"] = "AI_INTELLIGENCE";
    FeeCategory["FEDERATION"] = "FEDERATION";
    FeeCategory["SLA"] = "SLA";
})(FeeCategory || (exports.FeeCategory = FeeCategory = {}));
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "FREE";
    SubscriptionTier["BASIC"] = "BASIC";
    SubscriptionTier["PREMIUM"] = "PREMIUM";
    SubscriptionTier["ENTERPRISE"] = "ENTERPRISE";
    SubscriptionTier["CUSTOM"] = "CUSTOM";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
//# sourceMappingURL=FeeStructures.js.map