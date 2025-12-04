require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

client.connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('📊 Database version:', result.rows[0].version);
    return client.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
  });