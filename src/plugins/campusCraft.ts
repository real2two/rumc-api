import { env } from "bun";
import { Elysia, t } from "elysia";

export const campusCraftAuthPlugin = new Elysia({ name: "auth" })
	.guard({
		as: "local",
		response: { 401: t.Literal("Unauthorized") },
		beforeHandle({ headers, set }) {
			if (headers.authorization !== env.TOKEN_CAMPUSCRAFT) {
				set.status = 401;
				return "Unauthorized";
			}
		},
	})
	.as("scoped");
