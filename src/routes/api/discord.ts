import Elysia, { t } from "elysia";
import { client } from "~/discord";
import { authPlugin } from "~/plugins/auth";

export const discordRoutes = new Elysia({
	prefix: "/discord",
})
	// Interactions route
	.post(
		"/interactions",
		({ request }) => client.handleInteractionsRequest(request, {}),
		{
			response: {
				204: t.Literal("No Content"),
			},
			detail: { description: "Handle Discord interaction" },
			tags: ["Discord"],
		},
	)
	// Authenticated routes (using env.TOKEN)
	.use(authPlugin)
	.post("/deploy", () => client.handleDeployRequest(), {
		response: {
			202: t.Union([t.Literal("OK"), t.Literal("OK (devGuilds)")]),
			500: t.Literal("Internal Server Error"),
		},
		detail: { description: "Deploy Discord commands" },
		tags: ["Discord"],
	});
