const io = require('socket.io-client');

const socket = io('http://localhost:3004');

socket.on('connect', () => {
  console.log('Mobile App Connected: ', socket.id);
  
  const tenantId = 'test-mobile-tenant';
  let lat = 6.5244; // Lagos, Nigeria
  let lng = 3.3792;
  
  console.log('Emitting location update...');
  socket.emit('update_location', {
    tenantId,
    name: 'Mobile Onboarding Agent',
    lat,
    lng
  });

  // Simulate movement
  setInterval(() => {
    lat += (Math.random() - 0.5) * 5;
    lng += (Math.random() - 0.5) * 5;
    console.log(`Moving to lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`);
    socket.emit('update_location', {
      tenantId,
      name: 'Mobile Onboarding Agent',
      lat,
      lng
    });
  }, 4000);
});

socket.on('system_telemetry', (data) => {
  console.log('Received system telemetry:', data.cpu.value + '% CPU');
});
