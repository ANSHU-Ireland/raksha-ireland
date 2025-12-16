module.exports = {
  apps: [{
    name: 'raksha-backend',
    script: 'local-mock-server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/.pm2/logs/raksha-backend-error.log',
    out_file: '/home/ubuntu/.pm2/logs/raksha-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
