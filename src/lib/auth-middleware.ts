import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

// Authentication middleware. Role authorization remains in each API handler.
export async function authMiddleware(request: NextRequest) {
  const secret = process.env.JWT_SECRET;
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1]
    ?? request.cookies.get("campus_auth_token")?.value;
  if (secret && token) {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    }).catch(() => null);
    if (verified?.payload.sub || verified?.payload.userId) return NextResponse.next();
  }
  return NextResponse.json({ error: "Sign in to continue." }, {
    status: 401,
    headers: { "WWW-Authenticate": "Bearer" },
  });
}
