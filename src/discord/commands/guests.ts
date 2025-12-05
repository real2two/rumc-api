import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
} from "@buape/carbon";
import { ErrorCodes } from "~/types/errors";
import { getMinecraftPlayer } from "~/utils/minecraft";
import {
	addWhitelist,
	getWhitelist,
	getWhitelistRelations,
} from "~/utils/whitelist";

export class GuestListCommand extends Command {
	name = "list";
	override description = "List all guests you invited";

	async run(interaction: CommandInteraction) {
		if (!interaction.userId) return;

		// Get user
		const { user } = await getWhitelist(interaction.userId);
		if (!user || user.parent_id) {
			return interaction.reply({
				content: "❌ You cannot run this command.",
				ephemeral: true,
			});
		}

		// Get guests
		const { relations } = await getWhitelistRelations(user);
		if (!relations.length) {
			return interaction.reply({
				content: "### Invited guests\nYou haven't invited any guests. 🥀",
				ephemeral: true,
			});
		}

		// Parse guests
		const bodyText: string[] = [];
		for (const relation of relations) {
			const usernameOrUuid = relation.uuid
				? (await getMinecraftPlayer(relation.uuid))?.username || relation.uuid
				: null;
			bodyText.push(
				relation.discord_id
					? `- <@${relation.discord_id}>${usernameOrUuid ? ` / \`${usernameOrUuid}\`` : ""}`
					: `- ${usernameOrUuid ? `\`${usernameOrUuid}\`` : "Unknown user"}`,
			);
		}

		// Respond to interaction
		await interaction.reply({
			content: `### Invited guests\n${bodyText.join("\n")}`,
			ephemeral: true,
		});
	}
}

export class GuestAddCommand extends Command {
	name = "add";
	override description = "Invite a guest into the server";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The Discord account to invite",
			required: true,
		},
		{
			name: "minecraft",
			type: ApplicationCommandOptionType.String as const,
			description: "The Minecraft username",
			required: true,
		},
	];

	async run(interaction: CommandInteraction) {
		if (!interaction.userId) return;

		// Options
		const guestUser = interaction.options.getUser("user");
		const guestMinecraft = interaction.options.getString("minecraft")?.trim();
		if (!guestUser || !guestMinecraft) return;

		// Get user
		const { user } = await getWhitelist(interaction.userId);
		if (!user || user.parent_id) {
			return interaction.reply({
				content: "❌ You cannot run this command.",
				ephemeral: true,
			});
		}

		// Cannot be bot
		if (guestUser.bot) {
			return interaction.reply({
				content: "❌ Cannot invite a bot as a guest.",
				ephemeral: true,
			});
		}

		// Guest must be in the server
		if (!interaction.options.resolved.members?.[guestUser.id]) {
			return interaction.reply({
				content: "❌ This member is not in the server.",
				ephemeral: true,
			});
		}

		// Get Minecraft user
		const player = await getMinecraftPlayer(guestMinecraft);
		if (!player) {
			return interaction.reply({
				content:
					"❌ Failed to find player with the provided Minecraft username.",
				ephemeral: true,
			});
		}

		// Whitelist guest
		const { error } = await addWhitelist({
			email: null,
			parent_id: user.id,
			uuid: player.id,
			discord_id: guestUser.id,
		});
		if (error) {
			switch (error.code) {
				case ErrorCodes.ParentReachedGuestLimit:
					return interaction.reply({
						content: "❌ You've reached the maximum guests limit (10).",
						ephemeral: true,
					});
				case ErrorCodes.DiscordIdUsed:
					return interaction.reply({
						content: "❌ The provided Discord member is already verified.",
						ephemeral: true,
					});
				case ErrorCodes.MinecraftUuidUsed:
					return interaction.reply({
						content: "❌ The provided Minecraft username is already used.",
						ephemeral: true,
					});
				case ErrorCodes.InternalServerError:
					return interaction.reply({
						content:
							"🛑 An unexpected error occurred when trying to add the guest. Please try again.",
						ephemeral: true,
					});
			}
			return;
		}

		// Respond to interaction
		await interaction.reply({
			content: `✅ Verified <@${guestUser.id}> as \`${player.username}\`!`,
			ephemeral: true,
		});
	}
}

export class GuestCommand extends CommandWithSubcommands {
	name = "guest";
	override description = "Manage guests";
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [new GuestListCommand(), new GuestAddCommand()];
}
