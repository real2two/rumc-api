import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
	Permission,
} from "@buape/carbon";
import { ErrorCodes } from "~/types/errors";
import { DISCORD_ADMIN_IDS } from "~/utils/admin";
import { getMinecraftPlayer } from "~/utils/minecraft";
import { updateWhitelist } from "~/utils/whitelist";

class WbanDiscordCommand extends Command {
	name = "discord";
	override description = "Ban player using Discord user";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The Discord account",
			required: true,
		},
		{
			name: "reason",
			type: ApplicationCommandOptionType.String as const,
			description: "The ban reason",
			required: false,
		},
	];

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

		const banReason = interaction.options.getString("reason");

		const { error, user: whitelisted } = await updateWhitelist(user.id, {
			banned: true,
			ban_reason: banReason,
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

export class WbanCommand extends CommandWithSubcommands {
	name = "wban";
	override description = "Ban user";
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [new WbanDiscordCommand()];
}
