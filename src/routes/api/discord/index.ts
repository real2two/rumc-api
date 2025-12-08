import Elysia from "elysia";
import { handler } from "~/discord";

export const discordRoutes = new Elysia({
	prefix: "/discord",
	tags: ["Discord"],
})
	// Handle Carbon routes
	.all("", ({ request }) => handler(request, {}), {
		detail: { hide: true },
	});
