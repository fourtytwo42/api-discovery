module.exports = {
  apps: [
    {
      name: 'api-discovery',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/hendo420/api-discovery',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
    },
  ],
};

