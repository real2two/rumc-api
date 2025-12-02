import { Routes } from "@buape/carbon";
import { env } from "elysia";
import { client } from "~/discord";

/**
 * Grant the user the verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export function grantDiscordVerifiedRole(id: string) {
	return client.rest.put(
		Routes.guildMemberRole(
			env.DISCORD_GUILD_ID,
			id,
			env.DISCORD_VERIFIED_ROLE_ID,
		),
	);
}

/**
 * Revoke the user's verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export function revokeDiscordVerifiedRole(id: string) {
	return client.rest.delete(
		Routes.guildMemberRole(
			env.DISCORD_GUILD_ID,
			id,
			env.DISCORD_VERIFIED_ROLE_ID,
		),
	);
}
