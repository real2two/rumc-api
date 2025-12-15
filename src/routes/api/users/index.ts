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
		detail: {
			summary: "List users",
			description:
				'- To filter only Rutgers students, check if the email ends with "@scarletmail.rutgers.edu"\n' +
				"- If parent_id is not null, the user is a guest",
		},
		query: t.Object({
			limit: t.Integer({ minimum: 1, maximum: 1000, default: 100 }),
			offset: t.Integer({ minimum: 0, default: 0 }),
		}),
		response: {
			200: t.Object({
				current: t.Number(),
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
			detail: { summary: "Get user" },
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
			detail: { summary: "Create user", description: "Whitelist a player" },
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
				summary: "Update user",
				description:
					"- Banned players won't be banned off the Discord server (intended behavior, so they can make tickets and still talk on Discord)\n" +
					"- Banning a player will revoke their access from being able to join the Minecraft server, but won't be kicked off the server if they're already on the server (so make sure to use Minecraft commands to ban as well)",
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
				summary: "Delete user",
				description:
					"- Deleted players will lose access the verified role\n" +
					"- Deleting a player will revoke their access from being able to join the Minecraft server, but won't be kicked off the server if they're already on the server (so make sure to use Minecraft commands to kick as well)",
			},
			params: t.Object({ id: t.String() }),
			response: {
				204: t.Literal("No Content"),
				404: t.Object({
					error: t.Union([
						t.Literal(ErrorCodes.NotFound),
						t.Literal(ErrorCodes.CannotDeleteBannedUser),
					]),
				}),
			},
		},
	);
