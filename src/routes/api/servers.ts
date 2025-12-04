import Elysia, { env, t } from "elysia";
import { ErrorCodes } from "~/types/errors";
import { getServerCache, setServerCache } from "~/utils/redis";

export const serversRoutes = new Elysia({
	prefix: "/servers",
}).get(
	"/survival",
	async ({ set }) => {
		try {
			// Get cached server
			const cachedServer = await getServerCache("survival");
			if (cachedServer) return cachedServer;

			// If not cached, fetch server
			const res = await fetch(`https://api.mcsrvstat.us/3/${env.MINECRAFT_IP}`);
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
			await setServerCache("survival", server);

			// Send response
			return server;
		} catch (err) {
			console.error("Error fetching player count:", err);

			set.status = 500;
			return { error: ErrorCodes.InternalServerError };
		}
	},
	{
		response: {
			200: t.Object({ online: t.Boolean(), players: t.Number() }),
			500: t.Object({ error: t.Literal(ErrorCodes.InternalServerError) }),
		},
		detail: { description: "Handle Discord interaction" },
		tags: ["Servers"],
	},
);
