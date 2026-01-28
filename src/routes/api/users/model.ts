import { t } from "elysia";
import { Pattern } from "~/utils/regex";

export namespace WhitelistModel {
	export const get = t.Object({
		id: t.String(),

		email: t.Union([t.String(), t.Null()]),
		parent_id: t.Union([t.String(), t.Null()]),

		uuid: t.Union([t.String(), t.Null()]),
		discord_id: t.Union([t.String(), t.Null()]),

		banned: t.Boolean(),
		ban_reason: t.Union([t.String(), t.Null()]),

		created_at: t.Date(),
	});

	export const create = t.Union([
		t.Object({
			email: t.String({ format: "email", maxLength: 254 }),
			parent_id: t.Null(),

			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
			ban_reason: t.Union([
				t.String({ minLength: 1, maxLength: 2048 }),
				t.Null(),
			]),
		}),
		t.Object({
			email: t.Union([t.String({ format: "email", maxLength: 254 }), t.Null()]),
			parent_id: t.String({ format: "uuid" }),

			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
			ban_reason: t.Union([
				t.String({ minLength: 1, maxLength: 2048 }),
				t.Null(),
			]),
		}),
	]);

	export const update = t.Partial(
		t.Object({
			uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
			discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

			banned: t.Boolean(),
			ban_reason: t.Union([t.String(), t.Null()]),
		}),
	);
}
