import { prisma } from "@/lib/db";
import { StayStatus, FoodBillingMode, FoodPlan } from "@prisma/client";

export interface TenantBalanceResult {
  stayId: string;
  tenantName: string;
  roomName: string;
  billingMode: FoodBillingMode;
  foodPlan: FoodPlan;
  cycleId: string | null;
  totalPaidPaise: number;
  totalConsumedPaise: number;
  balancePaise: number;
}

export interface HostelFoodSummary {
  hostelId: string;
  cyclePeriod: { start: Date; end: Date } | null;
  totalRevenuePaise: number;
  totalConsumedPaise: number;
  netPositionPaise: number;
  tenantsInCredit: TenantBalanceResult[];
  tenantsInDebt: TenantBalanceResult[];
  flatRateTenants: TenantBalanceResult[];
}

export class FoodBalanceService {
  /**
   * Computes the real-time wallet balance for a single stay and cycle.
   * If cycleId is omitted, it finds the currently OPEN cycle.
   */
  static async computeWalletBalance(
    stayId: string,
    cycleId?: string
  ): Promise<TenantBalanceResult | null> {
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        tenant: true,
        bed: { include: { room: true } },
      },
    });

    if (!stay) return null;

    let cycle;
    if (cycleId) {
      cycle = await prisma.foodBillingCycle.findUnique({ where: { id: cycleId } });
    } else {
      cycle = await prisma.foodBillingCycle.findFirst({
        where: { stayId, status: "OPEN" },
        orderBy: { cycleStart: "desc" },
      });
    }

    if (!cycle) {
      // If no cycle exists (e.g. FLAT_RATE or NOT_INCLUDED), just return basic info
      return {
        stayId: stay.id,
        tenantName: stay.tenant.fullName || "Unknown",
        roomName: stay.bed.room.name,
        billingMode: stay.foodBillingMode,
        foodPlan: stay.foodPlan,
        cycleId: null,
        totalPaidPaise: stay.foodChargesPaise,
        totalConsumedPaise: 0,
        balancePaise: 0,
      };
    }

    // Sum approved top-ups
    const topUps = await prisma.foodWalletTopUp.aggregate({
      where: {
        cycleId: cycle.id,
        status: "APPROVED",
      },
      _sum: { amountPaise: true },
    });
    
    const totalTopUp = topUps._sum.amountPaise || 0;
    const totalPaidPaise = stay.foodChargesPaise + totalTopUp;

    // Sum consumption
    const orders = await prisma.foodOrder.findMany({
      where: {
        stayId: stay.id,
        forDate: {
          gte: cycle.cycleStart,
          lte: cycle.cycleEnd,
        },
      },
    });

    let totalConsumedPaise = 0;
    for (const order of orders) {
      if (order.breakfast) totalConsumedPaise += cycle.breakfastPricePaise;
      if (order.lunch) totalConsumedPaise += cycle.lunchPricePaise;
      if (order.dinner) totalConsumedPaise += cycle.dinnerPricePaise;
    }

    const balancePaise = totalPaidPaise - totalConsumedPaise;

    return {
      stayId: stay.id,
      tenantName: stay.tenant.fullName || "Unknown",
      roomName: stay.bed.room.name,
      billingMode: stay.foodBillingMode,
      foodPlan: stay.foodPlan,
      cycleId: cycle.id,
      totalPaidPaise,
      totalConsumedPaise,
      balancePaise,
    };
  }

  /**
   * Batch computes the food summary for all active stays in a hostel.
   */
  static async computeHostelFoodSummary(
    hostelId: string
  ): Promise<HostelFoodSummary> {
    const activeStays = await prisma.stay.findMany({
      where: {
        hostelId,
        status: { in: [StayStatus.ACTIVE, StayStatus.EXTENDED] },
        foodPlan: { not: FoodPlan.NOT_INCLUDED },
      },
      select: { id: true },
    });

    const tenantsInCredit: TenantBalanceResult[] = [];
    const tenantsInDebt: TenantBalanceResult[] = [];
    const flatRateTenants: TenantBalanceResult[] = [];
    let totalRevenuePaise = 0;
    let totalConsumedPaise = 0;

    // We fetch one active cycle to determine the current cycle bounds (assuming monthly synchronization)
    const representativeCycle = await prisma.foodBillingCycle.findFirst({
      where: {
        stay: { hostelId },
        status: "OPEN",
      },
      orderBy: { cycleStart: "desc" },
    });

    for (const { id } of activeStays) {
      const balance = await this.computeWalletBalance(id);
      if (!balance) continue;

      if (balance.billingMode === FoodBillingMode.FLAT_RATE) {
        flatRateTenants.push(balance);
        // For flat rate, we could count foodChargesPaise as revenue, but usually they are not part of the consumption ledger in the same way.
        // We'll leave them out of the net position calculation to avoid skewing the prepaid/postpaid consumption math.
      } else {
        totalRevenuePaise += balance.totalPaidPaise;
        totalConsumedPaise += balance.totalConsumedPaise;

        if (balance.balancePaise >= 0) {
          tenantsInCredit.push(balance);
        } else {
          tenantsInDebt.push(balance);
        }
      }
    }

    // Sort by name
    tenantsInCredit.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    tenantsInDebt.sort((a, b) => a.balancePaise - b.balancePaise); // Sort by largest debt first (most negative)
    flatRateTenants.sort((a, b) => a.tenantName.localeCompare(b.tenantName));

    const netPositionPaise = totalRevenuePaise - totalConsumedPaise;

    return {
      hostelId,
      cyclePeriod: representativeCycle
        ? { start: representativeCycle.cycleStart, end: representativeCycle.cycleEnd }
        : null,
      totalRevenuePaise,
      totalConsumedPaise,
      netPositionPaise,
      tenantsInCredit,
      tenantsInDebt,
      flatRateTenants,
    };
  }
}
