import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "~/db";
import { serverWhitelists } from "~/db/schema";
import {
	grantDiscordVerifiedRole,
	revokeDiscordVerifiedRole,
} from "~/discord/utils";
import { Pattern, Regex } from "~/utils/regex";

const whitelistObject = t.Object({
	id: t.String(),

	email: t.Union([t.String(), t.Null()]),
	parent_id: t.Union([t.String(), t.Null()]),

	uuid: t.String(),
	discord_id: t.Union([t.String(), t.Null()]),

	created_at: t.Date(),
});

const userInputUpdate = t.Object({
	uuid: t.String({ format: "uuid" }),
	discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

	banned: t.Boolean(),
});

const userInputCreation = t.Union([
	t.Object({
		email: t.String({ format: "email" }),
		parent_id: t.Null(),

		uuid: t.String({ format: "uuid" }),
		discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

		banned: t.Boolean(),
	}),
	t.Object({
		email: t.Union([t.String({ format: "email" }), t.Null()]),
		parent_id: t.String({ format: "uuid" }),

		uuid: t.String({ format: "uuid" }),
		discord_id: t.Union([t.String({ pattern: Pattern.Snowflake }), t.Null()]),

		banned: t.Boolean(),
	}),
]);

export const whitelistsRoute = new Elysia({
	prefix: "/whitelists",
})
	.get(
		"",
		async ({ query }) => ({
			total: await db.$count(serverWhitelists),
			whitelists: await db.query.serverWhitelists.findMany({
				orderBy: desc(serverWhitelists.created_at),
				limit: query.limit,
				offset: query.offset,
			}),
		}),
		{
			query: t.Object({
				limit: t.Integer({ minimum: 1, maximum: 1000, default: 100 }),
				offset: t.Integer({ minimum: 0, default: 0 }),
			}),
			response: {
				200: t.Object({
					total: t.Number(),
					whitelists: t.Array(whitelistObject),
				}),
			},
			detail: { description: "Get whitelisted players" },
			tags: ["Whitelists"],
		},
	)
	.post(
		"",
		async ({ body, set }) => {
			if (body.email) {
				const usedEmail = await db.$count(
					serverWhitelists,
					eq(serverWhitelists.email, body.email),
				);
				if (usedEmail) {
					set.status = 409;
					return { error: "email_used" };
				}
			}

			if (body.parent_id) {
				const existsUser = await db.$count(
					serverWhitelists,
					and(
						eq(serverWhitelists.id, body.parent_id),
						isNull(serverWhitelists.parent_id),
					),
				);
				if (!existsUser) {
					set.status = 409;
					return { error: "parent_not_found" };
				}
			}

			const [user] = await db.insert(serverWhitelists).values(body).returning({
				id: serverWhitelists.id,
				created_at: serverWhitelists.created_at,
			});

			if (!user) {
				set.status = 500;
				return "Internal Server Error";
			}

			if (body.discord_id) {
				await grantDiscordVerifiedRole(body.discord_id);
			}

			return user;
		},
		{
			body: userInputCreation,
			response: {
				200: t.Object({ id: t.String(), created_at: t.Date() }),
				409: t.Object({
					error: t.Union([
						t.Literal("email_used"),
						t.Literal("parent_not_found"),
						t.Literal("parent_reached_guest_limit"),
					]),
				}),
				500: t.Literal("Internal Server Error"),
			},
			detail: { description: "Whitelist a player" },
			tags: ["Whitelists"],
		},
	)
	.get(
		"/:id",
		async ({ params, set }) => {
			const isIdUuid = Regex.Uuid.test(params.id);
			const user = await db.query.serverWhitelists.findFirst({
				where: or(
					...(isIdUuid ? [eq(serverWhitelists.id, params.id)] : []),
					eq(serverWhitelists.email, params.id),
					...(isIdUuid ? [eq(serverWhitelists.uuid, params.id)] : []),
					eq(serverWhitelists.discord_id, params.id),
				),
			});

			if (!user) {
				set.status = 404;
				return { error: "not_found" };
			}

			const relations = await db.query.serverWhitelists.findMany({
				where: user.parent_id
					? and(
							ne(serverWhitelists.id, user.id),
							or(
								eq(serverWhitelists.id, user.parent_id),
								eq(serverWhitelists.parent_id, user.parent_id),
							),
						)
					: eq(serverWhitelists.parent_id, user.id),
				orderBy: desc(serverWhitelists.created_at),
			});

			return { user, relations };
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					user: whitelistObject,
					relations: t.Array(whitelistObject),
				}),
				404: t.Object({ error: t.Literal("not_found") }),
			},
			detail: { description: "Get a whitelisted player" },
			tags: ["Whitelists"],
		},
	)
	.patch(
		"/:id",
		async ({ params, body, set }) => {
			const isIdUuid = Regex.Uuid.test(params.id);
			const [user] = await db
				.select({
					id: serverWhitelists.id,
					discordId: serverWhitelists.discord_id,
				})
				.from(serverWhitelists)
				.where(
					or(
						...(isIdUuid ? [eq(serverWhitelists.id, params.id)] : []),
						eq(serverWhitelists.email, params.id),
						...(isIdUuid ? [eq(serverWhitelists.uuid, params.id)] : []),
						eq(serverWhitelists.discord_id, params.id),
					),
				);

			if (!user) {
				set.status = 404;
				return { error: "not_found" };
			}

			if (
				"discord_id" in body &&
				user.discordId !== body.discord_id &&
				user.discordId
			) {
				await revokeDiscordVerifiedRole(user.discordId);
			}

			await db
				.update(serverWhitelists)
				.set(body)
				.where(eq(serverWhitelists.id, user.id))
				.returning({ id: serverWhitelists.id });

			if (
				"discord_id" in body &&
				user.discordId !== body.discord_id &&
				body.discord_id
			) {
				await grantDiscordVerifiedRole(body.discord_id);
			}

			set.status = 204;
			return "No Content";
		},
		{
			params: t.Object({ id: t.String() }),
			body: userInputUpdate,
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal("not_found") }),
			},
			detail: { description: "Update a whitelisted player" },
			tags: ["Whitelists"],
		},
	)
	.delete(
		"/:id",
		async ({ params, set }) => {
			const isIdUuid = Regex.Uuid.test(params.id);
			const [user] = await db
				.select({ id: serverWhitelists.id })
				.from(serverWhitelists)
				.where(
					or(
						...(isIdUuid ? [eq(serverWhitelists.id, params.id)] : []),
						eq(serverWhitelists.email, params.id),
						...(isIdUuid ? [eq(serverWhitelists.uuid, params.id)] : []),
						eq(serverWhitelists.discord_id, params.id),
					),
				);

			if (!user) {
				set.status = 404;
				return { error: "not_found" };
			}

			const deletedUsers = await db
				.delete(serverWhitelists)
				.where(
					or(
						eq(serverWhitelists.id, user.id),
						eq(serverWhitelists.parent_id, user.id),
					),
				)
				.returning({ discordId: serverWhitelists.discord_id });

			for (const { discordId } of deletedUsers) {
				if (!discordId) continue;
				await revokeDiscordVerifiedRole(discordId);
			}

			set.status = 204;
			return "No Content";
		},
		{
			params: t.Object({ id: t.String() }),
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal("not_found") }),
			},
			detail: { description: "Delete a whitelisted player" },
			tags: ["Whitelists"],
		},
	);
