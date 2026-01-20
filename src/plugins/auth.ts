import { env } from "bun";
import { Elysia, t } from "elysia";

const allowedTokens = [env.TOKEN, env.TOKEN_READONLY, env.TOKEN_CAMPUSCRAFT];

export const authPlugin = new Elysia({ name: "auth" })
	.guard({
		as: "local",
		response: {
			401: t.Literal("Unauthorized"),
			403: t.Literal("Forbidden"),
		},
		beforeHandle({ headers, set }) {
			if (headers.authorization !== env.TOKEN) {
				if (
					headers.authorization &&
					allowedTokens.includes(headers.authorization)
				) {
					set.status = 403;
					return "Forbidden";
				}

				set.status = 401;
				return "Unauthorized";
			}
		},
	})
	.as("scoped");

export const authReadWhitelistsPlugin = new Elysia({
	name: "auth-read-whitelists",
})
	.guard({
		as: "local",
		response: { 401: t.Literal("Unauthorized") },
		beforeHandle({ headers, set }) {
			if (
				!headers.authorization ||
				!allowedTokens.includes(headers.authorization)
			) {
				set.status = 401;
				return "Unauthorized";
			}
		},
	})
	.as("scoped");
