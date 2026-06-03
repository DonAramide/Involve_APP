import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const url = process.env.SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_KEY;

async function fetchSchema() {
  try {
    const res = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
      }
    });
    
    fs.writeFileSync('schema.json', JSON.stringify(res.data, null, 2));
    console.log('Schema fetched successfully. Saved to schema.json');
  } catch (err: any) {
    console.error('Error fetching schema:', err.message);
  }
}

fetchSchema();
