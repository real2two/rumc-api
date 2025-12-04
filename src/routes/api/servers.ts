import Elysia, { env, t } from "elysia";
import { ErrorCodes } from "~/types/errors";

export const serversRoutes = new Elysia({
	prefix: "/servers",
}).get(
	"/survival",
	async ({ set }) => {
		try {
			const res = await fetch(`https://api.mcsrvstat.us/3/${env.MINECRAFT_IP}`);
			if (!res.ok) throw new Error("Failed to fetch server");

			const data = (await res.json()) as {
				online: boolean;
				players?: { online: number };
			};

			if (!data.online) return { online: false, players: 0 };
			return { online: true, players: data.players?.online || 0 };
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
		tags: ["Discord"],
	},
);
