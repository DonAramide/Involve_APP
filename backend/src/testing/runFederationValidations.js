// backend/src/testing/runFederationValidations.js

const federationHarness = require('./FederationValidationRunner');

// Invoke all federated resilience stress validation execution blocks sequentially
const validationReport = federationHarness.executeFederationStressSuites();

// If execution encountered assertion failures or split-brain write collisions, terminate process with non-zero exit status code
if (!validationReport.zeroDualExecutionGuaranteeSatisfied || validationReport.assertionsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
