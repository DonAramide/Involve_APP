require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query(`NOTIFY pgrst, 'reload schema'`);
}).then(() => {
  console.log('Schema reloaded!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
