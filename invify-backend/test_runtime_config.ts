import { RuntimeConfigService } from './src/services/runtime.service';
async function run() {
  const config = await RuntimeConfigService.getConfig('6ca9d2af-1b09-4990-9073-e792f980a1f6');
  console.log(JSON.stringify(config, null, 2));
}
run().catch(console.error);
