import { createRemoteJWKSet, jwtVerify } from "jose";

export const googleStateCookie = "campus_google_state";
export const googleCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/google",
  maxAge: 600,
};

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) return null;
  return { clientId, clientSecret, appUrl, redirectUri: new URL("/api/auth/google/callback", appUrl).href };
}

const signingKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function verifyGoogleIdentity(idToken: string, audience: string) {
  return jwtVerify(idToken, signingKeys, {
    algorithms: ["RS256"],
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
  });
}
