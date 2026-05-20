import bcrypt from "bcryptjs";

/**
 * Hash a plain-text password using bcrypt with 12 salt rounds.
 *
 * Salt rounds: 12
 * ---------------
 * Bcrypt's cost factor is exponential: 12 rounds means 2^12 = 4096 iterations.
 * This provides a strong security margin against brute-force and GPU-based
 * attacks while keeping hash computation under ~250ms on modern hardware.
 * Rounds below 10 are considered too fast; rounds above 14 become too slow
 * for interactive logins.  12 is the widely accepted default.
 *
 * Why bcrypt over SHA-256 / MD5?
 * --------------------------------
 * SHA-256 and MD5 are general-purpose hash functions designed to be *fast*.
 * That speed makes them dangerous for password storage — an attacker can
 * compute billions of hashes per second with consumer GPUs.
 *
 * Bcrypt is deliberately slow and includes a built-in random salt, so:
 *   - Each hash takes meaningful CPU time (harder to brute-force).
 *   - Identical passwords produce different hashes (rainbow-table resistant).
 *   - The cost factor can be increased as hardware improves.
 *
 * Never log, return, or store a plain-text password.
 * Always hash immediately before persistence.
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
