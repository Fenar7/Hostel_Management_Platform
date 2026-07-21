import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/auth/server";
import { adminResetWardenPasswordSchema } from "@/lib/validation/auth";
import bcrypt from "bcryptjs";



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const wardenId = (await params).id;

    const body = await request.json();
    const data = adminResetWardenPasswordSchema.parse(body);

    const warden = await prisma.warden.findUnique({
      where: { id: wardenId },
      include: {
        user: {
          select: { id: true, cognitoSub: true, email: true, phone: true, organizationId: true },
        },
      },
    });

    if (!warden || warden.user.organizationId !== session.user.organizationId) {
      throw new NotFoundError("Warden not found or access denied");
    }

    if (data.password && data.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long.");
    }

    const supabase = createAdminClient();
    
    let activeCognitoSub = warden.user.cognitoSub;

    // Helper to create a brand new Supabase Auth user if missing, or link to an orphaned one
    const createAuthUser = async () => {
      const { data: newAuthData, error } = await supabase.auth.admin.createUser({
        phone: warden.user.phone,
        email: warden.user.email?.toLowerCase() || undefined,
        password: data.password,
        phone_confirm: true,
        email_confirm: !!warden.user.email,
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          const { data: listData } = await supabase.auth.admin.listUsers();
          const orphanedUser = listData?.users?.find(
            (u: any) => u.phone === warden.user.phone || u.phone === warden.user.phone.replace(/^\+/, "")
          );

          if (orphanedUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              orphanedUser.id,
              { password: data.password }
            );
            if (updateError) throw new ConflictError(`Failed to update orphaned user password: ${updateError.message}`);
            return orphanedUser.id;
          }
        }
        throw new ConflictError(`Failed to create missing auth user: ${error.message}`);
      }

      return newAuthData.user.id;
    };

    if (!activeCognitoSub) {
      activeCognitoSub = await createAuthUser();
    } else {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        activeCognitoSub,
        { password: data.password }
      );

      if (authError && authError.message.toLowerCase().includes("user not found")) {
        activeCognitoSub = await createAuthUser();
      } else if (authError) {
        throw new ConflictError(`Failed to update password: ${authError.message}`);
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Update passwordSetAt timestamp and cognitoSub
    await prisma.user.update({
      where: { id: warden.user.id },
      data: {
        cognitoSub: activeCognitoSub,
        passwordSetAt: new Date(),
        plainTextPassword: data.password, // Keep for backward compatibility
        hashedPassword: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
