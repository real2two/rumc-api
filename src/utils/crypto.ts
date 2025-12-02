import { getRandomValues } from "node:crypto";

/**
 * Generate a randomly generated code
 * @param length The length of the randomly generated code
 * @returns The randomly generated code
 */
export function createCode(length: number) {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = new Uint32Array(length);
	let result = "";
	getRandomValues(values);
	for (let i = 0; i < length; i++) {
		const value = values[i];
		if (!value) {
			throw new Error(`values[${i}] is not defined in createCode - ${value}`);
		}
		result += charset[value % charset.length];
	}
	return result;
}
