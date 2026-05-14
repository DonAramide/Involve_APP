// backend/src/api/routes/orchestration.routes.js
const express = require('express');
const router = express.Router();
const OrchestrationController = require('../controllers/orchestration.controller');
const { authenticate } = require('../middleware/auth.middleware');

// ============================================================================
// MULTI-TENANT ORCHESTRATION & DYNAMIC EXPERIENCE ROUTER
// ============================================================================

// 1. Retrieve Unified Experience Context (Public/Hydrated natively)
router.get('/context', OrchestrationController.getContext);

// 2. Real-time consumption feedback
router.get('/quotas', authenticate, OrchestrationController.getQuotas);

// 3. Automated Hybrid Baseline Onboarding
router.post('/onboarding/provision', OrchestrationController.provisionBaseline);

// 4. Runtime Module Enablement Gate
router.post('/modules/enable', authenticate, OrchestrationController.enableModule);

// 5. Subscription Plan Elevation
router.post('/tiers/elevate', authenticate, OrchestrationController.elevateTier);

module.exports = router;
