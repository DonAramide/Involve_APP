// backend/src/testing/runOrchestrationValidations.js

const orchestrationHarness = require('./OrchestrationValidationRunner');

// Invoke all orchestration resilience stress validation execution blocks sequentially
const validationReport = orchestrationHarness.executeOrchestrationStressSuites();

// If execution encountered assertion failures or cross-tenant leaks, terminate process with non-zero exit status code
if (!validationReport.zeroLeakageInvariantSatisfied || validationReport.assertionsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
