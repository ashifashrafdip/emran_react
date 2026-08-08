import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Replaces check_new_user.php.
 *
 * Returns the highest user id so a client can detect a new signup. The response
 * key `last_id` is preserved, and an unauthenticated request still answers with
 * a bare HTTP 403 and no body, exactly as `http_response_code(403); exit;` did.
 *
 * This route is deliberately excluded from the middleware matcher so that it
 * returns 403 rather than redirecting to the login page — a redirect would hand
 * an HTML document to a caller expecting JSON.
 *
 * Two behavioural notes, both carried over knowingly:
 *   - `last_id` is a JSON number here. mysqli returned column values as strings,
 *     so the PHP version emitted `{"last_id":"42"}`. Nothing consumes this
 *     endpoint today (PROJECT_ANALYSIS.md §3), so no caller can break; a number
 *     is the correct type for an integer column.
 *   - An empty `users` table yields `{"last_id":null}`, matching `MAX(id)` over
 *     no rows.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse(null, { status: 403 });
  }

  const result = await prisma.user.aggregate({ _max: { id: true } });

  return NextResponse.json({ last_id: result._max.id }, { status: 200 });
}
