declare global {
	namespace NodeJS {
		interface ProcessEnv {
			PORT: string;

			TOKEN: string;
			TOKEN_CAMPUSCRAFT: string;

			CORS_ORIGIN?: string;

			MINECRAFT_SURVIVAL_IP: string;

			POSTGRES_URL: string;
			REDIS_URL: string;

			SMTP_HOST: string;
			SMTP_PORT: string;
			SMTP_SECURE?: string;
			SMTP_USER: string;
			SMTP_PASS: string;

			BASE_URL: string;
			DEPLOY_SECRET: string;
			DISCORD_CLIENT_ID: string;
			DISCORD_PUBLIC_KEY: string;
			DISCORD_TOKEN: string;

			DISCORD_GUILD_ID: string;
			DISCORD_VERIFIED_ROLE_ID: string;
		}
	}
}

export {};
