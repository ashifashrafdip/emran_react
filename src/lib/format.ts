/**
 * Render a timestamp the way MySQL stores it and the way the PHP dashboard
 * printed it: `YYYY-MM-DD HH:MM:SS`.
 *
 * `dashboard.php:49` echoed the raw column value, so MySQL's DATETIME literal
 * appeared verbatim. Prisma hands back a `Date`, and the default `toString()`
 * / `toLocaleString()` would render something quite different (and would vary
 * by server locale). Reading the UTC components restores the exact original
 * string, because the connection is pinned to UTC in `lib/prisma.ts`.
 *
 * A null column renders as an empty string, matching PHP's behaviour when
 * echoing NULL.
 */
export function formatMysqlDateTime(value: Date | null | undefined): string {
  if (!value) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  const date = `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  const time = `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;

  return `${date} ${time}`;
}
