const https = require('https');

https.get('https://rpcjelhacmkhzguljdgi.supabase.co', (res) => {
  console.log('StatusCode:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error('Error:', e);
});
