import { DiscordError, Routes } from "@buape/carbon";
import { guildRoles } from "~/config/roles";
import { client } from "~/discord";

/**
 * Grant the user the verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export async function grantDiscordVerifiedRole(id: string) {
	for (const [guildId, roleId] of guildRoles) {
		try {
			await client.rest.put(Routes.guildMemberRole(guildId, id, roleId));
		} catch (err) {
			if (!(err instanceof DiscordError) || err.message !== "Unknown User") {
				console.error("Failed to grant Discord role:", err);
			}
		}
	}
}

/**
 * Revoke the user's verified role on the Discord server
 * @param id The user ID
 * @returns Whether or not the role was successfully given
 */
export async function revokeDiscordVerifiedRole(id: string) {
	for (const [guildId, roleId] of guildRoles) {
		try {
			await client.rest.delete(Routes.guildMemberRole(guildId, id, roleId));
		} catch (err) {
			if (!(err instanceof DiscordError) || err.message !== "Unknown User") {
				console.error("Failed to revoke Discord role:", err);
			}
		}
	}
}
