import Elysia, { t } from "elysia";
import { authPlugin, authReadWhitelistsPlugin } from "~/plugins/auth";
import { ErrorCodes } from "~/types/errors";
import {
	addWhitelist,
	deleteWhitelist,
	getWhitelist,
	getWhitelistRelations,
	listWhitelists,
	updateWhitelist,
} from "~/utils/whitelist";
import { WhitelistModel } from "./model";

export const usersRoute = new Elysia({
	prefix: "/users",
	tags: ["Whitelists"],
})
	// Read-only whitelists authenticated routes (allows env.TOKEN and CampusCraft)
	.use(authReadWhitelistsPlugin)
	.get("", ({ query }) => listWhitelists(query), {
		detail: { description: "List users" },
		query: t.Object({
			limit: t.Integer({ minimum: 1, maximum: 1000, default: 100 }),
			offset: t.Integer({ minimum: 0, default: 0 }),
		}),
		response: {
			200: t.Object({
				total: t.Number(),
				users: t.Array(WhitelistModel.get),
			}),
		},
	})
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
			detail: { description: "Get user" },
			params: t.Object({ id: t.String() }),
			response: {
				200: t.Object({
					user: WhitelistModel.get,
					relations: t.Array(WhitelistModel.get),
				}),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	)
	// Authenticated routes (using env.TOKEN)
	.use(authPlugin)
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
			detail: { description: "Whitelist a player" },
			body: WhitelistModel.create,
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
				500: t.Object({ error: t.Literal(ErrorCodes.InternalServerError) }),
			},
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
			detail: {
				description:
					"Update user (keep in mind: if the player is banned, they won't be kicked off the server)",
			},
			params: t.Object({ id: t.String() }),
			body: WhitelistModel.update,
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
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
			detail: {
				description:
					"Delete user (keep in mind: if the player is in the server, they won't be kicked off)",
			},
			params: t.Object({ id: t.String() }),
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	);
