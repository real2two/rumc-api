import { Routes } from "@buape/carbon";
import { env } from "elysia";
import { client } from "~/discord";

/**
 * Grant the user the verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export async function grantDiscordVerifiedRole(id: string) {
	try {
		await client.rest.put(
			Routes.guildMemberRole(
				env.DISCORD_GUILD_ID,
				id,
				env.DISCORD_VERIFIED_ROLE_ID,
			),
		);
	} catch (err) {
		console.error("Failed to grant Discord role:", err);
	}
}

/**
 * Revoke the user's verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export async function revokeDiscordVerifiedRole(id: string) {
	try {
		await client.rest.delete(
			Routes.guildMemberRole(
				env.DISCORD_GUILD_ID,
				id,
				env.DISCORD_VERIFIED_ROLE_ID,
			),
		);
	} catch (err) {
		console.error("Failed to revoke Discord role:", err);
	}
}
