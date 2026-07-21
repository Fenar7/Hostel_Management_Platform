import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError, NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/auth/server";
import { assignWardenSchema } from "@/lib/validation/hostel";
import bcrypt from "bcryptjs";



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const hostelId = (await params).id;

    const body = await request.json();
    const data = assignWardenSchema.parse(body);

    // 1. Verify hostel exists and has no warden
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      include: { warden: true },
    });

    if (!hostel) {
      throw new NotFoundError("Hostel not found");
    }

    if (hostel.warden) {
      throw new ConflictError("This hostel already has a warden assigned");
    }

    // 2. Check phone/email uniqueness in Prisma User
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email.toLowerCase() }] : []),
          { phone: data.phone },
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.email === data.email?.toLowerCase() ? "email" : "phone";
      throw new ConflictError(`A user with this ${field} already exists`);
    }

    // 3. Create Supabase Auth user (with orphan cleanup on conflict)
    const supabase = createAdminClient();

    const createAuthUser = async (): Promise<string> => {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email?.toLowerCase() || undefined,
        phone: data.phone,
        password: data.password,
        email_confirm: !!data.email,
        phone_confirm: true,
      });

      if (authError || !authData?.user) {
        if (authError?.message?.toLowerCase().includes("already")) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const orphanedUser = existingUsers?.users?.find(
            (u: any) => u.phone === data.phone || u.email === data.email?.toLowerCase()
          );
          if (orphanedUser) {
            await supabase.auth.admin.deleteUser(orphanedUser.id);
            const retry = await supabase.auth.admin.createUser({
              email: data.email?.toLowerCase() || undefined,
              phone: data.phone,
              password: data.password,
              email_confirm: !!data.email,
              phone_confirm: true,
            });
            if (!retry.error && retry.data?.user) {
              return retry.data.user.id;
            }
          }
        }
        throw new ValidationError(
          authError?.message || "Failed to create authentication credentials"
        );
      }

      return authData.user.id;
    };

    const cognitoSub = await createAuthUser();

    // 4. Create Prisma User + Warden record atomically
    const hashedPassword = await bcrypt.hash(data.password || "", 10);
    try {
      const [user, warden] = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            cognitoSub,
            phone: data.phone,
            email: data.email?.toLowerCase() || null,
            passwordSetAt: null,
            plainTextPassword: data.password, // Keep for backward compatibility
            hashedPassword: hashedPassword,
            role: UserRole.WARDEN,
            organizationId: session.user.organizationId,
          },
        });

        const warden = await tx.warden.create({
          data: {
            userId: user.id,
            hostelId,
          },
          include: {
            user: {
              select: { id: true, email: true, phone: true },
            },
          },
        });

        return [user, warden];
      });

      return NextResponse.json({
        success: true,
        warden: {
          id: warden.id,
          userId: user.id,
          phone: user.phone,
          email: user.email,
        },
      }, { status: 201 });
    } catch (error) {
      await supabase.auth.admin.deleteUser(cognitoSub).catch(() => {});
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
