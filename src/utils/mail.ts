import { env } from "elysia";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: Number.parseInt(env.SMTP_PORT, 10),
	secure: env.SMTP_SECURE?.toLowerCase() === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

await transporter.verify();
