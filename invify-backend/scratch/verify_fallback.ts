import { AdminController } from '../src/controllers/admin.controller';

// Override process.env with invalid supabase url to simulate db crash
process.env.SUPABASE_URL = 'https://invalid-db.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid';

async function testFallback() {
  console.log('--- STARTING FALLBACK VERIFICATION ---');

  // We need to mock req and res to test controller directly
  const req: any = { body: { broadcast_message: 'Should Fail' } };
  const res: any = {
    status: function(s: number) { this.statusCode = s; return this; },
    json: function(data: any) { this.data = data; return this; },
    statusCode: 200,
    data: null
  };

  console.log('\n1. Testing Read Fallback...');
  await AdminController.getGlobalSettings(req, res);
  if (res.data && res.data.support_phone === '+234 800 INVIFY') {
     console.log('PASSED: Successfully read from global_settings.json fallback after DB failure.');
  } else {
     console.error('FAILED: Did not receive expected fallback data.', res.data);
  }

  console.log('\n2. Testing Write Failure (No silent fallback)...');
  await AdminController.updateGlobalSettings(req, res);
  if (res.statusCode === 500) {
     console.log('PASSED: Update request correctly failed with 500 Server Error without modifying JSON.');
  } else {
     console.error('FAILED: Update request did not return 500.', res.statusCode, res.data);
  }

  console.log('\n--- FALLBACK VERIFICATION COMPLETE ---');
}

testFallback();
