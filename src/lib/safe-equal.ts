import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison.
 *
 * `login.php:9-10` used `===`, which short-circuits on the first differing byte
 * and therefore leaks how much of a guess was correct through response timing.
 *
 * Both inputs are hashed first so the buffers handed to `timingSafeEqual` are
 * always 32 bytes. Comparing the raw strings would throw on a length mismatch
 * and would leak the credential's length through the error path.
 */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();

  return timingSafeEqual(hashA, hashB);
}
