// =========================================================================
//  NARA AC — PM2 Ecosystem Configuration (Production VPS)
// =========================================================================

module.exports = {
  apps: [
    {
      name: 'nara-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        SCHEDULER_ENABLED: 'true',
      },
    },
    {
      name: 'nara-ai-service',
      cwd: './ai-service',
      script: '.venv/bin/uvicorn',
      args: 'main:app --host 127.0.0.1 --port 8000 --workers 2',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

