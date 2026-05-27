import { portfolioCategories } from "@/constants";
import { clampNumber } from "@/utils/format";

export function isPortfolioFund(fund) {
  return portfolioCategories.includes(fund.category);
}

export function getFundPortfolioValue(fundId, etfs) {
  return etfs
    .filter((etf) => etf.fundId === fundId)
    .reduce((sum, etf) => sum + clampNumber(etf.currentValue), 0);
}

export function getFundHoldingsCount(fundId, etfs) {
  return etfs.filter((etf) => etf.fundId === fundId).length;
}

export function getEffectiveFundValue(fund, etfs) {
  if (!isPortfolioFund(fund)) return clampNumber(fund.current);
  const portfolioValue = getFundPortfolioValue(fund.id, etfs);
  return portfolioValue > 0 ? portfolioValue : clampNumber(fund.current);
}

export function monthsToTarget(fund) {
  const remaining = Math.max(0, clampNumber(fund.target) - clampNumber(fund.current));
  if (remaining === 0) return 0;
  if (!clampNumber(fund.monthlyContribution)) return Infinity;
  return Math.ceil(remaining / clampNumber(fund.monthlyContribution));
}
