import { Client } from "@buape/carbon";
import { createHandler } from "@buape/carbon/adapters/fetch";
import { env } from "elysia";

import { GuestCommand } from "./commands/guests";
import { UnverifyCommand } from "./commands/unverify";
import { CreateVerifyModalCommand } from "./commands/verify";
import { WbanDiscordCommand } from "./commands/wban";
import { WhoIsCommand } from "./commands/whois";
import { WunbanDiscordCommand } from "./commands/wunban";

export const client = new Client(
	{
		baseUrl: env.BASE_URL,
		clientId: env.DISCORD_CLIENT_ID,
		publicKey: env.DISCORD_PUBLIC_KEY,
		token: env.DISCORD_TOKEN,
		deploySecret: env.TOKEN,
	},
	{
		commands: [
			new WhoIsCommand(),
			new GuestCommand(),

			new CreateVerifyModalCommand(),
			new UnverifyCommand(),
			new WbanDiscordCommand(),
			new WunbanDiscordCommand(),
		],
	},
);

export const handler = createHandler(client);
