import { defineConfig } from "drizzle-kit";
import { env } from "elysia";

export default defineConfig({
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: { url: env.POSTGRES_URL },
});
