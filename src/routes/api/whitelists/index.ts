import Elysia, { t } from "elysia";
import { auth } from "~/plugins/auth";
import { AuthRole } from "~/types/auth";
import { ErrorCodes } from "~/types/errors";
import { getWhitelistPartialUsingMinecraftUuid } from "~/utils/whitelist";

export const whitelistsRoute = new Elysia({
	prefix: "/whitelists",
	tags: ["Whitelists"],
})
	.use(auth([AuthRole.Admin, AuthRole.Server, AuthRole.Read]))
	.get(
		"/whitelisted",
		async ({ query, set }) => {
			const { error, user } = await getWhitelistPartialUsingMinecraftUuid(
				query.uuid,
			);
			if (error) {
				set.status = error.status;
				return { error: error.code };
			}
			return user;
		},
		{
			detail: { summary: "Check if Minecraft user is whitelisted" },
			query: t.Object({ uuid: t.String({ format: "uuid" }) }),
			response: {
				200: t.Object({
					banned: t.Boolean(),
					ban_reason: t.Union([t.String(), t.Null()]),
				}),
				404: t.Object({ error: t.Literal(ErrorCodes.NotFound) }),
			},
		},
	);
