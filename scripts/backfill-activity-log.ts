require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
import { ActivityEventType } from "@prisma/client";
import { prisma } from "../lib/db/index";
import * as crypto from "crypto";

function generateId(sourceTable: string, sourceId: string, eventType: string): string {
  return crypto.createHash('sha256').update(`${sourceTable}-${sourceId}-${eventType}`).digest('hex').substring(0, 36);
}

async function main() {
  console.log("Starting backfill for ActivityLog...");

  // 1. Backfill Tickets
  console.log("Backfilling Tickets...");
  const tickets = await prisma.ticket.findMany({
    include: {
      hostel: true,
      tenant: { include: { user: true } },
    }
  });

  for (const ticket of tickets) {
    if (!ticket.tenant?.userId || !ticket.hostel) continue;

    const eventId = generateId('Ticket', ticket.id, 'TICKET_RAISED');
    
    await prisma.activityLog.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        organizationId: ticket.hostel.organizationId,
        hostelId: ticket.hostelId,
        eventType: ActivityEventType.TICKET_RAISED,
        actorId: ticket.tenant.userId,
        actorName: ticket.tenant.fullName || "Tenant",
        subjectName: ticket.title,
        subjectId: ticket.id,
        subjectType: "Ticket",
        targetUrl: `/warden/complaints?ticketId=${ticket.id}`,
        createdAt: ticket.createdAt,
      }
    });
  }
  console.log(`Backfilled ${tickets.length} tickets.`);

  // 2. Backfill Payments
  console.log("Backfilling Payments...");
  const payments = await prisma.payment.findMany({
    include: {
      stay: { include: { hostel: true, tenant: { include: { user: true } } } },
    }
  });

  for (const payment of payments) {
    if (!payment.stay?.hostel) continue;

    const eventId = generateId('Payment', payment.id, 'TENANT_PAYMENT_RECEIVED');
    
    await prisma.activityLog.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        organizationId: payment.stay.hostel.organizationId,
        hostelId: payment.stay.hostelId,
        eventType: ActivityEventType.TENANT_PAYMENT_RECEIVED,
        actorId: payment.stay.tenant?.userId, // or null
        actorName: payment.stay.tenant?.fullName || "Tenant",
        subjectName: `Payment of ₹${payment.amountPaidPaise / 100}`,
        subjectId: payment.id,
        subjectType: "Payment",
        targetUrl: `/warden/onboards/${payment.stayId}`,
        createdAt: payment.createdAt,
      }
    });
  }
  console.log(`Backfilled ${payments.length} payments.`);

  // 3. Backfill StayStatusEvents (Onboarded, Checked Out)
  console.log("Backfilling StayStatusEvents...");
  const stayEvents = await prisma.stayStatusEvent.findMany({
    include: {
      stay: { include: { hostel: true, tenant: true } },
      changedByUser: true,
    }
  });

  for (const event of stayEvents) {
    if (!event.stay?.hostel) continue;

    let eventType: ActivityEventType = ActivityEventType.STAY_STATUS_CHANGED;
    if (event.toStatus === "ACTIVE") eventType = ActivityEventType.TENANT_ONBOARDED;
    if (event.toStatus === "EARLY_EXIT" || event.toStatus === "CHECKED_OUT") eventType = ActivityEventType.TENANT_CHECKED_OUT;

    const eventId = generateId('StayStatusEvent', event.id, eventType);
    
    await prisma.activityLog.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        organizationId: event.stay.hostel.organizationId,
        hostelId: event.stay.hostelId,
        eventType: eventType,
        actorId: event.changedByUserId,
        actorName: event.changedByUser?.phone || "System",
        subjectName: event.stay.tenant?.fullName || "Tenant",
        subjectId: event.stay.id,
        subjectType: "Stay",
        targetUrl: `/warden/onboards/${event.stayId}`,
        createdAt: event.createdAt,
      }
    });
  }
  console.log(`Backfilled ${stayEvents.length} stay events.`);

  console.log("Backfill complete!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
