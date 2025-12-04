import Elysia from "elysia";

import { discordRoutes } from "./discord";
import { whitelistsRoute } from "./whitelists";

export const apiRoute = new Elysia({ prefix: "/api" })
	.use(discordRoutes)
	.use(whitelistsRoute);
