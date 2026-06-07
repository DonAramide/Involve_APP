const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '../src/app.ts');
let appCode = fs.readFileSync(appPath, 'utf8');

if (!appCode.includes('SystemTelemetryService')) {
  const injection = `
import { SystemTelemetryService } from './services/system-telemetry.service';

// Broadcast System Telemetry to all connected clients every 3 seconds
setInterval(async () => {
  try {
    const telemetry = await SystemTelemetryService.getLiveHardwareResources();
    io.to('all').emit('system_telemetry', telemetry);
  } catch (err) {
    console.error('[Telemetry] Error broadcasting stats:', err);
  }
}, 3000);
`;

  // Find export const io and inject before the worker starts
  appCode = appCode.replace('import { analyticsRefreshWorker }', injection + '\nimport { analyticsRefreshWorker }');
  fs.writeFileSync(appPath, appCode);
  console.log('Telemetry successfully injected into app.ts');
} else {
  console.log('Telemetry already exists.');
}
