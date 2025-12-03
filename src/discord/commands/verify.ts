import {
	ApplicationIntegrationType,
	Button,
	type ButtonInteraction,
	ButtonStyle,
	Command,
	type CommandInteraction,
	InteractionContextType,
	Label,
	Modal,
	type ModalInteraction,
	Permission,
	Row,
	TextInput,
	TextInputStyle,
} from "@buape/carbon";
import { redis } from "bun";
import { eq } from "drizzle-orm";
import { env } from "elysia";
import { db } from "~/db";
import { serverWhitelists } from "~/db/schema";
import { grantDiscordVerifiedRole } from "~/discord/utils";
import { createCode } from "~/utils/crypto";
import { transporter } from "~/utils/mail";
import { getMinecraftPlayer } from "~/utils/minecraft";
import { Regex } from "~/utils/regex";

export interface VerificationCodeDiscord {
	attempts: number;
	code: string;
	email: string;
	uuid: string;
}

export class VerifyModalCodeModal extends Modal {
	title = "Enter the verification code";
	customId = "verify-modal-code";
	override components = [new VerifyModalCodeCodeLabel()];

	async run(interaction: ModalInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const exists = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.discord_id, interaction.userId),
		);
		if (exists) {
			return interaction.update({
				content: "❌ You are already verified!",
				components: [],
			});
		}

		// Get verification code
		const verificationCode = await getVerificationCode(interaction.userId);
		if (!verificationCode) {
			return interaction.update({
				content:
					"❌ Your verification code has expired. Please try again from the beginning.",
				components: [],
			});
		}

		// Check if code is right
		const code = interaction.fields.getText("code");
		if (verificationCode.code !== code) {
			if (++verificationCode.attempts >= 3) {
				await deleteVerificationCode(interaction.userId);

				return interaction.update({
					content:
						"🗑️ Incorrect code! You have failed entering the code too many times.",
					components: [],
				});
			}

			return interaction.update({
				content: "❌ Incorrect code! Please try again.",
			});
		}

		// Verify the user
		await deleteVerificationCode(interaction.userId);

		try {
			await db.insert(serverWhitelists).values({
				email: verificationCode.email,
				parent_id: null,
				uuid: verificationCode.uuid,
				discord_id: interaction.userId,
			});
		} catch (err) {
			console.error(err);
			return interaction.update({
				content:
					"🛑 An unexpected error occurred when trying to verify. Please try again from the beginning.",
				components: [],
			});
		}

		// Grant user verified role
		await grantDiscordVerifiedRole(interaction.userId);

		// Respond to interaction
		await interaction.update({
			content: "✅ You have been verified!",
			components: [],
		});
	}
}
class VerifyModalCodeCodeLabel extends Label {
	label = "Enter your verification code";
	override description =
		"Check your spam mail if you can't find the verification code";

	constructor() {
		super(new VerifyModalCodeInputCode());
	}
}
class VerifyModalCodeInputCode extends TextInput {
	customId = "code";
	override style = TextInputStyle.Short;
	override placeholder = "abc123";
	override required = true;
}

class VerifyModalCodeButton extends Button {
	customId = "verify-modal-code";
	label = "Enter code";
	override style = ButtonStyle.Primary;
	override async run(interaction: ButtonInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const exists = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.discord_id, interaction.userId),
		);
		if (exists) {
			return interaction.update({
				content: "❌ You are already verified!",
				components: [],
				ephemeral: true,
			});
		}

		// Show modal
		return interaction.showModal(new VerifyModalCodeModal());
	}
}

export class VerifyModalInitialModal extends Modal {
	title = "Verify your ScarletMail email";
	customId = "verify-modal-initial-submit";
	override components = [
		new VerifyModalInitialEmailLabel(),
		new VerifyModalInitialUsernameLabel(),
	];

	async run(interaction: ModalInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const exists = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.discord_id, interaction.userId),
		);
		if (exists) {
			return interaction.reply({
				content: "❌ You are already verified!",
				ephemeral: true,
			});
		}

		// Validate inputs
		const email = interaction.fields.getText("email");
		const username = interaction.fields.getText("username");

		if (!email || !Regex.ScarletMail.test(email)) {
			return interaction.reply({
				content: "❌ The email address was formatted improperly.",
				ephemeral: true,
			});
		}
		if (!username || !Regex.MinecraftUsername.test(username)) {
			return interaction.reply({
				content: "❌ The Minecraft username was formatted improperly.",
				ephemeral: true,
			});
		}

		// Get Minecraft UUID
		const player = await getMinecraftPlayer(username);
		if (!player) {
			return interaction.reply({
				content: "❌ Failed to find player.",
				ephemeral: true,
			});
		}

		// Save verification code
		const code = createCode(32);
		await setVerificationCode(interaction.userId, {
			attempts: 0,
			code,
			email,
			uuid: player.id,
		});

		// Send email for verification
		await transporter.sendMail({
			from: `"RUMC Verification" <${env.SMTP_USER}>`,
			to: email,
			subject: "Verification code for RUMC",
			text: `The verification code is: ${code}`,
		});

		return interaction.reply({
			content: `📨 Check your email (\`${email}\`) and enter the verification code:`,
			components: [new Row([new VerifyModalCodeButton()])],
			ephemeral: true,
		});
	}
}
export class VerifyModalMinecraftModal extends Modal {
	title = "Link your Minecraft account";
	customId = "verify-modal-minecraft";
	override components = [new VerifyModalInitialUsernameLabel()];

