const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/pages/admin/PlatformOverviewPage.vue');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('socket.io-client')) {
  // 1. Add imports
  code = code.replace(
    "import { useQuasar } from 'quasar'",
    "import { useQuasar } from 'quasar'\nimport { io } from 'socket.io-client'"
  );

  // 2. Add socket connection in onMounted
  const socketLogic = `
  // Initialize Socket.io connection to backend
  const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3004');
  
  socket.on('connect', () => {
    console.log('[Socket] Connected to telemetry stream');
    socket.emit('join_room', { type: 'admin' });
  });

  socket.on('system_telemetry', (data: any) => {
    if (data && data.cpu) {
      hardwareResources.value = data;
    }
  });

  socket.on('agent_locations', (locations: any[]) => {
    // Map geographical coordinates (lat/lng) to UI percentage map (x/y)
    mapNodes.value = locations.map(loc => ({
      tenant: loc.name,
      location: 'Live',
      x: ((loc.lng + 180) / 360) * 100,
      y: ((90 - loc.lat) / 180) * 100,
      status: 'medium',
      color: '#00E676',
      activity: 100
    }));
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from telemetry stream');
  });

  onUnmounted(() => {
    socket.disconnect();
  });
`;

  // Inject into onMounted
  code = code.replace(
    "initializeDashboard()",
    "initializeDashboard()\n" + socketLogic
  );

  fs.writeFileSync(file, code);
  console.log("Socket.io logic successfully injected into PlatformOverviewPage.vue");
} else {
  console.log("Socket.io logic already exists.");
}
