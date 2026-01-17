import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	InteractionContextType,
	Permission,
} from "@buape/carbon";
import { ErrorCodes } from "~/types/errors";
import { DISCORD_ADMIN_IDS } from "~/utils/admin";
import { getMinecraftPlayer } from "~/utils/minecraft";
import { updateWhitelist } from "~/utils/whitelist";

export class WbanDiscordCommand extends Command {
	name = "wban";
	override description = "Ban player using Discord user";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The Discord account",
			required: true,
		},
	];
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	async run(interaction: CommandInteraction) {
		if (
			!interaction.userId ||
			!DISCORD_ADMIN_IDS.includes(interaction.userId)
		) {
			return interaction.reply({
				content: "🛑 You don't have permission to use this command",
				ephemeral: true,
			});
		}

		const user = interaction.options.getUser("user");
		if (!user) return;

		const { error, user: whitelisted } = await updateWhitelist(user.id, {
			banned: true,
		});
		if (error) {
			switch (error.code) {
				case ErrorCodes.NotFound:
					return interaction.reply({
						content: "❌ Failed to find user",
						ephemeral: true,
					});
				default:
					return interaction.reply({
						content: "🛑 An unexpected error has occurred",
						ephemeral: true,
					});
			}
		}

		const text: string[] = [];
		if (!whitelisted.uuid) {
			text.push(`🗑️ Banned <@${user.id}>`);
		} else {
			const player = await getMinecraftPlayer(whitelisted.uuid);
			text.push(
				`🗑️ Banned <@${user.id}> / \`${player?.username}\` (\`${player?.id}\`)`,
				"-# **Warning**: This doesn't kick the player out of the Minecraft server if they're in the server currently.",
			);
		}

		return interaction.reply({
			content: text.join("\n"),
			allowedMentions: {},
			ephemeral: true,
		});
	}
}
