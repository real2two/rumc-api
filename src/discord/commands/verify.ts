import {
	ApplicationIntegrationType,
	Button,
	type ButtonInteraction,
	ButtonStyle,
	Command,
	type CommandInteraction,
	CommandWithSubcommands,
	InteractionContextType,
	Label,
	Modal,
	type ModalInteraction,
	Permission,
	Row,
	TextInput,
	TextInputStyle,
} from "@buape/carbon";
import { env } from "elysia";
import { grantDiscordVerifiedRole } from "~/discord/utils";
import { DISCORD_ADMIN_IDS } from "~/utils/admin";
import { createCode } from "~/utils/crypto";
import { transporter } from "~/utils/mail";
import { getMinecraftPlayer } from "~/utils/minecraft";
import {
	deleteVerificationCodeDiscord,
	getVerificationCodeDiscord,
	setVerificationCodeDiscord,
} from "~/utils/redis";
import { Regex } from "~/utils/regex";
import {
	addWhitelist,
	getWhitelist,
	isWhitelisted,
	updateWhitelist,
} from "~/utils/whitelist";

export class VerifyModalCodeModal extends Modal {
	title = "Enter the verification code";
	customId = "verify-modal-code";
	override components = [new VerifyModalCodeCodeLabel()];

	async run(interaction: ModalInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		if (await isWhitelisted(interaction.userId)) {
			return interaction.update({
				content: "❌ You are already verified!",
				components: [],
			});
		}

		// Get verification code
		const verificationCode = await getVerificationCodeDiscord(
			interaction.userId,
		);
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
				await deleteVerificationCodeDiscord(interaction.userId);
				return interaction.update({
					content:
						"🗑️ Incorrect code! You have failed entering the code too many times.",
					components: [],
				});
			}
			await setVerificationCodeDiscord(interaction.userId, verificationCode);

