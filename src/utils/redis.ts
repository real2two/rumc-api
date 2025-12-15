import { redis } from "bun";

// Cache servers

export interface CachedServer {
	online: boolean;
	players: number;
}

export async function getServerCache(id: string) {
	const value = await redis.get(`rumc:cached-server:${id}`);
	if (!value) return null;
	return JSON.parse(value) as CachedServer;
}

export function setServerCache(
	id: string,
	value: CachedServer,
	expires: number,
) {
	return redis.set(
		`rumc:cached-server:${id}`,
		JSON.stringify(value),
		"EX",
		expires || 60, // 1 minute
	);
}

// Verification codes (Discord)

export interface VerificationCodeDiscord {
	attempts: number;
	code: string;
	email: string;
	uuid: string | null;
}

export async function getVerificationCodeDiscord(id: string) {
	const value = await redis.get(`rumc:verify-discord:${id}`);
	if (!value) return null;
	return JSON.parse(value) as VerificationCodeDiscord;
}

export function setVerificationCodeDiscord(
	id: string,
	value: VerificationCodeDiscord,
) {
	return redis.set(
		`rumc:verify-discord:${id}`,
		JSON.stringify({ ...value, email: value.email.toLowerCase() }),
		"EX",
		900, // 15 minutes
	);
}

export function deleteVerificationCodeDiscord(id: string) {
	return redis.del(`rumc:verify-discord:${id}`);
}
