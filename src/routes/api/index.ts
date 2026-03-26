import Elysia from "elysia";

import { discordRoutes } from "./discord";
import { serversRoutes } from "./servers";
import { usersRoute } from "./users";
import { whitelistsRoute } from "./whitelists";

export const apiRoute = new Elysia({ prefix: "/api" })
	.use(discordRoutes)
	.use(whitelistsRoute)
	.use(usersRoute)
	.use(serversRoutes);
