import { and, desc, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "~/db";
import { serverWhitelists } from "~/db/schema";
import {
	grantDiscordVerifiedRole,
	revokeDiscordVerifiedRole,
} from "~/discord/utils";
import { Errors } from "~/types/errors";
import { Regex } from "./regex";

export async function listWhitelists({
	limit,
	offset,
}: {
	limit?: number;
	offset?: number;
}) {
	const [total, users] = await Promise.all([
		db.$count(serverWhitelists),
		db.query.serverWhitelists.findMany({
			orderBy: desc(serverWhitelists.created_at),
			limit: limit,
			offset: offset,
		}),
	]);
	return { current: users.length, total, users };
}

export async function isWhitelisted(id: string) {
	const isIdUuid = Regex.Uuid.test(id);
	const exists = await db.$count(
		serverWhitelists,
		or(
			...(isIdUuid ? [eq(serverWhitelists.id, id)] : []),
			eq(serverWhitelists.email, id.toLowerCase()),
			...(isIdUuid ? [eq(serverWhitelists.uuid, id)] : []),
			eq(serverWhitelists.discord_id, id),
		),
	);
	return !!exists;
}

export async function getWhitelist(id: string) {
	const isIdUuid = Regex.Uuid.test(id);
	const user = await db.query.serverWhitelists.findFirst({
		where: or(
			...(isIdUuid ? [eq(serverWhitelists.id, id)] : []),
			eq(serverWhitelists.email, id.toLowerCase()),
			...(isIdUuid ? [eq(serverWhitelists.uuid, id)] : []),
			eq(serverWhitelists.discord_id, id),
		),
	});
	if (!user) return { error: Errors.NotFound };

	return { user };
}

export async function getWhitelistRelations({
	id,
	parent_id,
}: {
	id: string; // must be the internal ID
	parent_id: string | null;
}) {
	const relations = await db.query.serverWhitelists.findMany({
		where: parent_id
			? and(
					ne(serverWhitelists.id, id),
					or(
						eq(serverWhitelists.id, parent_id),
						eq(serverWhitelists.parent_id, parent_id),
					),
				)
			: eq(serverWhitelists.parent_id, id),
		orderBy: desc(serverWhitelists.created_at),
	});
	return { relations };
}

export async function addWhitelist(data: {
	email: string | null;
	parent_id: string | null;
	uuid: string | null;
	discord_id: string | null;
	banned?: boolean;
}) {
	if (!data.email && !data.parent_id) {
		throw new Error("If parent_id is not present, email is required");
	}

	if (data.email) {
		const usedEmail = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.email, data.email.toLowerCase()),
		);
		if (usedEmail) return { error: Errors.EmailUsed };
	}

	if (data.parent_id) {
		const existsUser = await db.$count(
			serverWhitelists,
			and(
				eq(serverWhitelists.id, data.parent_id),
				isNull(serverWhitelists.parent_id),
			),
		);
		if (!existsUser) return { error: Errors.ParentNotFound };

		const count = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.parent_id, data.parent_id),
		);
		if (count >= 10) return { error: Errors.ParentReachedGuestLimit };
	}

	if (data.uuid) {
		const count = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.uuid, data.uuid),
		);
		if (count) return { error: Errors.MinecraftUuidUsed };
	}

	if (data.discord_id) {
		const count = await db.$count(
			serverWhitelists,
			eq(serverWhitelists.discord_id, data.discord_id),
		);
		if (count) return { error: Errors.DiscordIdUsed };
	}

	try {
		const [user] = await db
			.insert(serverWhitelists)
			.values({
				...data,
				email: data.email?.toLowerCase(),
			})
			.returning({
				id: serverWhitelists.id,
				created_at: serverWhitelists.created_at,
			});
		if (!user) throw new Error("Failed to create user");

		if (data.discord_id) {
			await grantDiscordVerifiedRole(data.discord_id);
		}

		return { user };
	} catch (err) {
		console.error(err);
		return { error: Errors.InternalServerError };
	}
}

export async function updateWhitelist(
	id: string,
	data: {
		uuid?: string | null;
		discord_id?: string | null;
		banned?: boolean;
	},
) {
	const isIdUuid = Regex.Uuid.test(id);
	const user = await db.query.serverWhitelists.findFirst({
		columns: { id: true, discord_id: true },
		where: or(
			...(isIdUuid ? [eq(serverWhitelists.id, id)] : []),
			eq(serverWhitelists.email, id.toLowerCase()),
			...(isIdUuid ? [eq(serverWhitelists.uuid, id)] : []),
			eq(serverWhitelists.discord_id, id),
		),
	});
	if (!user) return { error: Errors.NotFound };

	if (Object.keys(data).length > 0) {
		if (
			"discord_id" in data &&
			user.discord_id !== data.discord_id &&
			user.discord_id
		) {
			await revokeDiscordVerifiedRole(user.discord_id);
		}

		await db
			.update(serverWhitelists)
			.set(data)
			.where(eq(serverWhitelists.id, user.id))
			.returning({ id: serverWhitelists.id });

		if (
			"discord_id" in data &&
			user.discord_id !== data.discord_id &&
			data.discord_id
		) {
			await grantDiscordVerifiedRole(data.discord_id);
		}
	}

	return {};
}

export async function deleteWhitelist(id: string) {
	const isIdUuid = Regex.Uuid.test(id);
	const user = await db.query.serverWhitelists.findFirst({
		where: or(
			...(isIdUuid ? [eq(serverWhitelists.id, id)] : []),
			eq(serverWhitelists.email, id.toLowerCase()),
			...(isIdUuid ? [eq(serverWhitelists.uuid, id)] : []),
			eq(serverWhitelists.discord_id, id),
		),
	});
	if (!user) return { error: Errors.NotFound };
	if (user.banned) return { error: Errors.CannotDeleteBannedUser };

	const deletedUsers = await db
		.delete(serverWhitelists)
		.where(
			or(
				eq(serverWhitelists.id, user.id),
				eq(serverWhitelists.parent_id, user.id),
			),
		)
		.returning({ discordId: serverWhitelists.discord_id });

	for (const { discordId } of deletedUsers) {
		if (!discordId) continue;
		await revokeDiscordVerifiedRole(discordId);
	}

	return { user };
}
