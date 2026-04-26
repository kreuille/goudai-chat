// ecosystem.config.js — PM2 process manager
module.exports = {
  apps: [
    {
      name: 'goudai-server',
      script: './server/index.js',
      cwd: '/var/www/goudai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/goudai-error.log',
      out_file:   '/var/log/pm2/goudai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
