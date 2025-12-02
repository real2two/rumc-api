import Elysia from "elysia";

import { authPlugin } from "~/plugins/auth";

import { campusCraftRoutes } from "./campusCraft";
import { discordRoutes } from "./discord";
import { whitelistsRoute } from "./whitelists";

export const apiRoute = new Elysia({ prefix: "/api" })
	// Other routes
	.use(discordRoutes)
	.use(campusCraftRoutes)

	// Authenticated endpoints
	.use(authPlugin)
	.use(whitelistsRoute);
