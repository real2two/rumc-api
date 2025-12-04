import Elysia from "elysia";

import { discordRoutes } from "./discord";
import { serversRoutes } from "./servers";
import { usersRoute } from "./users";

export const apiRoute = new Elysia({ prefix: "/api" })
	.use(discordRoutes)
	.use(usersRoute)
	.use(serversRoutes);
