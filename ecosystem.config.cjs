module.exports = {
	apps: [
		{
			name: "openeo-earthengine-server",
			script: "src/server.js",
			autorestart: true,
			cron_restart: "0 0 * * *",
			max_memory_restart: "1G",
			exp_backoff_restart_delay: 100
		}
	]
};
