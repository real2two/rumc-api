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
import { updateWhitelist } from "~/utils/whitelist";

export class WunlinkCommand extends Command {
	name = "wunlink";
	override description = "Unlink a Discord user's Minecraft account";
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

		const { error } = await updateWhitelist(user.id, {
			uuid: null,
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

		return interaction.reply({
			content: [
				`🗑️ Unlinked <@${user.id}>'s Minecraft account`,
				"-# **Warning**: This doesn't kick the player out of the Minecraft server if they're in the server currently.",
			].join("\n"),
			allowedMentions: {},
			ephemeral: true,
		});
	}
}
