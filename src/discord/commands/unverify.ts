import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
	Permission,
} from "@buape/carbon";
import { DISCORD_ADMIN_IDS } from "~/utils/admin";
import { getMinecraftPlayer } from "~/utils/minecraft";
import { deleteWhitelist } from "~/utils/whitelist";

class UnverifyDiscordCommand extends Command {
	name = "discord";
	override description = "Unverify using Discord user";
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

		const { error, user: whitelisted } = await deleteWhitelist(user.id);
		if (error) {
			return interaction.reply({
				content: "❌ Failed to find user",
				ephemeral: true,
			});
		}

		if (!whitelisted.uuid) {
			return interaction.reply({
				content: `🗑️ Unverified <@${user.id}>`,
				allowedMentions: {},
				ephemeral: true,
			});
		}

		const player = await getMinecraftPlayer(whitelisted.uuid);
		return interaction.reply({
			content:
				`🗑️ Unverified <@${user.id}> / \`${player?.username}\` (\`${player?.id}\`)` +
				"**Warning**: This doesn't kick the player out of the Minecraft server if they're in the server currently.",
			allowedMentions: {},
			ephemeral: true,
		});
	}
}

export class UnverifyCommand extends CommandWithSubcommands {
	name = "unverify";
	override description = "Unverify a user";
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [new UnverifyDiscordCommand()];
}
