import {
	type AnyPgColumn,
	boolean,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const serverWhitelists = pgTable("server_whitelists", {
	id: uuid("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),

	email: text("email").unique(),
	parent_id: uuid("parent_id").references(
		(): AnyPgColumn => serverWhitelists.id,
	),

	uuid: uuid("uuid").unique(),
	discord_id: text("discord_id").unique(),

	banned: boolean("banned").notNull().default(false),
	ban_reason: text("ban_reason"),

	created_at: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
