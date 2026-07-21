import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { UserRole } from "@prisma/client";
import { renderMealOrderReport } from "@/lib/pdf/render";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const hostelId = await resolveHostelId(session, request);

    if (!hostelId) {
      throw new ForbiddenError("Hostel ID is required");
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const dateParam = searchParams.get("date");

    if (!dateParam && (!startDateParam || !endDateParam)) {
      return NextResponse.json(
        { error: "Must provide either 'date' or both 'startDate' and 'endDate'" },
        { status: 400 }
      );
    }

    // Determine the date range
    let start: Date;
    let end: Date;
    let periodLabel = "";

    if (dateParam) {
      const d = new Date(dateParam);
      start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
      
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
      if (dateParam === today) {
        periodLabel = `Today (${start.toLocaleDateString('en-GB')})`;
      } else {
        periodLabel = `${start.toLocaleDateString('en-GB')}`;
      }
    } else {
      const s = new Date(startDateParam!);
      start = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0));
      const e = new Date(endDateParam!);
      end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999));
      periodLabel = `${start.toLocaleDateString('en-GB')} - ${e.toLocaleDateString('en-GB')}`;
    }

    // 1. Fetch hostel details
    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      select: { name: true },
    });

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    // 2. Fetch all tenants currently active or who had orders in this period
    // Find all stays for this hostel that are ACTIVE, EXTENDED, or were active during the period
    const stays = await prisma.stay.findMany({
      where: {
        hostelId,
        OR: [
          { status: { in: ["ACTIVE", "EXTENDED"] } },
          { endDate: { gte: start } }, // left during or after this period
        ],
      },
      include: {
        tenant: true,
        bed: { include: { room: true } },
      },
      orderBy: {
        bed: { room: { roomNumber: 'asc' } },
      },
    });

    // 3. Fetch all food orders in the date range for this hostel
    const foodOrders = await prisma.foodOrder.findMany({
      where: {
        stay: {
          hostelId,
        },
        forDate: {
          gte: start,
          lte: end,
        },
      },
    });

    // 4. Map food orders by stayId
    const ordersByStay = foodOrders.reduce((acc, order) => {
      if (!acc[order.stayId]) {
        acc[order.stayId] = { breakfast: 0, lunch: 0, dinner: 0 };
      }
      if (order.breakfast) acc[order.stayId].breakfast += 1;
      if (order.lunch) acc[order.stayId].lunch += 1;
      if (order.dinner) acc[order.stayId].dinner += 1;
      return acc;
    }, {} as Record<string, { breakfast: number; lunch: number; dinner: number }>);

    // 5. Build tenant rows
    const tenantsData = [];
    const summary = { totalBreakfast: 0, totalLunch: 0, totalDinner: 0, totalMeals: 0 };

    for (const stay of stays) {
      const counts = ordersByStay[stay.id] || { breakfast: 0, lunch: 0, dinner: 0 };
      
      // We only include tenants who actually ordered something, OR if they are currently ACTIVE 
      // (to show they didn't order). For this report, showing all active tenants is usually better.
      const total = counts.breakfast + counts.lunch + counts.dinner;

      // Update summary
      summary.totalBreakfast += counts.breakfast;
      summary.totalLunch += counts.lunch;
      summary.totalDinner += counts.dinner;
      summary.totalMeals += total;

      tenantsData.push({
        name: stay.tenant.fullName,
        roomBed: `${stay.bed?.room?.roomNumber || "N/A"} - ${stay.bed?.label || "N/A"}`,
        breakfast: counts.breakfast,
        lunch: counts.lunch,
        dinner: counts.dinner,
        total,
      });
    }

    // 6. Generate the PDF buffer
    const pdfBuffer = await renderMealOrderReport({
      hostelName: hostel.name,
      periodLabel,
      generatedAt: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }),
      tenants: tenantsData,
      summary,
    });

    // 7. Return the PDF directly as a downloadable file
    const safePeriodLabel = periodLabel.replace(/[^a-zA-Z0-9-]/g, "_");
    
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Meal_Orders_${safePeriodLabel}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
