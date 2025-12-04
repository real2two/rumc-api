import Elysia, { t } from "elysia";
import { campusCraftAuthPlugin } from "~/plugins/campusCraft";
import { ErrorCodes } from "~/types/errors";
import {
	getWhitelist,
	getWhitelistRelations,
	listWhitelists,
} from "~/utils/whitelist";

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
		banned: t.Boolean({
			description: "Whether or not the player is banned on the server",
		}),
	},
	{ description: "A user object" },
);

export const campusCraftRoutes = new Elysia({
	prefix: "/campuscraft",
})
	.use(campusCraftAuthPlugin)
	.get("/users", ({ query }) => listWhitelists(query), {
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
		detail: { description: "List users (CampusCraft)" },
		tags: ["CampusCraft"],
	})
	.get(
		"/users/:id",
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
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
			detail: { description: "Get user (CampusCraft)" },
			tags: ["CampusCraft"],
		},
	);
