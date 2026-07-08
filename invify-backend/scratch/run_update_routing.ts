import { PosService } from '../src/services/pos.service';

async function run() {
  console.log('Simulating updateRoutingConfig on staging...');
  const newConfig = {
    test: true
  };
  try {
    const res = await PosService.updateRoutingConfig(newConfig, 'AdminTest', 'Testing staging update');
    console.log('Success:', res);
  } catch (error: any) {
    console.error('❌ Failed with error:', error);
  }
}

run().catch(console.error);
