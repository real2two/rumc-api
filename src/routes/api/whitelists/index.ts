import Elysia, { t } from "elysia";
import { auth } from "~/plugins/auth";
import { AuthRole } from "~/types/auth";
import { ErrorCodes } from "~/types/errors";
import {
	getWhitelistPartialUsingMinecraftUuid,
	updateWhitelist,
} from "~/utils/whitelist";
import { WhitelistModel } from "../users/model";

export const whitelistsRoute = new Elysia({
	prefix: "/whitelists",
	tags: ["Whitelists"],
})
	.use(auth([AuthRole.Admin, AuthRole.Server]))
	.get(
		"/:minecraft_uuid",
		async ({ params, set }) => {
			const { error, user } = await getWhitelistPartialUsingMinecraftUuid(
				params.minecraft_uuid,
			);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			return user;
		},
		{
			detail: {
				summary: "Get Minecraft player",
				description:
					"Similar to `GET /users/:id`, but limited to querying with Minecraft UUID only and returns partial information.",
			},
			params: t.Object({ minecraft_uuid: t.String({ format: "uuid" }) }),
			response: {
				200: t.Object({
					banned: t.Boolean(),
					ban_reason: t.Union([t.String(), t.Null()]),
				}),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	)
	.post(
		"/:minecraft_uuid/ban",
		async ({ params, body: { reason }, set }) => {
			const { error } = await updateWhitelist(
				params.minecraft_uuid,
				{ banned: true, ban_reason: reason },
				{ minecraftUuidOnly: true },
			);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			set.status = 204;
			return "No Content";
		},
		{
			detail: {
				summary: "Ban Minecraft player",
				description:
					"Similar to `POST /users/:id/ban`, but limited to using Minecraft UUID only.",
			},
			params: t.Object({ minecraft_uuid: t.String({ format: "uuid" }) }),
			body: WhitelistModel.ban,
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	)
	.delete(
		"/:minecraft_uuid/ban",
		async ({ params, set }) => {
			const { error } = await updateWhitelist(
				params.minecraft_uuid,
				{ banned: false },
				{ minecraftUuidOnly: true },
			);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			set.status = 204;
			return "No Content";
		},
		{
			detail: {
				summary: "Unban Minecraft player",
				description:
					"Similar to `DELETE /users/:id/ban`, but limited to using Minecraft UUID only.",
			},
			params: t.Object({ minecraft_uuid: t.String({ format: "uuid" }) }),
			response: {
				204: t.Literal("No Content"),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	);
