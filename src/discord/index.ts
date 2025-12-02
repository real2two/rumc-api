import { Client } from "@buape/carbon";
import { env } from "elysia";

import { GuestCommand } from "./commands/guests";
import { CreateVerifyModalCommand } from "./commands/verify";
import { WhoIsCommand } from "./commands/whois";

export const client = new Client(
	{
		baseUrl: env.BASE_URL,
		clientId: env.DISCORD_CLIENT_ID,
		publicKey: env.DISCORD_PUBLIC_KEY,
		token: env.DISCORD_TOKEN,
		disableDeployRoute: true,
	},
	{
		commands: [
			new GuestCommand(),
			new CreateVerifyModalCommand(),
			new WhoIsCommand(),
		],
	},
);
