import { auth } from "@/auth";

/**
 * Protect the dashboard. API routes for Inngest and cron are excluded so
 * webhooks/cron can reach them with their own secrets.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname === "/leadforge-logo.png" ||
    pathname.startsWith("/api/inngest") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth");

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
