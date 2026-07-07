import { Prisma, FoodBillingMode, FoodPlan } from "@prisma/client";
import { endOfMonth } from "date-fns";
import { PricingService } from "./pricing.service";

export class FoodCycleService {
  /**
   * Creates the initial FoodBillingCycle for a stay during onboarding.
   * Throws an error if no active pricing is found.
   */
  static async createCycleForStay(
    tx: Prisma.TransactionClient,
    stayId: string,
    organizationId: string,
    hostelId: string,
    foodBillingMode: FoodBillingMode,
    foodPlan: FoodPlan,
    joiningDate: Date,
  ) {
    if (foodBillingMode === FoodBillingMode.FLAT_RATE || foodPlan === FoodPlan.NOT_INCLUDED) {
      return null;
    }

    // Get active pricing as of the joining date
    const pricing = await PricingService.getActivePricing(organizationId, hostelId, joiningDate);
    
    if (!pricing) {
      throw new Error("Cannot enable consumption-based food billing: No active meal prices configured for this date.");
    }

    const cycleStart = new Date(joiningDate);
    const cycleEnd = endOfMonth(cycleStart);
    // Ensure times are zeroed for clean cycle boundaries (in IST logic if necessary, though endOfMonth usually keeps time).
    cycleStart.setUTCHours(0, 0, 0, 0);
    cycleEnd.setUTCHours(23, 59, 59, 999);

    const cycle = await tx.foodBillingCycle.create({
      data: {
        stayId,
        cycleStart,
        cycleEnd,
        status: "OPEN",
        breakfastPricePaise: pricing.breakfastPricePaise,
        lunchPricePaise: pricing.lunchPricePaise,
        dinnerPricePaise: pricing.dinnerPricePaise,
      },
    });

    return cycle;
  }
}
