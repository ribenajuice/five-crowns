/**
 * The front door.
 *
 * ⚠️ **Denies by default.** Only `/login` and `POST /api/login` are on the
 * allowlist; everything else needs a valid group session, including `/admin`,
 * which then wants its own second password on top
 * (docs/ARCHITECTURE.md § Flow 1).
 *
 * This runs before any page is built, which is what makes PRD criterion 1 true:
 * with no session, **no fragment of the record appears in the returned HTML**,
 * because the HTML is never rendered.
 *
 * What it deliberately does **not** do: check the session epoch, or look
 * anything up. Middleware has no AWS client and no database, so it verifies the
 * cookie's signature, expiry and scope only. The full check — including the
 * epoch that makes revocation work — happens in `requireGroupSession()` before
 * anything renders. Two layers, on purpose.
 */

import { NextResponse, type NextRequest } from "next/server";

import { GROUP_COOKIE } from "@/lib/auth/cookies";
import { verifySession } from "@/lib/auth/token";
import { SESSION_SECRET_ENV } from "@/lib/config/parameters";

/** The only things reachable without a session. Nothing else, ever. */
const PUBLIC_PATHS = new Set(["/login"]);

function isPublic(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return true;
  // The one API route that has to be callable by someone with no session.
  if (pathname === "/api/login" && request.method === "POST") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (isPublic(request)) return NextResponse.next();

  const secret = process.env[SESSION_SECRET_ENV];
  const token = request.cookies.get(GROUP_COOKIE)?.value;

  if (secret && token) {
    const result = await verifySession(token, secret, { scope: "group" });
    if (result.ok) return NextResponse.next();
  }

  // An API route gets a status it can act on; a page gets sent to the gate.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorised",
          message: "You need the password for this.",
        },
      },
      { status: 401 },
    );
  }

  const login = new URL("/login", request.nextUrl);
  // Deliberately no ?next= — the app has three screens and a redirect
  // parameter is an open-redirect hole waiting to be got wrong.
  return NextResponse.redirect(login);
}

export const config = {
  /**
   * Everything except Next's own static output and the favicon. Matching
   * broadly and allowlisting narrowly is the safe way round: a new route is
   * private the moment it exists, without anyone remembering to add it.
   *
   * ⚠️ **STAGE 2 HAZARD.** The matcher also skips *any* path ending in an image
   * extension (`.png`, `.jpg`, `.jpeg`, `.svg`, `.ico`, `.webp`, `.woff2`) —
   * session or not. A photo route, a `/review/...` route or anything else that
   * could ever end in one of those extensions is **public unless it calls
   * `requireGroupSession()` itself** (or, for an API route, checks
   * `hasSession("group")` and returns 401). Do not rely on this middleware for
   * it. Serving photos by presigned S3 URL, as the architecture says, sidesteps
   * this entirely.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2)$).*)"],
};
