import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/auth/server";

const STORAGE_BUCKET = "tenant-documents";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hostelId = (await params).id;

    const hostel = await prisma.hostel.findUnique({ where: { id: hostelId } });
    if (!hostel) throw new NotFoundError("Hostel not found");

    const config = await prisma.hostelPaymentConfig.findUnique({
      where: { hostelId },
    });

    let qrCodeUrl: string | null = null;
    if (config?.qrCodePath) {
      const supabase = createAdminClient();
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(config.qrCodePath, 3600);
      qrCodeUrl = data?.signedUrl || null;
    }

    return NextResponse.json({
      upiId: config?.upiId || null,
      qrCodeUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
