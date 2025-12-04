import Elysia, { t } from "elysia";
import { ErrorCodes } from "~/types/errors";
import { Pattern } from "~/utils/regex";
import {
	addWhitelist,
	deleteWhitelist,
	getWhitelist,
	getWhitelistRelations,
	listWhitelists,
	updateWhitelist,
} from "~/utils/whitelist";

const whitelistObject = t.Object({
	id: t.String(),

	email: t.Union([t.String(), t.Null()]),
	parent_id: t.Union([t.String(), t.Null()]),

	uuid: t.Union([t.String(), t.Null()]),
	discord_id: t.Union([t.String(), t.Null()]),

	banned: t.Boolean(),

	created_at: t.Date(),
});

const userInputUpdate = t.Object({
	uuid: t.Union([t.String({ format: "uuid" }), t.Null()]),
	discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

	banned: t.Boolean(),
});

const userInputCreation = t.Union([
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
]);

export const whitelistsRoute = new Elysia({
	prefix: "/whitelists",
})
	.get("", ({ query }) => listWhitelists(query), {
		query: t.Object({
			limit: t.Integer({ minimum: 1, maximum: 1000, default: 100 }),
			offset: t.Integer({ minimum: 0, default: 0 }),
		}),
		response: {
			200: t.Object({
				total: t.Number(),
				users: t.Array(whitelistObject),
			}),
		},
		detail: { description: "List users" },
		tags: ["Whitelists"],
	})
	.post(
		"",
		async ({ body, set }) => {
			const { error, user } = await addWhitelist(body);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			return user;
		},
		{
			body: userInputCreation,
			response: {
				200: t.Object({ id: t.String(), created_at: t.Date() }),
				409: t.Object({
					error: t.Union([
						t.Literal(ErrorCodes.EmailUsed),
						t.Literal(ErrorCodes.ParentNotFound),
						t.Literal(ErrorCodes.ParentReachedGuestLimit),
						t.Literal(ErrorCodes.MinecraftUuidUsed),
						t.Literal(ErrorCodes.DiscordIdUsed),
					]),
				}),
				500: t.Object({
					error: t.Literal(ErrorCodes.InternalServerError),
				}),
			},
			detail: { description: "Whitelist a player" },
			tags: ["Whitelists"],
		},
	)
	.get(
		"/:id",
		async ({ params, set }) => {
			const { error, user } = await getWhitelist(params.id);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}

			const { relations } = await getWhitelistRelations(user);
			return { user, relations };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					user: whitelistObject,
					relations: t.Array(whitelistObject),
				}),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
			detail: { description: "Get user" },
			tags: ["Whitelists"],
		},
	)
	.patch(
		"/:id",
		async ({ params, body, set }) => {
			const { error } = await updateWhitelist(params.id, body);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			set.status = 204;
			return "No Content";
		},
		{
			params: t.Object({ id: t.String() }),
			body: userInputUpdate,
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
			detail: {
				description:
					"Update user (keep in mind: if the player is banned, they won't be kicked off the server)",
			},
			tags: ["Whitelists"],
		},
	)
	.delete(
		"/:id",
		async ({ params, set }) => {
			const { error } = await deleteWhitelist(params.id);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			set.status = 204;
			return "No Content";
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
			detail: {
				description:
					"Delete user (keep in mind: if the player is in the server, they won't be kicked off)",
			},
			tags: ["Whitelists"],
		},
	);
