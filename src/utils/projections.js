import { clampNumber } from "@/utils/format";
import { getMonthlyContribution } from "@/utils/ira";
import { getFundPortfolioValue, isPortfolioFund } from "@/utils/portfolio";

export function projectNormalFunds(funds, years, settings = {}) {
  const fundBalances = funds.map((fund) => ({
    id: fund.id,
    name: fund.name,
    fund,
    balance: clampNumber(fund.current),
    monthlyRate: Math.pow(1 + clampNumber(fund.annualReturn) / 100, 1 / 12) - 1,
  }));
  const rows = [];
  const totalMonths = Math.max(12, Math.round(years * 12));
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      fundBalances.forEach((fund) => {
        fund.balance = fund.balance * (1 + fund.monthlyRate) + getMonthlyContribution(fund.fund, settings, month);
      });
    }
    const yearElapsed = month / 12;
    const row = { month, year: `Y${yearElapsed.toFixed(month % 12 === 0 ? 0 : 1)}` };
    fundBalances.forEach((fund) => {
      row[fund.name] = Math.round(fund.balance);
    });
    row.ProjectedAssets = Math.round(fundBalances.reduce((sum, fund) => sum + fund.balance, 0));
    rows.push(row);
  }
  return rows;
}

export function projectDebt(debts, years) {
  const debtBalances = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: clampNumber(debt.currentBalance),
    monthlyRate: clampNumber(debt.apr) / 100 / 12,
    monthlyPayment: clampNumber(debt.minimumPayment) + clampNumber(debt.extraPayment),
  }));
  const rows = [];
  const totalMonths = Math.max(12, Math.round(years * 12));
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      debtBalances.forEach((debt) => {
        if (debt.balance <= 0) return;
        const interest = debt.balance * debt.monthlyRate;
        debt.balance = Math.max(0, debt.balance + interest - debt.monthlyPayment);
      });
    }
    const yearElapsed = month / 12;
    rows.push({ month, year: `Y${yearElapsed.toFixed(month % 12 === 0 ? 0 : 1)}`, ProjectedDebt: Math.round(debtBalances.reduce((sum, debt) => sum + debt.balance, 0)) });
  }
  return rows;
}

export function projectAssetsWithLinkedPortfolios(funds, etfs, years, settings = {}) {
  const totalMonths = Math.max(12, Math.round(years * 12));
  const normalFundModels = funds
    .filter((fund) => !isPortfolioFund(fund) || getFundPortfolioValue(fund.id, etfs) === 0)
    .map((fund) => ({
      id: fund.id,
      name: fund.name,
      fund,
      balance: clampNumber(fund.current),
      monthlyRate: Math.pow(1 + clampNumber(fund.annualReturn) / 100, 1 / 12) - 1,
    }));

    const portfolioModels = funds
    .filter(
      (fund) =>
        isPortfolioFund(fund) && getFundPortfolioValue(fund.id, etfs) > 0
    )
    .map((fund) => {
      const holdings = etfs.filter((etf) => etf.fundId === fund.id);
  
      const targetTotal = holdings.reduce(
        (sum, etf) => sum + clampNumber(etf.targetPercent),
        0
      );
  
      const hasValidTargets = targetTotal > 0;
      const equalWeight = holdings.length > 0 ? 1 / holdings.length : 0;
  
      return {
        ...fund,
        holdings: holdings.map((etf) => {
          const allocationWeight = hasValidTargets
            ? clampNumber(etf.targetPercent) / targetTotal
            : equalWeight;
  
          return {
            ticker: etf.ticker,
            balance: clampNumber(etf.currentValue),
            allocationWeight,
            monthlyRate:
              Math.pow(1 + clampNumber(etf.annualReturn) / 100, 1 / 12) - 1,
          };
        }),
      };
    });

  const rows = [];
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      normalFundModels.forEach((fund) => {
        fund.balance = fund.balance * (1 + fund.monthlyRate) + getMonthlyContribution(fund.fund, settings, month);
      });
      portfolioModels.forEach((portfolio) => {
        const monthlyContribution = getMonthlyContribution(portfolio, settings, month);
        portfolio.holdings.forEach((holding) => {
          holding.balance = holding.balance * (1 + holding.monthlyRate) + monthlyContribution * holding.allocationWeight;
        });
      });
    }
    const yearElapsed = month / 12;
    const row = { month, year: `Y${yearElapsed.toFixed(month % 12 === 0 ? 0 : 1)}` };
    let projectedAssets = 0;
    normalFundModels.forEach((fund) => {
      row[fund.name] = Math.round(fund.balance);
      projectedAssets += fund.balance;
    });
    portfolioModels.forEach((portfolio) => {
      const portfolioValue = portfolio.holdings.reduce((sum, holding) => sum + holding.balance, 0);
      row[portfolio.name] = Math.round(portfolioValue);
      projectedAssets += portfolioValue;
    });
    row.ProjectedAssets = Math.round(projectedAssets);
    rows.push(row);
  }
  return rows;
}
