import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/auth";
import { UserRole } from "@prisma/client";

function getRedirectUrl(role: UserRole): string {
  switch (role) {
    case UserRole.MAIN_ADMIN:
      return "/admin";
    case UserRole.WARDEN:
      return "/warden";
    case UserRole.TENANT:
      return "/tenant";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = loginSchema.parse(body);
    const rememberMe = body.rememberMe === true;

    const isEmail = identifier.includes("@");

    // Helper to normalize phone for DB lookup
    const normalizePhone = (p: string) => p.replace(/^\+91/, "").replace(/^\+/, "").trim();

    // 1. Look up user in DB
    let dbUser = null;
    if (isEmail) {
      dbUser = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
    } else {
      dbUser = await prisma.user.findUnique({ where: { phone: identifier } });
      if (!dbUser) {
        const norm = normalizePhone(identifier);
        dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: norm },
              { phone: `+91${norm}` },
              { phone: `+${norm}` },
            ],
          },
        });
      }
    }

    if (!dbUser) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Validate password against stored plainTextPassword
    if (!dbUser.plainTextPassword || dbUser.plainTextPassword !== password) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 3. Create a NextAuth-compatible JWT and set the session cookie
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
    const now = Math.floor(Date.now() / 1000);

    const sessionToken = await encode({
      token: {
        // sub must equal supabaseAuthId so that requireRole() can look up the user
        sub: dbUser.supabaseAuthId,
        id: dbUser.id,
        role: dbUser.role,
        passwordSetAt: dbUser.passwordSetAt?.toISOString() ?? null,
        iat: now,
        exp: now + maxAge,
        jti: crypto.randomUUID(),
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge,
    });

    // NextAuth uses __Secure- prefix when NEXTAUTH_URL is https://
    const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const cookieName = useSecureCookies
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const cookieStore = await cookies();

    if (rememberMe) {
      cookieStore.set("remember_me", "true", {
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: useSecureCookies,
      });
    }

    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return NextResponse.json({
      role: dbUser.role,
      redirectUrl: getRedirectUrl(dbUser.role),
      passwordSetAt: dbUser.passwordSetAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
