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

export class WunbanDiscordCommand extends Command {
	name = "discord";
	override description = "Unban player using Discord user";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The Discord account",
			required: true,
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

		const { error, user: whitelisted } = await updateWhitelist(user.id, {
			banned: false,
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

		let text: string;
		if (!whitelisted.uuid) {
			text = `🗑️ Unbanned <@${user.id}>`;
		} else {
			const player = await getMinecraftPlayer(whitelisted.uuid);
			text = `🗑️ Unbanned <@${user.id}> / \`${player?.username}\` (\`${player?.id}\`)`;
		}

		return interaction.reply({
			content: text,
			allowedMentions: {},
			ephemeral: true,
		});
	}
}

export class WunbanCommand extends CommandWithSubcommands {
	name = "wunban";
	override description = "Unban user";
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [new WunbanDiscordCommand()];
}
