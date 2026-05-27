import { todayISO, clampNumber } from "@/utils/format";
import { getMonthlyContribution } from "@/utils/ira";

export function emptyFund() {
  return { name: "", category: "custom", current: "", target: "", monthlyContribution: "", contributionMode: "manual", iraCatchUp: false, annualReturn: "7", notes: "" };
}

export function emptyDebt() {
  return { name: "", type: "other", currentBalance: "", originalBalance: "", apr: "", minimumPayment: "", extraPayment: "0", dueDay: "", notes: "", status: "active" };
}

export function emptyTransaction() {
  return { fundId: "", type: "contribution", amount: "", date: todayISO(), note: "" };
}

export function emptyDebtTransaction() {
  return { debtId: "", amount: "", date: todayISO(), note: "" };
}

export function emptyEtf() {
  return { ticker: "", name: "", shares: "", targetPercent: "", livePrice: "", previousClose: "", dailyChange: "", dailyChangePercent: "", currentValue: "", annualReturn: "8", lastUpdated: null };
}

export function sanitizeFund(fund) {
  const contributionMode = fund.category === "roth" ? fund.contributionMode || "manual" : "manual";
  const normalized = {
    ...fund,
    contributionMode,
    iraCatchUp: fund.category === "roth" ? Boolean(fund.iraCatchUp) : false,
  };

  return {
    ...normalized,
    name: normalized.name.trim(),
    current: clampNumber(normalized.current),
    target: clampNumber(normalized.target),
    monthlyContribution: contributionMode === "iraMax" ? getMonthlyContribution(normalized) : clampNumber(normalized.monthlyContribution),
    annualReturn: clampNumber(normalized.annualReturn),
    notes: normalized.notes?.trim() || "",
  };
}

export function sanitizeDebt(debt) {
  return {
    ...debt,
    name: debt.name.trim(),
    currentBalance: clampNumber(debt.currentBalance),
    originalBalance: clampNumber(debt.originalBalance || debt.currentBalance),
    apr: clampNumber(debt.apr),
    minimumPayment: clampNumber(debt.minimumPayment),
    extraPayment: clampNumber(debt.extraPayment),
    dueDay: debt.dueDay ? String(debt.dueDay) : "",
    notes: debt.notes?.trim() || "",
    status: debt.status || "active",
  };
}

export function makeFreshDefaultState() {
  const taxableId = crypto.randomUUID();
  const rothId = crypto.randomUUID();
  return {
    funds: [
      { id: taxableId, name: "Taxable Brokerage", category: "brokerage", current: 0, target: 25000, monthlyContribution: 500, contributionMode: "manual", iraCatchUp: false, annualReturn: 9, notes: "Taxable ETF portfolio. Click View Portfolio to manage holdings." },
      { id: rothId, name: "Roth IRA", category: "roth", current: 0, target: 100000, monthlyContribution: 625, contributionMode: "iraMax", iraCatchUp: false, annualReturn: 8, notes: "Tax-advantaged ETF portfolio. Click View Portfolio to manage holdings." },
      { id: crypto.randomUUID(), name: "Savings Account", category: "savings", current: 0, target: 10000, monthlyContribution: 250, annualReturn: 4, notes: "Emergency fund / cash stability." },
      { id: crypto.randomUUID(), name: "Real Estate Fund", category: "realEstate", current: 0, target: 50000, monthlyContribution: 300, annualReturn: 6, notes: "Future down payment, closing costs, or property opportunity fund." },
      { id: crypto.randomUUID(), name: "Business Acquisition Fund", category: "business", current: 0, target: 100000, monthlyContribution: 400, annualReturn: 7, notes: "Long-term fund for buying or investing in a cash-flowing business." },
    ],
    debts: [],
    transactions: [],
    debtTransactions: [],
    snapshots: [],
    etfs: [
      { id: crypto.randomUUID(), fundId: taxableId, ticker: "VTI", name: "Total U.S. Market", shares: 0, targetPercent: 55, livePrice: 0, previousClose: 0, dailyChange: 0, dailyChangePercent: 0, currentValue: 0, annualReturn: 8, lastUpdated: null },
      { id: crypto.randomUUID(), fundId: taxableId, ticker: "QQQM", name: "Nasdaq-100 Growth", shares: 0, targetPercent: 20, livePrice: 0, previousClose: 0, dailyChange: 0, dailyChangePercent: 0, currentValue: 0, annualReturn: 10, lastUpdated: null },
      { id: crypto.randomUUID(), fundId: taxableId, ticker: "VGT", name: "Information Technology", shares: 0, targetPercent: 10, livePrice: 0, previousClose: 0, dailyChange: 0, dailyChangePercent: 0, currentValue: 0, annualReturn: 10, lastUpdated: null },
      { id: crypto.randomUUID(), fundId: taxableId, ticker: "AVUV", name: "U.S. Small-Cap Value", shares: 0, targetPercent: 15, livePrice: 0, previousClose: 0, dailyChange: 0, dailyChangePercent: 0, currentValue: 0, annualReturn: 9, lastUpdated: null },
    ],
    settings: {
      projectionYears: 10,
      backupFrequencyDays: 30,
      lastBackupDate: null,
      marketDataProvider: "finnhub",
      finnhubApiKey: "",
      inflationRate: 3,
      baseYear: new Date().getFullYear(),
      projectIraLimitGrowth: false,
    },
  };
}

export const defaultState = makeFreshDefaultState();
