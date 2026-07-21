import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";
import { fetchUserByCognitoSub, setUserPasswordSetAt } from "@/services/auth/auth.service";
import { handleApiError } from "@/lib/errors";
import { setPasswordSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = setPasswordSchema.parse(body);

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password", code: "UPDATE_FAILED" },
        { status: 400 }
      );
    }

    const dbUser = await fetchUserByCognitoSub(authUser.id);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        passwordSetAt: new Date(),
        hashedPassword: hashedPassword,
      },
    });

    const redirectMap = {
      MAIN_ADMIN: "/admin",
      WARDEN: "/warden",
      TENANT: "/tenant",
    } as const;

    return NextResponse.json({ redirectUrl: redirectMap[dbUser.role] });
  } catch (error) {
    return handleApiError(error);
  }
}
