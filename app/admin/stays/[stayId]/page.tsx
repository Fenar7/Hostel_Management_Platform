import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSignedUrl } from "@/lib/storage";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";

export const dynamic = "force-dynamic";

export default async function AdminStayDetailsFallbackPage({
  params,
}: {
  params: Promise<{ stayId: string }>;
}) {
  const { user } = await requireRole([UserRole.MAIN_ADMIN]);
  const { stayId } = await params;

  const stay = await prisma.stay.findFirst({
    where: {
      id: stayId,
      hostel: { organizationId: user.organizationId },
    },
    include: {
      hostel: true,
      tenant: {
        include: {
          user: true,
          documents: true,
        },
      },
      bed: {
        include: {
          room: true,
        },
      },
      payments: true,
      foodOrders: {
        orderBy: { forDate: "desc" },
      },
    },
  });

  if (!stay) {
    notFound();
  }

  // Pre-sign document URLs for AWS S3 / private storage
  if (stay.tenant?.documents) {
    const signedDocs = await Promise.all(
      stay.tenant.documents.map(async (doc) => {
        let signedUrl = doc.storagePath;
        if (
          doc.storagePath &&
          !doc.storagePath.startsWith("http://") &&
          !doc.storagePath.startsWith("https://") &&
          !doc.storagePath.startsWith("data:")
        ) {
          try {
            signedUrl = await getSignedUrl(doc.storagePath);
          } catch {
            signedUrl = `/${doc.storagePath}`;
          }
        }
        return { ...doc, storagePath: signedUrl, signedUrl };
      })
    );
    (stay.tenant as any).documents = signedDocs;
  }

  return (
    <StayDetailsPageView
      stay={stay as any}
      baseRoute={`/admin/hostels/${stay.hostelId}`}
    />
  );
}

