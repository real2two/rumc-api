import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
} from "@buape/carbon";
import { getMinecraftPlayer } from "~/utils/minecraft";
import { getWhitelist } from "~/utils/whitelist";

class WhoIsDiscordCommand extends Command {
	name = "discord";
	override description = "Get a Minecraft username using a Discord account";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The Discord account",
			required: true,
		},
	];

	async run(interaction: CommandInteraction) {
		const user = interaction.options.getUser("user");
		if (!user) return;

		const { user: whitelisted } = await getWhitelist(user.id);
		if (!whitelisted) {
			return interaction.reply({
				content: "❌ Cannot find user with provided Discord account.",
				ephemeral: true,
			});
		}
		if (!whitelisted.uuid) {
			return interaction.reply({
				content:
					"❌ The following user doesn't have a Minecraft account linked.",
				ephemeral: true,
			});
		}

		const player = await getMinecraftPlayer(whitelisted.uuid);
		if (!player) {
			return interaction.reply({
				content: `🛑 Failed to find player with the UUID \`${whitelisted.uuid}\`.`,
				allowedMentions: {},
			});
		}

		const infoText = `<@${user.id}> is \`${player.username}\``;

		let footerText = "Verified as a Rutgers student 🎉";
		if (whitelisted.parent_id) {
			footerText = "Invited by an unknown user.";

			const { user: parent } = await getWhitelist(whitelisted.parent_id);
			if (parent) {
				const parentPlayer = parent.uuid
					? await getMinecraftPlayer(parent.uuid)
					: null;
				footerText = parent.discord_id
					? `Invited by <@${parent.discord_id}>${parent.uuid ? ` / \`${parentPlayer?.username || parent.uuid}\`` : ""} 👽`
					: `Invited by \`${parentPlayer?.username}\` 👽`;
			}
		}

		return interaction.reply({
			content: `ℹ️ ${infoText}.\n-# > ${footerText}`,
			allowedMentions: {},
		});
	}
}

class WhoIsMinecraftCommand extends Command {
	name = "minecraft";
	override description = "Get a Discord account using a Minecraft username";
	override options = [
		{
			name: "minecraft",
			type: ApplicationCommandOptionType.String as const,
			description: "The Minecraft username",
			required: true,
		},
	];

	async run(interaction: CommandInteraction) {
		const minecraft = interaction.options.getString("minecraft")?.trim();
		if (!minecraft) return;

		const player = await getMinecraftPlayer(minecraft);
		if (!player) {
			return interaction.reply({
				content:
					"❌ Failed to find player with the provided Minecraft username.",
				ephemeral: true,
			});
		}

		const { user: whitelisted } = await getWhitelist(player.id);
		if (!whitelisted) {
			return interaction.reply({
				content: "❌ Cannot find user with provided Minecraft username.",
				ephemeral: true,
			});
		}

		const infoText = whitelisted.discord_id
			? `<@${whitelisted.discord_id}> is \`${player.username}\`.`
			: `\`${player.username}\` doesn't have a linked Discord account.`;

		let footerText = "Verified as a Rutgers student 🎉";
		if (whitelisted.parent_id) {
			footerText = "Invited by an unknown user.";

			const { user: parent } = await getWhitelist(whitelisted.parent_id);
			if (parent) {
				const parentPlayer = parent.uuid
					? await getMinecraftPlayer(parent.uuid)
					: null;
				footerText = parent.discord_id
					? `Invited by <@${parent.discord_id}>${parent.uuid ? ` / \`${parentPlayer?.username || parent.uuid}\`` : ""} 👽`
					: `Invited by \`${parentPlayer?.username}\` 👽`;
			}
		}

		return interaction.reply({
			content: `ℹ️ ${infoText}\n-# > ${footerText}`,
			allowedMentions: {},
		});
	}
}

export class WhoIsCommand extends CommandWithSubcommands {
	name = "whois";
	override description = "Check who someone is on the server";
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [new WhoIsDiscordCommand(), new WhoIsMinecraftCommand()];
}
