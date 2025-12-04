export enum ErrorCodes {
	NotFound = "not_found",
	InternalServerError = "internal_server_error",

	EmailUsed = "email_used",
	ParentNotFound = "parent_not_found",
	ParentReachedGuestLimit = "parent_reached_guest_limit",
	MinecraftUuidUsed = "minecraft_uuid_used",
	DiscordIdUsed = "discord_id_used",
}

export const Errors = {
	NotFound: { status: 404, code: ErrorCodes.NotFound },
	InternalServerError: { status: 500, code: ErrorCodes.InternalServerError },

	EmailUsed: { status: 409, code: ErrorCodes.EmailUsed },
	ParentNotFound: { status: 409, code: ErrorCodes.ParentNotFound },
	ParentReachedGuestLimit: {
		status: 429,
		code: ErrorCodes.ParentReachedGuestLimit,
	},
	MinecraftUuidUsed: { status: 409, code: ErrorCodes.MinecraftUuidUsed },
	DiscordIdUsed: { status: 409, code: ErrorCodes.DiscordIdUsed },
} as const;
