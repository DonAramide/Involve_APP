const axios = require('axios');
const fs = require('fs');

async function runDashboardIntegration() {
    const api = axios.create({ baseURL: 'http://localhost:3005' });
    let logOutput = `# Dashboard Physical Test Log\n\n`;

    const log = (msg) => {
        console.log(msg);
        logOutput += msg + '\n';
    };

    try {
        log('## 1. Authentication Phase (Test JWT Injection)');
        const startAuth = performance.now();
        const jwt = require('jsonwebtoken');
        const testTenantId = 'e2b3c4d5-6789-0123-4567-89abcdef0123';
        const token = jwt.sign({ 
            userId: 'test-user-id',
            tenantId: testTenantId,
            role: 'super_admin'
        }, 'invify-fintech-fallback-secret-2026');
        
        const tenantId = testTenantId;
        const authTime = performance.now() - startAuth;
        log(`- Authentication successful (Injected Token). Time: ${authTime.toFixed(2)}ms`);
        log(`- Tenant ID resolved: ${tenantId}`);

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['x-tenant-id'] = tenantId;

        log('\n## 2. Analytics Aggregation (get_school_financial_summary)');
        const startAnalytics = performance.now();
        const analyticsRes = await api.get(`/api/analytics?schoolId=${tenantId}`);
        const analyticsTime = performance.now() - startAnalytics;
        log(`- HTTP Status: ${analyticsRes.status}`);
        log(`- Execution Time: ${analyticsTime.toFixed(2)}ms`);
        log(`- Raw Payload: ${JSON.stringify(analyticsRes.data, null, 2)}`);

        log('\n## 3. Settlement Phases (Ledger Database Probe)');
        const startPhases = performance.now();
        const phasesRes = await api.get('/api/finance/settlement-phases');
        const phasesTime = performance.now() - startPhases;
        log(`- HTTP Status: ${phasesRes.status}`);
        log(`- Execution Time: ${phasesTime.toFixed(2)}ms`);
        log(`- Raw Payload: ${JSON.stringify(phasesRes.data, null, 2)}`);

        log('\n## 4. Wallet Balance Retrieval');
        const startWallet = performance.now();
        const walletRes = await api.get('/api/finance/student/0/balance');
        const walletTime = performance.now() - startWallet;
        log(`- HTTP Status: ${walletRes.status}`);
        log(`- Execution Time: ${walletTime.toFixed(2)}ms`);
        log(`- Raw Payload: ${JSON.stringify(walletRes.data, null, 2)}`);

        log('\n[PASS] All dashboard physical integrations succeeded.');
    } catch (err) {
        log(`\n[FAIL] Test aborted due to error: ${err.message}`);
        if (err.response) {
            log(`Response Data: ${JSON.stringify(err.response.data)}`);
        }
    }

    fs.writeFileSync('C:\\dev\\Involve_APP\\backend\\tests\\integration\\dashboard.log.md', logOutput);
}

runDashboardIntegration();
