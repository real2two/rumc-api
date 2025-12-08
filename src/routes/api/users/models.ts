import { t } from "elysia";
import { Pattern } from "~/utils/regex";

export const whitelistModel = {
	get: t.Object({
		id: t.String(),

		email: t.Union([t.String(), t.Null()]),
		parent_id: t.Union([t.String(), t.Null()]),

		uuid: t.Union([t.String(), t.Null()]),
		discord_id: t.Union([t.String(), t.Null()]),

		banned: t.Boolean(),

		created_at: t.Date(),
	}),
	create: t.Union([
		t.Object({
			email: t.String({ format: "email" }),
			parent_id: t.Null(),

			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
		}),
		t.Object({
			email: t.Union([t.String({ format: "email" }), t.Null()]),
			parent_id: t.String({ format: "uuid" }),

			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
		}),
	]),
	update: t.Partial(
		t.Object({
			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
		}),
	),
};
