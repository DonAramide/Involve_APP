// backend/src/testing/runAIPredictiveValidations.js

const aiPredictiveHarness = require('./AIPredictiveValidationRunner');

// Invoke all AI operational intelligence predictive stress validation execution blocks sequentially
const validationReport = aiPredictiveHarness.executePredictiveStressSuites();

// If execution encountered assertion failures or unauthorized destructive execution, terminate process with non-zero exit status code
if (!validationReport.zeroDestructiveExecutionGuaranteeSatisfied || validationReport.assertionsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
