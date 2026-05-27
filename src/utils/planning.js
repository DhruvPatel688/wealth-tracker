import { clampNumber } from "@/utils/format";
import { getMonthlyContribution } from "@/utils/ira";

export const WEALTHY_TODAY_VALUE = 3000000;
export const DIAL_MAX_TODAY_VALUE = WEALTHY_TODAY_VALUE * 2;

export function monthsUntilDate(dateString) {
  if (!dateString) return 0;
  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;

  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  return Math.max(0, months + (target.getDate() > now.getDate() ? 1 : 0));
}

export function getInflationFactor(settings = {}, months = 0) {
  return Math.pow(1 + clampNumber(settings.inflationRate) / 100, months / 12);
}

export function getPlanningTargetValues(planningGoal = {}, settings = {}) {
  const targetDate = planningGoal.targetDate || `${new Date().getFullYear() + 20}-01-01`;
  const months = monthsUntilDate(targetDate);
  const inflationFactor = getInflationFactor(settings, months);
  const amount = clampNumber(planningGoal.targetAmount || WEALTHY_TODAY_VALUE);
  const mode = planningGoal.targetMode === "nominal" ? "nominal" : "real";
  const nominalTarget = mode === "real" ? amount * inflationFactor : amount;
  const realTarget = inflationFactor > 0 ? nominalTarget / inflationFactor : nominalTarget;

  return { targetDate, months, inflationFactor, nominalTarget, realTarget, mode };
}

function futureValue(current, monthlyContribution, annualReturn, months) {
  const monthlyRate = Math.pow(1 + clampNumber(annualReturn) / 100, 1 / 12) - 1;
  let balance = clampNumber(current);

  for (let month = 0; month < months; month += 1) {
    balance = balance * (1 + monthlyRate) + clampNumber(monthlyContribution);
  }

  return balance;
}

function buildFundPlan(funds, settings) {
  const totalTarget = funds.reduce((sum, fund) => sum + clampNumber(fund.target), 0);
  const activeFunds = funds.map((fund) => {
    const currentMonthly = getMonthlyContribution(fund, settings);
    const isRothMaxed = fund.category === "roth" && fund.contributionMode === "iraMax";
    const weight = totalTarget > 0 ? clampNumber(fund.target) / totalTarget : 1 / Math.max(1, funds.length);

    return {
      fund,
      currentMonthly,
      isRothMaxed,
      weight,
    };
  });

  return activeFunds;
}

export function calculatePlanningRecommendations({ funds = [], settings = {}, planningGoal = {}, projectedDebt = 0 }) {
  const targetValues = getPlanningTargetValues(planningGoal, settings);
  const fundPlan = buildFundPlan(funds, settings);
  const months = targetValues.months;
  const targetAssets = targetValues.nominalTarget + clampNumber(projectedDebt);

  const projectedAssetsFor = (extraMonthly) => fundPlan.reduce((sum, item) => {
    const recommendedMonthly = item.isRothMaxed ? item.currentMonthly : item.currentMonthly + extraMonthly * item.weight;
    return sum + futureValue(item.fund.current, recommendedMonthly, item.fund.annualReturn, months);
  }, 0);

  const currentProjectedAssets = projectedAssetsFor(0);
  let extraMonthly = 0;

  if (months > 0 && currentProjectedAssets < targetAssets && fundPlan.some((item) => !item.isRothMaxed && item.weight > 0)) {
    let low = 0;
    let high = 1000;

    while (projectedAssetsFor(high) < targetAssets && high < 1000000) {
      high *= 2;
    }

    for (let step = 0; step < 48; step += 1) {
      const mid = (low + high) / 2;
      if (projectedAssetsFor(mid) >= targetAssets) {
        high = mid;
      } else {
        low = mid;
      }
    }

    extraMonthly = high;
  }

  const recommendations = fundPlan.map((item) => {
    const recommendedMonthly = item.isRothMaxed ? item.currentMonthly : item.currentMonthly + extraMonthly * item.weight;
    return {
      id: item.fund.id,
      name: item.fund.name,
      category: item.fund.category,
      contributionMode: item.fund.contributionMode,
      iraCatchUp: item.fund.iraCatchUp,
      currentMonthly: item.currentMonthly,
      recommendedMonthly,
      monthlyChange: recommendedMonthly - item.currentMonthly,
      isRothMaxed: item.isRothMaxed,
      projectedValue: futureValue(item.fund.current, recommendedMonthly, item.fund.annualReturn, months),
      weight: item.weight,
    };
  });

  const recommendedProjectedAssets = recommendations.reduce((sum, row) => sum + row.projectedValue, 0);
  const recommendedProjectedNetWorth = recommendedProjectedAssets - clampNumber(projectedDebt);
  const recommendedRealNetWorth = targetValues.inflationFactor > 0 ? recommendedProjectedNetWorth / targetValues.inflationFactor : recommendedProjectedNetWorth;
  const targetGap = recommendedProjectedNetWorth - targetValues.nominalTarget;

  return {
    ...targetValues,
    targetAssets,
    currentProjectedAssets,
    projectedDebt: clampNumber(projectedDebt),
    recommendedProjectedAssets,
    recommendedProjectedNetWorth,
    recommendedRealNetWorth,
    targetGap,
    recommendations,
  };
}

export function buildPlanningMonthlyPath(plan, settings = {}) {
  const totalMonths = Math.max(0, plan.months || 0);
  const totalYears = Math.max(1, Math.ceil(totalMonths / 12));

  return Array.from({ length: totalYears + 1 }, (_, year) => {
    const month = Math.min(totalMonths, year * 12);
    const inflationFactor = getInflationFactor(settings, month);
    const row = {
      month,
      year: `Y${year}`,
      "Current plan monthly": 0,
      "Recommended monthly": 0,
    };

    plan.recommendations.forEach((recommendation) => {
      const currentMonthly = recommendation.isRothMaxed
        ? getMonthlyContribution(recommendation, settings, month)
        : recommendation.currentMonthly;
      const recommendedMonthly = recommendation.isRothMaxed
        ? getMonthlyContribution(recommendation, settings, month)
        : recommendation.recommendedMonthly * inflationFactor;

      row["Current plan monthly"] += currentMonthly;
      row["Recommended monthly"] += recommendedMonthly;
      row[recommendation.name] = Math.round(recommendedMonthly);
    });

    row["Current plan monthly"] = Math.round(row["Current plan monthly"]);
    row["Recommended monthly"] = Math.round(row["Recommended monthly"]);

    return row;
  });
}