			return interaction.update({
				content: "❌ Incorrect code! Please try again.",
			});
		}

		// Delete verification code
		await deleteVerificationCodeDiscord(interaction.userId);

		// Verify the user
		try {
			const { error } = await addWhitelist({
				email: verificationCode.email,
				parent_id: null,
				uuid: verificationCode.uuid,
				discord_id: interaction.userId,
			});
			if (error) {
				throw new Error(`Failed to update whitelisted player (${error.code})`);
			}
		} catch (err) {
			console.error(err);
			return interaction.update({
				content:
					"🛑 An unexpected error occurred when trying to verify. Please try again from the beginning.",
				components: [],
			});
		}

		// Respond to interaction
		if (!verificationCode.uuid) {
			return interaction.update({
				content:
					"✅ You have been verified!\n-# **Warning**: Since you didn't provide a Minecraft username, you'll need to click \"Verify\" again and enter a Minecraft Java edition account to be whitelisted into the server.",
				components: [],
			});
		}

		return interaction.update({
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
		if (await isWhitelisted(interaction.userId)) {
			return interaction.update({
				content: "❌ You are already verified!",
				components: [],
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
		new VerifyModalInitialUsernameOptionalLabel(),
	];

	async run(interaction: ModalInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		if (await isWhitelisted(interaction.userId)) {
			return interaction.reply({
				content: "❌ You are already verified!",
				ephemeral: true,
			});
		}

		// Validate inputs
		const email = interaction.fields.getText("email")?.toLowerCase();
		const username = interaction.fields.getText("username");

		if (!email || !Regex.ScarletMail.test(email)) {
			return interaction.reply({
				content: "❌ The email address was formatted improperly.",
				ephemeral: true,
			});
		}

		let uuid: string | null = null;
		if (username) {
			// Validate Minecraft username
			if (!Regex.MinecraftUsername.test(username)) {
				return interaction.reply({
					content: "❌ The Minecraft username was formatted improperly.",
					ephemeral: true,
				});
			}
			// Get Minecraft UUID
			const player = await getMinecraftPlayer(username);
			if (!player) {
				return interaction.reply({
					content:
						"❌ Failed to find player with the provided Minecraft username.",
					ephemeral: true,
				});
			}
			uuid = player.id;
		}

		// Save verification code
		const code = createCode(32);
		await setVerificationCodeDiscord(interaction.userId, {
			attempts: 0,
			code,
			email,
			uuid,
		});

		// Send email for verification
		try {
			await transporter.sendMail({
				from: `"RUMC Verification" <${env.SMTP_USER}>`,
				to: email,
				subject: "Verification code for RUMC",
				text: `The verification code is: ${code}`,
			});
		} catch (err) {
			console.error("Failed to send email:", err);

			await deleteVerificationCodeDiscord(interaction.userId);
			return interaction.reply({
				content:
					"🛑 An unexpected error has occurred when sending an email (report this ASAP!)",
				ephemeral: true,
			});
		}

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
		const { user } = await getWhitelist(interaction.userId);
		if (!user) {
			return interaction.reply({
				content:
					"🛑 An unexpected error has occurred. Please try again from the beginning.",
				ephemeral: true,
			});
		}
		if (user.uuid) {
			return interaction.reply({
				content: "❌ Your Minecraft account is already verified!",
				ephemeral: true,
			});
		}

		// Validate and get Minecraft UUID
		const username = interaction.fields.getText("username");
		if (!username || !Regex.MinecraftUsername.test(username)) {
			return interaction.reply({
				content: "❌ The Minecraft username was formatted improperly.",
				ephemeral: true,
			});
		}
		const player = await getMinecraftPlayer(username);
		if (!player) {
			return interaction.reply({
				content:
					"❌ Failed to find player with the provided Minecraft username.",
				ephemeral: true,
			});
		}

		// Update UUID
		try {
			await updateWhitelist(user.id, { uuid: player.id });
		} catch (err) {
			console.error(err);
			return interaction.reply({
				content:
					"🛑 An unexpected error occurred when trying to link your Minecraft account. Please try again from the beginning.",
				ephemeral: true,
			});
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
	override description = "Enter your Minecraft Java edition username";

	constructor() {
		super(new VerifyModalInitialInputUsername({ required: true }));
	}
}
class VerifyModalInitialUsernameOptionalLabel extends Label {
	label = "What is your Minecraft username? (optional)";
	override description =
		"Enter your Minecraft Java edition username (can do later)";

	constructor() {
		super(new VerifyModalInitialInputUsername({ required: false }));
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
	override required = false;

	constructor(opts: { required: boolean }) {
		super();
		this.required = opts.required;
	}
}

class VerifyModalInitialButton extends Button {
	customId = "verify-modal-initial";
	label = "Verify";
	override style = ButtonStyle.Primary;
	override async run(interaction: ButtonInteraction) {
		if (!interaction.userId) return;

		// Check if a user is already verified
		const { user } = await getWhitelist(interaction.userId);
		if (user) {
			// Give role if the user doesn't have the role
			if (
				!interaction.member?.roles.find(
					(r) => r.id === env.DISCORD_VERIFIED_ROLE_ID,
				)
			) {
				await grantDiscordVerifiedRole(interaction.userId);
				if (user.uuid) {
					return interaction.reply({
						content: `✨ Since you previously been verified into this server, you've been verified!`,
						ephemeral: true,
					});
				}
			}

			if (!user.uuid) {
				// If Minecraft account isn't linked, ask to link
				return interaction.showModal(new VerifyModalMinecraftModal());
			}

			// Else error that the user is already verified
			const player = await getMinecraftPlayer(user.uuid);
			return interaction.reply({
				content: [
					"## Verification information",
					user.email ? `Email: \`${user.email}\`` : null,
					user.parent_id ? `Invited by: <@${user.parent_id}>` : null,
					`Username: ${player ? `\`${player.username}\`` : `Unknown (\`${user.uuid}\`)`}`,
					`Banned: ${user.banned ? "✅" : "❌"}`,
					user.ban_reason
						? `Ban reason:\n\`\`\`\n${user.ban_reason}\n\`\`\``
						: null,
				]
					.filter((c) => c)
					.join("\n"),
				allowedMentions: {},
				ephemeral: true,
			});
		}

		// Show modal
		return interaction.showModal(new VerifyModalInitialModal());
	}
}

const UNVERIFIED_MESSAGE = `## Verify your ScarletMail to join
- If you aren't a Rutgers student, you cannot join this server
- If you need help, create a ticket at <#1469791832907972638>`;

const VERIFIED_MESSAGE = `## Verify your ScarletMail to join
Having problems or made a mistake, such as entering the wrong username?
- Create a ticket in <#1437236975051473007>`;

class CreateVerifyModalUnverifiedCommand extends Command {
	name = "unverified";
	override description = "Create a modal for verification (unverified)";

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

		if (!interaction.channel || !("send" in interaction.channel)) {
			return interaction.reply({
				content: "🛑 You cannot use this command here",
				ephemeral: true,
			});
		}

		await interaction.reply({
			content: "✅ Creating message...",
			ephemeral: true,
		});

		await interaction.channel.send({
			content: UNVERIFIED_MESSAGE,
			components: [new Row([new VerifyModalInitialButton()])],
		});
	}
}

class CreateVerifyModalVerifiedCommand extends Command {
	name = "verified";
	override description = "Create a modal for verification (verified)";

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

		if (!interaction.channel || !("send" in interaction.channel)) {
			return interaction.reply({
				content: "🛑 You cannot use this command here",
				ephemeral: true,
			});
		}

		await interaction.reply({
			content: "✅ Creating message...",
			ephemeral: true,
		});

		await interaction.channel.send({
			content: VERIFIED_MESSAGE,
			components: [new Row([new VerifyModalInitialButton()])],
		});
	}
}

export class CreateVerifyModalCommand extends CommandWithSubcommands {
	name = "createverifymodal";
	override description = "Create a modal for verification";
	override permission = Permission.Administrator;
	override integrationTypes = [ApplicationIntegrationType.GuildInstall];
	override contexts = [InteractionContextType.Guild];

	override components = [new VerifyModalInitialButton()];

	subcommands = [
		new CreateVerifyModalUnverifiedCommand(),
		new CreateVerifyModalVerifiedCommand(),
	];
}
