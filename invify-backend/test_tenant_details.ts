import { AdminController } from './src/controllers/admin.controller';
import { Request, Response } from 'express';
async function run() {
  const req = {
    params: { id: '6ca9d2af-1b09-4990-9073-e792f980a1f6' },
    user: { tenantId: '6ca9d2af-1b09-4990-9073-e792f980a1f6', role: 'owner' },
    effectiveTenantId: '6ca9d2af-1b09-4990-9073-e792f980a1f6'
  } as unknown as Request;
  
  const res = {
    status: (code: number) => ({
      json: (data: any) => console.log('STATUS:', code, 'DATA:', JSON.stringify(data, null, 2))
    })
  } as unknown as Response;

  await AdminController.getTenantDetails(req, res);
}
run().catch(console.error);
