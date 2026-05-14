// backend/src/testing/runRealtimeValidations.js

const realtimeHarness = require('./RealtimeValidationRunner');

// Invoke all real-time infrastructure stress validation execution blocks sequentially
const validationReport = realtimeHarness.executeRealtimeStressSuites();

// If execution encountered assertion failures or silent drops, terminate process with non-zero exit status code
if (!validationReport.zeroLossInvariantSatisfied || validationReport.assertionsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
