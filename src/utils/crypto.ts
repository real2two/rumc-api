import { randomInt } from "node:crypto";

const charset =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate random code
 * @param length The length of randomly generated code
 * @returns The randomly generated code
 */
export function createCode(length: number): string {
  return Array.from(
    { length },
    () => charset[randomInt(0, charset.length)],
  ).join("");
}
