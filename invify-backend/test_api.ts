import axios from 'axios';

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'aramyde777@gmail.com',
      password: 'wrongpassword' // offline dev mode bypass doesn't care
    });
    console.log('Login Response:', loginRes.data);
    
    const token = loginRes.data.token;
    const tenantId = loginRes.data.user.tenantId || '6ca9d2af-1b09-4990-9073-e792f980a1f6';
    
    const detailsRes = await axios.get(`http://localhost:3000/admin/tenants/${tenantId}/details`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Tenant Details:', detailsRes.data.tenant.name);
  } catch (err: any) {
    console.error('Error:', err.response?.status, err.response?.data);
  }
}
run();
