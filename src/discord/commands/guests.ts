import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
} from "@buape/carbon";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "~/db";
import { serverWhitelists } from "~/db/schema";
import {
	grantDiscordVerifiedRole,
	revokeDiscordVerifiedRole,
} from "~/discord/utils";
import { getMinecraftPlayer } from "~/utils/minecraft";

export class GuestListCommand extends Command {
	name = "list";
	override description = "List all guests you invited";

	async run(interaction: CommandInteraction) {
		if (!interaction.userId) return;

		// Get user
		const whitelisted = await db.query.serverWhitelists.findFirst({
			columns: { id: true },
			where: and(
				eq(serverWhitelists.discord_id, interaction.userId),
				isNull(serverWhitelists.parent_id),
			),
		});
		if (!whitelisted) {
			return interaction.reply({
				content: "❌ You cannot run this command.",
				ephemeral: true,
			});
		}

		// Get guests
		const guests = await db.query.serverWhitelists.findMany({
			columns: { id: true, uuid: true, discord_id: true },
			where: eq(serverWhitelists.parent_id, whitelisted.id),
		});
		if (!guests.length) {
			return interaction.reply({
				content: "### Invited guests\nYou haven't invited any guests. 🥀",
			});
		}

		// Parse guests
		const guestsText: string[] = [];
		for (const guest of guests) {
			const usernameOrUuid =
				(await getMinecraftPlayer(guest.uuid))?.username || guest.uuid;
			guestsText.push(
				guest.discord_id
					? `- <@${guest.discord_id}> / ${usernameOrUuid}`
					: `- ${usernameOrUuid}`,
			);
		}

		// Respond to interaction
		await interaction.reply({
			content: `### Invited guests\n${guestsText.join("\n")}`,
			allowedMentions: {},
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
		const whitelisted = await db.query.serverWhitelists.findFirst({
			columns: { id: true },
			where: and(
				eq(serverWhitelists.discord_id, interaction.userId),
				isNull(serverWhitelists.parent_id),
			),
		});
		if (!whitelisted) {
			return interaction.reply({
				content: "❌ You cannot run this command.",
				ephemeral: true,
			});
		}

		// Set maximum guests to 10
		const count = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.parent_id, whitelisted.id),
		);
		if (count >= 10) {
			return interaction.reply({
				content: "❌ You've reached the maximum guests limit (10).",
				ephemeral: true,
			});
		}

		// If user is bot
		if (guestUser.bot) {
			return interaction.reply({
				content: "❌ Cannot invite a bot as a guest.",
				ephemeral: true,
			});
		}

		// If guest is in the server
		if (!interaction.options.resolved.members?.[guestUser.id]) {
			return interaction.reply({
				content: "❌ This member is not in the server.",
				ephemeral: true,
			});
		}

		// Check if Discord user ID is already used
		const existsGuestDiscord = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.discord_id, guestUser.id),
		);
		if (existsGuestDiscord) {
			return interaction.reply({
				content: "❌ The provided Discord member is already verified.",
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

		// Check if Minecraft UUID is already used
		const existsGuestMinecraft = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.uuid, player.id),
		);
		if (existsGuestMinecraft) {
			return interaction.reply({
				content: "❌ The provided Minecraft username is already used.",
				ephemeral: true,
			});
		}

		// Add user to database
		try {
			await db.insert(serverWhitelists).values({
				email: null,
				parent_id: whitelisted.id,
				uuid: player.id,
				discord_id: guestUser.id,
			});
		} catch (err) {
			console.error(err);
			return interaction.reply({
				content:
					"🛑 An unexpected error occurred when trying to add the guest. Please try again.",
				ephemeral: true,
			});
		}

		// Grant guest verified role
		await grantDiscordVerifiedRole(guestUser.id);

		// Respond to interaction
		await interaction.reply({
			content: `✅ Verified <@${guestUser.id}> as \`${player.username}\`!`,
			allowedMentions: {},
		});
	}
}

export class GuestRemoveCommand extends Command {
	name = "remove";
	override description = "Remove a guest from the server";
	override options = [
		{
			name: "user",
			type: ApplicationCommandOptionType.User as const,
			description: "The user to remove",
			required: true,
		},
	];

	async run(interaction: CommandInteraction) {
		if (!interaction.userId) return;

		// Options
		const guestUser = interaction.options.getUser("user");
		if (!guestUser) return;

		// Get user
		const whitelisted = await db.query.serverWhitelists.findFirst({
			columns: { id: true },
			where: and(
				eq(serverWhitelists.discord_id, interaction.userId),
				isNull(serverWhitelists.parent_id),
			),
		});
		if (!whitelisted) {
			return interaction.reply({
				content: "❌ You cannot run this command.",
				ephemeral: true,
			});
		}

		// Get guest to remove
		const whitelistedGuest = await db.query.serverWhitelists.findFirst({
			where: and(
				eq(serverWhitelists.discord_id, guestUser.id),
				eq(serverWhitelists.parent_id, whitelisted.id),
			),
		});
		if (!whitelistedGuest) {
			return interaction.reply({
				content: "❌ Cannot find guest.",
				ephemeral: true,
			});
		}

		// Remove role from guest
		if (whitelistedGuest.discord_id) {
			await revokeDiscordVerifiedRole(whitelistedGuest.discord_id);
		}

		// Remove guest
		await db
			.delete(serverWhitelists)
			.where(eq(serverWhitelists.id, whitelistedGuest.id));

		await interaction.reply({
			content: `🗑️ Removed <@${guestUser.id}> as a guest!`,
			allowedMentions: {},
		});
	}
}

export class GuestCommand extends CommandWithSubcommands {
	name = "guest";
	override description = "Manage guests";
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	subcommands = [
		new GuestListCommand(),
		new GuestAddCommand(),
		new GuestRemoveCommand(),
	];
}
