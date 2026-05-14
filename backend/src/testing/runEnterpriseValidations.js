// backend/src/testing/runEnterpriseValidations.js

const validationHarness = require('./EnterpriseValidationRunner');

// Invoke all validation execution blocks sequentially
const validationReport = validationHarness.executeAllValidationSuites();

// If execution encountered assertion failures or panics, terminate process with non-zero exit status code
if (!validationReport.zeroCrashGuaranteeSatisfied || validationReport.assertionsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
