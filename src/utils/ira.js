import { IRA_ANNUAL_LIMIT, IRA_CATCH_UP_ANNUAL_LIMIT } from "@/constants";
import { clampNumber } from "@/utils/format";

export function getAnnualIraLimit(fund, settings = {}, month = 0) {
  const baseLimit = fund.iraCatchUp ? IRA_CATCH_UP_ANNUAL_LIMIT : IRA_ANNUAL_LIMIT;
  if (!settings.projectIraLimitGrowth) return baseLimit;

  const yearsElapsed = Math.floor(month / 12);
  const inflationRate = clampNumber(settings.inflationRate) / 100;
  return Math.round(baseLimit * Math.pow(1 + inflationRate, yearsElapsed));
}

export function getMonthlyContribution(fund, settings = {}, month = 0) {
  if (fund.category === "roth" && fund.contributionMode === "iraMax") {
    return getAnnualIraLimit(fund, settings, month) / 12;
  }

  return clampNumber(fund.monthlyContribution);
}
