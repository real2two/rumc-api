import { redis } from "bun";

export interface VerificationCodeDiscord {
	attempts: number;
	code: string;
	email: string;
	uuid: string | null;
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
		JSON.stringify({ ...value, email: value.email.toLowerCase() }),
		"EX",
		900, // 15 minutes
	);
}

export function deleteVerificationCode(userId: string) {
	return redis.del(`rumc:verify-discord:${userId}`);
}
