import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<string, UserRole> = {
  "/admin": UserRole.MAIN_ADMIN,
  "/api/admin": UserRole.MAIN_ADMIN,
  "/warden": UserRole.WARDEN,
  "/api/warden": UserRole.WARDEN,
  "/tenant": UserRole.TENANT,
};

const PUBLIC_ROUTES = ["/login", "/set-password"];

function getRequiredRole(pathname: string): UserRole | null {
  for (const [prefix, role] of Object.entries(ROLE_HIERARCHY)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return role;
    }
  }
  return null;
}

function createSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
        },
      },
    }
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set("sb-auth-token", "", { maxAge: 0, path: "/" });
  response.cookies.set("supabase-auth-token", "", { maxAge: 0, path: "/" });
  return response;
}

function jsonError(status: number, message: string, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const requiredRole = getRequiredRole(pathname);

  if (!requiredRole && !isApiRoute) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  const supabase = createSupabaseClient(request);

  let supabaseUserId: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) {
      throw new Error("No session");
    }
    supabaseUserId = data.session.user.id;
  } catch {
    if (requiredRole) {
      if (isApiRoute) {
        return jsonError(401, "Unauthorized", "UNAUTHORIZED");
      }
      return redirectToLogin(request);
    }
    return NextResponse.next();
  }

  if (!requiredRole) {
    return NextResponse.next();
  }

  let dbUserRole: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUserId },
      select: { role: true },
    });
    dbUserRole = user?.role ?? null;
  } catch {
    return NextResponse.next();
  }

  if (!dbUserRole || dbUserRole !== requiredRole) {
    if (isApiRoute) {
      return jsonError(403, "Forbidden", "FORBIDDEN");
    }
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
