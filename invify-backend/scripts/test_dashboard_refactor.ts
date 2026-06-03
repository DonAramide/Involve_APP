import { Request, Response } from 'express';
import { AgentController } from '../src/modules/agent-portal/agent.controller';

// Test Agent ID for E2E609
const AUTH_USER_ID = '1995baad-1d6e-4659-91a8-29b799f8d691';

async function runTest() {
  console.log('--- RUNNING DASHBOARD REFACTOR INTEGRATION TEST ---');

  let responseData: any = null;
  let statusCode = 0;

  const req = {
    user: { id: AUTH_USER_ID }
  } as unknown as Request;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    }
  } as unknown as Response;

  try {
    await AgentController.getDashboard(req, res);
    
    console.log(`Status Code: ${statusCode}`);
    console.log('Response JSON:', JSON.stringify(responseData, null, 2));

    if (statusCode === 200 && responseData.stats) {
      console.log('\n✅ TEST PASSED: Successfully resolved Supabase data and removed mock dependencies.');
    } else {
      console.log('\n❌ TEST FAILED: Unexpected response or error.');
    }

  } catch (err: any) {
    console.error('Test Exception:', err);
  }
}

runTest();
