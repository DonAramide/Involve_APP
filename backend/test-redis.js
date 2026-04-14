const { Redis } = require('ioredis');
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
});

redis.on('error', (err) => {
  console.error('Redis Error:', err);
  process.exit(1);
});

redis.ping().then((res) => {
  console.log('Ping Result:', res);
  process.exit(0);
}).catch((err) => {
  console.error('Ping failed:', err);
  process.exit(1);
});
