import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleConfig, googleCookieOptions, googleStateCookie } from "@/lib/google-auth";

export function GET() {
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in is unavailable." }, { status: 503 });
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    state,
    nonce,
  }).toString();
  const response = NextResponse.redirect(authorization);
  response.cookies.set(googleStateCookie, [state, nonce, verifier].join("."), googleCookieOptions);
  return response;
}

export const dynamic = "force-dynamic";
