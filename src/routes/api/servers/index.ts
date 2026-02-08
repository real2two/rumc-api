import Elysia, { t } from "elysia";
import { SERVER_ADDRESSES } from "~/config/servers";
import { ErrorCodes } from "~/types/errors";
import { getServerCache, setServerCache } from "~/utils/redis";

export const serversRoutes = new Elysia({
	prefix: "/servers",
	tags: ["Servers"],
})
	// Get server
	.get(
		"/:id",
		async ({ params, set }) => {
			try {
				// Get server address based on the ID
				const serverAddress = SERVER_ADDRESSES[params.id];

				// Get cached server
				const cachedServer = await getServerCache(params.id);
				if (cachedServer) return cachedServer;

				// If not cached, fetch server
				const res = await fetch(
					`https://api.mcstatus.io/v2/status/java/${serverAddress}`,
				);
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
				await setServerCache(
					params.id,
					server,
					Number.parseInt(
						res.headers.get("X-Cache-Time-Remaining") || "60",
						10,
					),
				);

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
				security: [],
			},
			params: t.Object({
				id: t.UnionEnum(
					Object.keys(SERVER_ADDRESSES) as [
						keyof typeof SERVER_ADDRESSES,
						...Array<keyof typeof SERVER_ADDRESSES>,
					],
				),
			}),
			response: {
				200: t.Object({ online: t.Boolean(), players: t.Number() }),
				500: t.Object({ error: t.Literal(ErrorCodes.InternalServerError) }),
			},
		},
	);
