import { env } from "bun";
import { Elysia, t } from "elysia";
import { AuthRole } from "~/types/auth";

const roles = {
	[env.TOKEN]: AuthRole.Admin,
	[env.TOKEN_SERVER]: AuthRole.Server,
	[env.TOKEN_CAMPUSCRAFT]: AuthRole.Read,
} as const;

export const auth = (allowedRoles: AuthRole[]) =>
	new Elysia({ name: "auth", seed: [...allowedRoles].sort().join(",") })
		.guard({
			as: "local",
			response: {
				401: t.Literal("Unauthorized"),
				403: t.Literal("Forbidden"),
			},
			beforeHandle({ headers, status }) {
				if (!headers.authorization) return status(401, "Unauthorized");

				const role = roles[headers.authorization];
				if (!role) return status(401, "Unauthorized");
				if (!allowedRoles.includes(role)) return status(403, "Forbidden");
			},
		})
		.as("scoped");
