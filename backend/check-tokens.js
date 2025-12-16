// Quick script to check registered push tokens
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/admin/users',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('='.repeat(60));
      console.log('📱 REGISTERED PUSH TOKENS');
      console.log('='.repeat(60));
      
      if (result.users && result.users.length > 0) {
        result.users.forEach((user, index) => {
          console.log(`\n${index + 1}. User: ${user.email || 'Unknown'}`);
          console.log(`   Status: ${user.status || 'N/A'}`);
          console.log(`   Push Token: ${user.pushToken ? user.pushToken.substring(0, 40) + '...' : 'NOT REGISTERED'}`);
          console.log(`   Updated: ${user.updatedAt || user.createdAt || 'N/A'}`);
        });
        
        const withTokens = result.users.filter(u => u.pushToken).length;
        const withoutTokens = result.users.length - withTokens;
        
        console.log('\n' + '='.repeat(60));
        console.log(`📊 Summary: ${withTokens} with tokens, ${withoutTokens} without tokens`);
        console.log('='.repeat(60));
      } else {
        console.log('No users registered yet.');
      }
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error connecting to backend:', error.message);
  console.log('\nMake sure the backend is running on http://localhost:3000');
});

req.end();
