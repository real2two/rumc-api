import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "elysia";
import * as schema from "./schema";

export const db = drizzle(env.POSTGRES_URL, { schema });
export * as schema from "./schema";