	async run(interaction: ModalInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const existsUser = await db.query.serverWhitelists.findFirst({
			columns: { uuid: true },
			where: eq(serverWhitelists.discord_id, interaction.userId),
		});
		if (!existsUser) {
			return interaction.reply({
				content:
					"🛑 An unexpected error has occurred. Please try again from the beginning.",
				ephemeral: true,
			});
		}
		if (existsUser.uuid) {
			return interaction.reply({
				content: "❌ Your Minecraft account is already verified!",
				ephemeral: true,
			});
		}

		// Get Minecraft UUID
		const username = interaction.fields.getText("username");
		if (!username || !Regex.MinecraftUsername.test(username)) {
			return interaction.reply({
				content: "❌ The Minecraft username was formatted improperly.",
				ephemeral: true,
			});
		}

		// Get Minecraft UUID
		const player = await getMinecraftPlayer(username);
		if (!player) {
			return interaction.reply({
				content: "❌ Failed to find player.",
				ephemeral: true,
			});
		}

		// Update UUID
		try {
			await db.update(serverWhitelists).set({ uuid: player.id });
		} catch (err) {
			console.error(err);
			return interaction.reply({
				content:
					"🛑 An unexpected error occurred when trying to link your Minecraft account. Please try again from the beginning.",
				ephemeral: true,
			});
		}

		// Grant user verified role if the user doesn't already have it
		if (
			!interaction.member?.roles.find(
				(r) => r.id === env.DISCORD_VERIFIED_ROLE_ID,
			)
		) {
			await grantDiscordVerifiedRole(interaction.userId);
		}

		// Respond to interaction
		await interaction.reply({
			content: "✅ You have linked your Minecraft account!",
			ephemeral: true,
		});
	}
}
class VerifyModalInitialEmailLabel extends Label {
	label = "What is your ScarletMail email address?";
	override description = "https://mail.scarletmail.rutgers.edu";

	constructor() {
		super(new VerifyModalInitialInputEmail());
	}
}
class VerifyModalInitialUsernameLabel extends Label {
	label = "What is your Minecraft username?";
	override description = "Only Java edition accounts are supported currently";

	constructor() {
		super(new VerifyModalInitialInputUsername());
	}
}
class VerifyModalInitialInputEmail extends TextInput {
	customId = "email";
	override style = TextInputStyle.Short;
	override placeholder = "<netid>@scarletmail.rutgers.edu";
	override required = true;
}
class VerifyModalInitialInputUsername extends TextInput {
	customId = "username";
	override style = TextInputStyle.Short;
	override placeholder = "Herobrine";
	override required = true;
}

class VerifyModalInitialButton extends Button {
	customId = "verify-modal-initial";
	label = "Verify";
	override style = ButtonStyle.Primary;
	override async run(interaction: ButtonInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const existsUser = await db.query.serverWhitelists.findFirst({
			columns: { uuid: true },
			where: eq(serverWhitelists.discord_id, interaction.userId),
		});
		if (existsUser) {
			// Give role if the user doesn't have the role
			if (
				!interaction.member?.roles.find(
					(r) => r.id === env.DISCORD_VERIFIED_ROLE_ID,
				)
			) {
				await grantDiscordVerifiedRole(interaction.userId);
				if (existsUser.uuid) {
					return interaction.reply({
						content: `✨ Since you previously been verified into this server, you've been verified!`,
						ephemeral: true,
					});
				}
			}

			if (!existsUser.uuid) {
				// If Minecraft account isn't linked, ask to link
				return interaction.showModal(new VerifyModalMinecraftModal());
			}

			// Else error that the user is already verified
			return interaction.reply({
				content: "❌ You are already verified!",
				ephemeral: true,
			});
		}

		// Show modal
		return interaction.showModal(new VerifyModalInitialModal());
	}
}

export class CreateVerifyModalCommand extends Command {
	name = "createverifymodal";
	override description = "Create a modal for verification";
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	override components = [new VerifyModalInitialButton()];

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			content: "Click on the button below to start verification:",
			components: [new Row([new VerifyModalInitialButton()])],
		});
	}
}

export async function getVerificationCode(userId: string) {
	const value = await redis.get(`rumc:verify-discord:${userId}`);
	if (!value) return null;
	return JSON.parse(value) as VerificationCodeDiscord;
}

export function setVerificationCode(
	userId: string,
	value: VerificationCodeDiscord,
) {
	return redis.set(
		`rumc:verify-discord:${userId}`,
		JSON.stringify(value),
		"EX",
		900,
	);
}

export function deleteVerificationCode(userId: string) {
	return redis.del(`rumc:verify-discord:${userId}`);
}
