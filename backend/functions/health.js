exports.handler = async (event) => {
  console.log('Health check request:', JSON.stringify(event, null, 2));
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  const timestamp = new Date().toISOString();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'healthy',
      service: 'RAKSHA Ireland API',
      timestamp,
      version: '1.0.0',
      region: process.env.AWS_REGION || 'eu-west-1',
      environment: process.env.NODE_ENV || 'development'
    })
  };
};