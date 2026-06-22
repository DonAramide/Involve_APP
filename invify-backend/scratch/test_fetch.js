fetch('https://rpcjelhacmkhzguljdgi.supabase.co')
  .then(res => {
    console.log('Fetch Status:', res.status);
  })
  .catch(err => {
    console.error('Fetch Error:', err);
  });
