import { readObject } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie, isDemoEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await readObject(req);
    if (!body) return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
    const { name, email, password, role } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Role protection: CAMPUS_MANAGER cannot be self-registered
    const normalizedRole = role === "ORGANIZER" ? "ORGANIZER" : "STUDENT";

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing || isDemoEmail(cleanEmail)) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: normalizedRole,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as "STUDENT" | "ORGANIZER",
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    }, { status: 201 });

    setAuthCookie(response, token);

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
