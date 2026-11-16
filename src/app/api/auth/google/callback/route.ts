import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, isDemoEmail, setAuthCookie, signToken } from "@/lib/auth";
import { googleConfig, googleCookieOptions, googleStateCookie, verifyGoogleIdentity } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in is unavailable." }, { status: 503 });

  const [state, nonce, verifier] = request.cookies.get(googleStateCookie)?.value.split(".") ?? [];
  const code = request.nextUrl.searchParams.get("code");
  function finish(path: string) {
    const response = NextResponse.redirect(new URL(path, config!.appUrl));
    response.cookies.set(googleStateCookie, "", { ...googleCookieOptions, maxAge: 0 });
    return response;
  }

  if (!state || !nonce || !verifier || !code || request.nextUrl.searchParams.get("state") !== state) {
    return finish("/login?error=google");
  }
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        code, client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: config.redirectUri, code_verifier: verifier, grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return finish("/login?error=google");

    const { id_token } = await tokenResponse.json();
    const { payload } = await verifyGoogleIdentity(id_token, config.clientId);
    if (payload.nonce !== nonce || !payload.sub || payload.email_verified !== true || typeof payload.email !== "string") {
      return finish("/login?error=google");
    }

    let user = await prisma.user.findUnique({ where: { googleSubject: payload.sub } });
    if (!user) {
      const email = payload.email.toLowerCase();
      if (isDemoEmail(email) || await prisma.user.findUnique({ where: { email } })) {
        return finish("/login?error=existing");
      }
      user = await prisma.user.create({ data: {
        email, googleSubject: payload.sub, role: "STUDENT",
        name: typeof payload.name === "string" ? payload.name.slice(0, 120) : email,
        password: await hashPassword(randomBytes(32).toString("base64url")),
      } });
    }

    const response = finish("/events");
    setAuthCookie(response, signToken({
      userId: user.id, email: user.email, name: user.name,
      role: user.role as "STUDENT" | "ORGANIZER" | "CAMPUS_MANAGER",
    }));
    return response;
  } catch (error) {
    console.warn("Google sign-in failed", error instanceof Error ? error.name : "Unknown error");
    return finish("/login?error=google");
  }
}
