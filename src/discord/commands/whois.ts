import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
} from "@buape/carbon";
import type { serverWhitelists } from "~/db/schema";
import { DISCORD_ADMIN_IDS } from "~/utils/admin";
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
				content: `🛑 Failed to find player with the Minecraft UUID \`${whitelisted.uuid}\`.`,
				ephemeral: true,
			});
		}

		return interaction.reply({
			content: createWhoIsText({
				whitelisted,
				username: player.username,
				debug: DISCORD_ADMIN_IDS.includes(interaction.userId ?? ""),
			}),
			allowedMentions: {},
			ephemeral: true,
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

		return interaction.reply({
			content: createWhoIsText({
				whitelisted,
				username: player.username,
				debug: DISCORD_ADMIN_IDS.includes(interaction.userId ?? ""),
			}),
			allowedMentions: {},
			ephemeral: true,
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

function createWhoIsText({
	whitelisted,
	username,
	debug = false,
}: {
	whitelisted: typeof serverWhitelists.$inferSelect;
	username: string;
	debug?: boolean;
}) {
	return (
		`ℹ️ <@${whitelisted.discord_id}> is \`${username}\`.\n` +
		`-# > ${
			whitelisted.parent_id
				? "Invited by a verified player 👽"
				: whitelisted.email?.endsWith("@scarletmail.rutgers.edu")
					? "Verified as a Rutgers student 🎉"
					: "Verified as a VIP 💼"
		}` +
		`${debug ? `\n### Debug\n\`\`\`${JSON.stringify(whitelisted, null, 2)}\`\`\`` : ""}`
	);
}
