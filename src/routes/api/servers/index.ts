import Elysia, { env, t } from "elysia";
import { ErrorCodes } from "~/types/errors";
import { getServerCache, setServerCache } from "~/utils/redis";

const SERVER_ADDRESSES = {
	survival: env.MINECRAFT_SURVIVAL_IP,
	limbo: env.MINECRAFT_LIMBO_IP,
} as const;

export const serversRoutes = new Elysia({
	prefix: "/servers",
	tags: ["Servers"],
}).get(
	"/:id",
	async ({ params, set }) => {
		try {
			// Get server address based on the ID
			const serverAddress = SERVER_ADDRESSES[params.id];

			// Get cached server
			const cachedServer = await getServerCache(params.id);
			if (cachedServer) return cachedServer;

			// If not cached, fetch server
			const res = await fetch(`https://api.mcsrvstat.us/3/${serverAddress}`);
			if (!res.ok) throw new Error("Failed to fetch server");

			// Get response
			const data = (await res.json()) as {
				online: boolean;
				players?: { online?: number };
			};

			// Cache server data
			const server = {
				online: data.online,
				players: data.players?.online || 0,
			};
			await setServerCache(params.id, server);

			// Send response
			return server;
		} catch (err) {
			console.error("Error fetching player count:", err);

			set.status = 500;
			return { error: ErrorCodes.InternalServerError };
		}
	},
	{
		detail: {
			summary: "Get server status",
			description: "Get online status and player count (cached)",
		},
		params: t.Object({
			id: t.Union([t.Literal("survival"), t.Literal("limbo")]),
		}),
		response: {
			200: t.Object({ online: t.Boolean(), players: t.Number() }),
			500: t.Object({ error: t.Literal(ErrorCodes.InternalServerError) }),
		},
	},
);
