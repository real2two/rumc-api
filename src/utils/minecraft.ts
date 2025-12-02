/**
 * Search up a Minecraft player by username
 * @param username The Minecraft username
 * @returns The UUID and name of the player
 */
export async function getMinecraftPlayer(
	username: string,
): Promise<{ id: string; username: string } | null> {
	const res = await fetch(
		`https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`,
		{ headers: { "User-Agent": "RUMC/1.0 (rumc.club)" } },
	);
	if (!res.ok) return null;

	const json = await res.json();
	const player = {
		// @ts-expect-error This is correct
		id: json?.data?.player?.id,
		// @ts-expect-error This is correct
		username: json?.data?.player?.username,
	};
	return player.id && player.username ? player : null;
}
