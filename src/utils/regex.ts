export const Regex = {
	Uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
	ScarletMail: /^[a-z][a-z0-9_+-]+@scarletmail\.rutgers\.edu$/,
	MinecraftUsername: /^[a-zA-Z0-9_]{1,16}$/,
};

export enum Pattern {
	Snowflake = "^\\d{17,20}$",
}
