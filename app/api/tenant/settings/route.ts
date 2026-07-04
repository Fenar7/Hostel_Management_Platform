import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError, NotFoundError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenant: true,
      },
    });

    if (!user || !user.tenant) {
      throw new NotFoundError("Tenant profile not found");
    }

    return NextResponse.json({
      user: {
        email: user.email,
        phone: user.phone,
      },
      tenant: {
        fullName: user.tenant.fullName,
        gender: user.tenant.gender,
        dateOfBirth: user.tenant.dateOfBirth,
        photoUrl: user.tenant.photoUrl,
        emergencyContactName: user.tenant.emergencyContactName,
        emergencyContactNumber: user.tenant.emergencyContactNumber,
        relationship: user.tenant.relationship,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.TENANT]);
    const body = await request.json();

    const { email, emergencyContactName, emergencyContactNumber, relationship, photoUrl } = body;

    // Update User (Email only)
    if (email !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { email: email === "" ? null : email },
      });
    }

    // Update Tenant
    const tenantUpdateData: any = {};
    if (emergencyContactName !== undefined) tenantUpdateData.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) tenantUpdateData.emergencyContactNumber = emergencyContactNumber;
    if (relationship !== undefined) tenantUpdateData.relationship = relationship;
    if (photoUrl !== undefined) tenantUpdateData.photoUrl = photoUrl;

    if (Object.keys(tenantUpdateData).length > 0) {
      await prisma.tenant.update({
        where: { userId: session.user.id },
        data: tenantUpdateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
