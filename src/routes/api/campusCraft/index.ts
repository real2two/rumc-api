import { and, desc, eq, ne, or } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "~/db";
import { serverWhitelists } from "~/db/schema";
import { campusCraftAuthPlugin } from "~/plugins/campusCraft";
import { Regex } from "~/utils/regex";

const userObject = t.Object(
	{
		id: t.String({ description: "Internal ID of the user" }),
		email: t.Union([
			t.String({
				format: "email",
				description: "Email of the user (guests can have emails)",
			}),
			t.Null({
				description: "No email provided (for guests)",
			}),
		]),
		parent_id: t.Union([
			t.String({ description: "Internal ID of the parent user" }),
			t.Null({ description: "Not invited by another user (for non-guests)" }),
		]),
		uuid: t.Union([
			t.String({ description: "Minecraft account UUID" }),
			t.Null({ description: "No Minecraft account linked" }),
		]),
		discord_id: t.Union([
			t.String({ description: "Discord user ID (snowflake)" }),
			t.Null({ description: "No Discord account is linked" }),
		]),
	},
	{ description: "A user object" },
);

export const campusCraftRoutes = new Elysia({
	prefix: "/campuscraft",
})
	.use(campusCraftAuthPlugin)
	.get(
		"/users",
		async ({ query }) => {
			const total = await db.$count(serverWhitelists);
			const users = await db.query.serverWhitelists.findMany({
				where: eq(serverWhitelists.banned, false),
				orderBy: desc(serverWhitelists.created_at),
				limit: query.limit,
				offset: query.offset,
			});

			return { total, users };
		},
		{
			query: t.Object({
				limit: t.Integer({
					description: "Limit how many users are returned",
					minimum: 1,
					maximum: 100,
					default: 25,
				}),
				offset: t.Integer({
					description: "Offset the users being returned",
					minimum: 0,
					default: 0,
				}),
			}),
			response: {
				200: t.Object({
					total: t.Number({ description: "Total number of users" }),
					users: t.Array(userObject, { description: "All users" }),
				}),
			},
			detail: {
				description: "Get users (for CampusCraft)",
			},
			tags: ["CampusCraft"],
		},
	)
	.get(
		"/users/:id",
		async ({ params, set }) => {
			const isIdUuid = Regex.Uuid.test(params.id);
			const user = await db.query.serverWhitelists.findFirst({
				where: and(
					eq(serverWhitelists.banned, false),
					or(
						...(isIdUuid ? [eq(serverWhitelists.id, params.id)] : []),
						eq(serverWhitelists.email, params.id),
						...(isIdUuid ? [eq(serverWhitelists.uuid, params.id)] : []),
						eq(serverWhitelists.discord_id, params.id),
					),
				),
			});

			if (!user) {
				set.status = 404;
				return { error: "not_found" };
			}

			const relations = await db.query.serverWhitelists.findMany({
				where: and(
					eq(serverWhitelists.banned, false),
					user.parent_id
						? and(
								ne(serverWhitelists.id, user.id),
								or(
									eq(serverWhitelists.id, user.parent_id),
									eq(serverWhitelists.parent_id, user.parent_id),
								),
							)
						: eq(serverWhitelists.parent_id, user.id),
				),
				orderBy: desc(serverWhitelists.created_at),
			});

			return { user, relations };
		},
		{
			params: t.Object({
				id: t.String({
					description: "Internal ID, email, Minecraft UUID or Discord user ID",
				}),
			}),
			response: {
				200: t.Object({
					user: userObject,
					relations: t.Array(userObject, { description: "List of relations" }),
				}),
				404: t.Object({ error: t.Literal("not_found") }),
			},
			detail: { description: "Get a whitelisted player" },
			tags: ["CampusCraft"],
		},
	);
