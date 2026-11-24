// Next.js 16 renamed the middleware entry point to Proxy.
import { authMiddleware } from "./lib/auth-middleware";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ["/api/organizer/:path*", "/api/manager/:path*", "/api/drafts/:path*", "/api/ai/analyze-poster"],
};
