import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Wallet,
  TrendingUp,
  Landmark,
  Building2,
  BriefcaseBusiness,
  PiggyBank,
  Target,
  Trash2,
  Edit3,
  Save,
  ArrowUpRight,
  DollarSign,
  BarChart3,
  Sparkles,
  Download,
  Upload,
  Search,
  CalendarDays,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  History,
  Bell,
  CheckCircle2,
  RefreshCcw,
  TrendingUpIcon,
  Eye,
  CreditCard,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

const STORAGE_KEY = "dhruv-investment-savings-tracker-v5-linked-portfolios";
const portfolioCategories = ["brokerage", "roth"];

const fundIcons = {
  brokerage: TrendingUp,
  roth: Landmark,
  savings: PiggyBank,
  realEstate: Building2,
  business: BriefcaseBusiness,
  custom: Wallet,
};

const categoryLabels = {
  brokerage: "Brokerage",
  roth: "Roth IRA",
  savings: "Savings",
  realEstate: "Real Estate",
  business: "Business Acquisition",
  custom: "Custom Fund",
};

const debtTypeLabels = {
  creditCard: "Credit Card",
  studentLoan: "Student Loan",
  autoLoan: "Auto Loan",
  personalLoan: "Personal Loan",
  mortgage: "Mortgage",
  other: "Other Debt",
};

const chartColors = ["#34d399", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185", "#22c55e", "#60a5fa", "#f97316"];
const tooltipStyle = { background: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "#f8fafc" };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(dateString = todayISO()) {
  return dateString.slice(0, 7);
}

function currency(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

function signedCurrency(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const sign = safe < 0 ? "-" : "";
  return `${sign}${currency(Math.abs(safe))}`;
}

function percent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;
}

function clampNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

function daysSince(date) {
  if (!date) return Infinity;
  const then = new Date(`${date}T00:00:00`);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function isPortfolioFund(fund) {
  return portfolioCategories.includes(fund.category);
}

function getFundPortfolioValue(fundId, etfs) {
  return etfs
    .filter((etf) => etf.fundId === fundId)
    .reduce((sum, etf) => sum + clampNumber(etf.currentValue), 0);
}

function getFundHoldingsCount(fundId, etfs) {
  return etfs.filter((etf) => etf.fundId === fundId).length;
}

function getEffectiveFundValue(fund, etfs) {
  if (!isPortfolioFund(fund)) return clampNumber(fund.current);
  const portfolioValue = getFundPortfolioValue(fund.id, etfs);
  return portfolioValue > 0 ? portfolioValue : clampNumber(fund.current);
}

function monthsToTarget(fund) {
  const remaining = Math.max(0, clampNumber(fund.target) - clampNumber(fund.current));
  if (remaining === 0) return 0;
  if (!clampNumber(fund.monthlyContribution)) return Infinity;
  return Math.ceil(remaining / clampNumber(fund.monthlyContribution));
}

function debtRisk(apr) {
  const rate = clampNumber(apr);
  if (rate >= 20) return { label: "Emergency debt", className: "text-red-300", note: "Usually prioritize aggressively." };
  if (rate >= 10) return { label: "Very high APR", className: "text-orange-300", note: "Strong payoff priority." };
  if (rate >= 7) return { label: "High APR", className: "text-amber-300", note: "Consider extra payments." };
  if (rate >= 4) return { label: "Moderate APR", className: "text-sky-300", note: "Balanced approach." };
  return { label: "Low APR", className: "text-emerald-300", note: "Minimums may be reasonable." };
}

function estimateDebtPayoff(debt) {
  let balance = clampNumber(debt.currentBalance);
  const monthlyPayment = clampNumber(debt.minimumPayment) + clampNumber(debt.extraPayment);
  const monthlyRate = clampNumber(debt.apr) / 100 / 12;
  let months = 0;
  let totalInterest = 0;
  if (balance <= 0) return { months: 0, totalInterest: 0, payoffBalance: 0 };
  if (monthlyPayment <= balance * monthlyRate && monthlyRate > 0) return { months: Infinity, totalInterest: Infinity, payoffBalance: balance };
  while (balance > 0.01 && months < 1200) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = Math.max(0, balance + interest - monthlyPayment);
    months += 1;
  }
  return { months: balance <= 0.01 ? months : Infinity, totalInterest, payoffBalance: balance };
}

function projectNormalFunds(funds, years) {
  const fundBalances = funds.map((fund) => ({
    id: fund.id,
    name: fund.name,
    balance: clampNumber(fund.current),
    monthlyContribution: clampNumber(fund.monthlyContribution),
    monthlyRate: Math.pow(1 + clampNumber(fund.annualReturn) / 100, 1 / 12) - 1,
  }));
  const rows = [];
  const totalMonths = Math.max(12, Math.round(years * 12));
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
      fundBalances.forEach((fund) => {
        fund.balance = fund.balance * (1 + fund.monthlyRate) + fund.monthlyContribution;
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

function projectDebt(debts, years) {
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

function projectAssetsWithLinkedPortfolios(funds, etfs, years) {
  const totalMonths = Math.max(12, Math.round(years * 12));
  const normalFundModels = funds
    .filter((fund) => !isPortfolioFund(fund) || getFundPortfolioValue(fund.id, etfs) === 0)
    .map((fund) => ({
      id: fund.id,
      name: fund.name,
      balance: clampNumber(fund.current),
      monthlyContribution: clampNumber(fund.monthlyContribution),
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
        id: fund.id,
        name: fund.name,
        holdings: holdings.map((etf) => {
          const allocationWeight = hasValidTargets
            ? clampNumber(etf.targetPercent) / targetTotal
            : equalWeight;
  
          return {
            ticker: etf.ticker,
            balance: clampNumber(etf.currentValue),
            monthlyContribution:
              clampNumber(fund.monthlyContribution) * allocationWeight,
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
        fund.balance = fund.balance * (1 + fund.monthlyRate) + fund.monthlyContribution;
      });
      portfolioModels.forEach((portfolio) => {
        portfolio.holdings.forEach((holding) => {
          holding.balance = holding.balance * (1 + holding.monthlyRate) + holding.monthlyContribution;
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

function emptyFund() {
  return { name: "", category: "custom", current: "", target: "", monthlyContribution: "", annualReturn: "7", notes: "" };
}

function emptyDebt() {
  return { name: "", type: "other", currentBalance: "", originalBalance: "", apr: "", minimumPayment: "", extraPayment: "0", dueDay: "", notes: "", status: "active" };
}

function emptyTransaction() {
  return { fundId: "", type: "contribution", amount: "", date: todayISO(), note: "" };
}

function emptyDebtTransaction() {
  return { debtId: "", amount: "", date: todayISO(), note: "" };
}

function emptyEtf() {
  return { ticker: "", name: "", shares: "", targetPercent: "", livePrice: "", previousClose: "", dailyChange: "", dailyChangePercent: "", currentValue: "", annualReturn: "8", lastUpdated: null };
}

function sanitizeFund(fund) {
  return {
    ...fund,
    name: fund.name.trim(),
    current: clampNumber(fund.current),
    target: clampNumber(fund.target),
    monthlyContribution: clampNumber(fund.monthlyContribution),
    annualReturn: clampNumber(fund.annualReturn),
    notes: fund.notes?.trim() || "",
  };
}

function sanitizeDebt(debt) {
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

function makeFreshDefaultState() {
  const taxableId = crypto.randomUUID();
  const rothId = crypto.randomUUID();
  return {
    funds: [
      { id: taxableId, name: "Taxable Brokerage", category: "brokerage", current: 0, target: 25000, monthlyContribution: 500, annualReturn: 9, notes: "Taxable ETF portfolio. Click View Portfolio to manage holdings." },
      { id: rothId, name: "Roth IRA", category: "roth", current: 0, target: 100000, monthlyContribution: 625, annualReturn: 8, notes: "Tax-advantaged ETF portfolio. Click View Portfolio to manage holdings." },
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
    },
  };
}

const defaultState = makeFreshDefaultState();

function App() {
  const [data, setData] = useState(defaultState);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedPortfolioFundId, setSelectedPortfolioFundId] = useState(null);
  const [isAddFundOpen, setIsAddFundOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isEtfOpen, setIsEtfOpen] = useState(false);
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isDebtPaymentOpen, setIsDebtPaymentOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [editingDebt, setEditingDebt] = useState(null);
  const [newFund, setNewFund] = useState(emptyFund());
  const [newDebt, setNewDebt] = useState(emptyDebt());
  const [newTransaction, setNewTransaction] = useState(emptyTransaction());
  const [newDebtTransaction, setNewDebtTransaction] = useState(emptyDebtTransaction());
  const [newEtf, setNewEtf] = useState(emptyEtf());

  const { funds, debts, transactions, debtTransactions, snapshots, etfs, settings } = data;

  const portfolioFunds = useMemo(() => funds.filter((fund) => isPortfolioFund(fund)), [funds]);
  const activePortfolioFundId = selectedPortfolioFundId || portfolioFunds[0]?.id || null;
  const activePortfolioFund = portfolioFunds.find((fund) => fund.id === activePortfolioFundId) || null;

  const effectiveFunds = useMemo(() => {
    return funds.map((fund) => ({ ...fund, current: getEffectiveFundValue(fund, etfs) }));
  }, [funds, etfs]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.funds) {
          const normalizedFunds = parsed.funds.map((fund) => ({ annualReturn: 7, ...fund }));
          const firstPortfolioFundId = normalizedFunds.find((fund) => isPortfolioFund(fund))?.id || "";
          const normalizedEtfs = (parsed.etfs || defaultState.etfs).map((etf) => ({
            shares: 0,
            livePrice: 0,
            previousClose: 0,
            dailyChange: 0,
            dailyChangePercent: 0,
            annualReturn: 8,
            lastUpdated: null,
            ...etf,
            fundId: etf.fundId || firstPortfolioFundId,
          }));
          setData({
            ...defaultState,
            ...parsed,
            funds: normalizedFunds,
            etfs: normalizedEtfs,
            debts: parsed.debts || [],
            debtTransactions: parsed.debtTransactions || [],
            settings: { ...defaultState.settings, ...parsed.settings },
          });
        }
      } catch (error) {
        console.error("Failed to load local tracker data", error);
      }
    }
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hasLoaded]);

  const openPortfolioForFund = (fundId) => {
    setSelectedPortfolioFundId(fundId);
    setActiveView("etfs");
  };

  const assetTotals = useMemo(() => {
    const totalCurrent = effectiveFunds.reduce((sum, fund) => sum + clampNumber(fund.current), 0);
    const totalTarget = effectiveFunds.reduce((sum, fund) => sum + clampNumber(fund.target), 0);
    const totalMonthly = effectiveFunds.reduce((sum, fund) => sum + clampNumber(fund.monthlyContribution), 0);
    const progress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    return { totalCurrent, totalTarget, totalMonthly, progress };
  }, [effectiveFunds]);

  const debtTotals = useMemo(() => {
    const activeDebts = debts.filter((debt) => debt.status !== "paidOff");
    const totalDebt = activeDebts.reduce((sum, debt) => sum + clampNumber(debt.currentBalance), 0);
    const originalDebt = activeDebts.reduce((sum, debt) => sum + clampNumber(debt.originalBalance || debt.currentBalance), 0);
    const monthlyDebtPayment = activeDebts.reduce((sum, debt) => sum + clampNumber(debt.minimumPayment) + clampNumber(debt.extraPayment), 0);
    const weightedApr = totalDebt > 0 ? activeDebts.reduce((sum, debt) => sum + clampNumber(debt.currentBalance) * clampNumber(debt.apr), 0) / totalDebt : 0;
    const payoffProgress = originalDebt > 0 ? ((originalDebt - totalDebt) / originalDebt) * 100 : 0;
    return { totalDebt, originalDebt, monthlyDebtPayment, weightedApr, payoffProgress };
  }, [debts]);

  const netWorth = assetTotals.totalCurrent - debtTotals.totalDebt;
  const debtToAssets = assetTotals.totalCurrent > 0 ? (debtTotals.totalDebt / assetTotals.totalCurrent) * 100 : debtTotals.totalDebt > 0 ? Infinity : 0;

  const filteredFunds = useMemo(() => {
    return effectiveFunds.filter((fund) => {
      const matchesQuery = `${fund.name} ${fund.notes}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "all" || fund.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [effectiveFunds, query, categoryFilter]);

  const allocationData = useMemo(() => effectiveFunds.filter((fund) => clampNumber(fund.current) > 0).map((fund) => ({ name: fund.name, value: clampNumber(fund.current) })), [effectiveFunds]);
  const debtAllocationData = useMemo(() => debts.filter((debt) => clampNumber(debt.currentBalance) > 0).map((debt) => ({ name: debt.name, value: clampNumber(debt.currentBalance) })), [debts]);
  const fundProgressData = useMemo(() => effectiveFunds.map((fund) => ({ name: fund.name.length > 14 ? `${fund.name.slice(0, 14)}...` : fund.name, Current: clampNumber(fund.current), Target: clampNumber(fund.target) })), [effectiveFunds]);

  const currentMonthContributionData = useMemo(() => {
    const currentMonth = monthKey();
    return effectiveFunds.map((fund) => {
      const actual = transactions.filter((tx) => tx.fundId === fund.id && tx.type === "contribution" && monthKey(tx.date) === currentMonth).reduce((sum, tx) => sum + clampNumber(tx.amount), 0);
      return { name: fund.name.length > 14 ? `${fund.name.slice(0, 14)}...` : fund.name, Planned: clampNumber(fund.monthlyContribution), Actual: actual };
    });
  }, [effectiveFunds, transactions]);

  const netWorthData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const withCurrent = [...sorted, { id: "current", date: todayISO(), total: assetTotals.totalCurrent, debt: debtTotals.totalDebt, netWorth }];
    return withCurrent.map((snap) => ({ date: snap.date.slice(5), Assets: clampNumber(snap.total), Debt: clampNumber(snap.debt), "Net Worth": typeof snap.netWorth === "number" ? snap.netWorth : clampNumber(snap.total) - clampNumber(snap.debt) }));
  }, [snapshots, assetTotals.totalCurrent, debtTotals.totalDebt, netWorth]);

  const projectionData = useMemo(() => {
    const years = Math.max(1, clampNumber(settings.projectionYears));
    const fundRows = projectAssetsWithLinkedPortfolios(funds, etfs, years);
    const debtRows = projectDebt(debts, years);
    return fundRows.map((row, index) => {
      const debt = debtRows[index]?.ProjectedDebt || 0;
      return { ...row, ProjectedDebt: debt, ProjectedNetWorth: row.ProjectedAssets - debt };
    });
  }, [funds, etfs, debts, settings.projectionYears]);

  const milestoneData = useMemo(() => {
    const milestones = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    return milestones.map((target) => {
      const years = 50;
      const fundRows = projectAssetsWithLinkedPortfolios(funds, etfs, years);
      const debtRows = projectDebt(debts, years);
      const rows = fundRows.map((row, i) => ({ monthApprox: row.month, netWorth: row.ProjectedAssets - (debtRows[i]?.ProjectedDebt || 0) }));
      const hit = rows.find((row) => row.netWorth >= target);
      return { target, months: hit ? hit.monthApprox : Infinity };
    });
  }, [funds, etfs, debts]);

  const stockProjectionData = useMemo(() => {
    const years = Math.max(1, clampNumber(settings.projectionYears));
    if (!activePortfolioFundId) return [];
    const portfolioEtfs = etfs.filter((etf) => etf.fundId === activePortfolioFundId);
    const totalTarget = portfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.targetPercent), 0) || 100;
    const parentFund = funds.find((fund) => fund.id === activePortfolioFundId);
    const monthlyStockContribution = clampNumber(parentFund?.monthlyContribution);
    const balances = portfolioEtfs.map((etf) => ({
      ticker: etf.ticker,
      balance: clampNumber(etf.currentValue),
      monthlyContribution: monthlyStockContribution * (clampNumber(etf.targetPercent) / totalTarget),
      monthlyRate: Math.pow(1 + clampNumber(etf.annualReturn) / 100, 1 / 12) - 1,
    }));
    const rows = [];
    const totalMonths = Math.max(12, years * 12);
    for (let month = 0; month <= totalMonths; month++) {
      if (month > 0) {
        balances.forEach((etf) => {
          etf.balance = etf.balance * (1 + etf.monthlyRate) + etf.monthlyContribution;
        });
      }
      const yearElapsed = month / 12;
      const row = { month, year: `Y${yearElapsed.toFixed(month % 12 === 0 ? 0 : 1)}` };
      balances.forEach((etf) => {
        row[etf.ticker] = Math.round(etf.balance);
      });
      row.StockPortfolio = Math.round(balances.reduce((sum, etf) => sum + etf.balance, 0));
      rows.push(row);
    }
    return rows;
  }, [etfs, funds, activePortfolioFundId, settings.projectionYears]);

  const realWealthData = useMemo(() => {
    return projectionData.map((row) => {
      const yearElapsed = Number(String(row.year).replace("Y", "")) || 0;
      const realNetWorth = row.ProjectedNetWorth / Math.pow(1 + clampNumber(settings.inflationRate) / 100, yearElapsed);
      return { ...row, RealNetWorth: Math.round(realNetWorth), InflationDrag: Math.round(row.ProjectedNetWorth - realNetWorth) };
    });
  }, [projectionData, settings.inflationRate]);

  const activePortfolioEtfs = etfs.filter((etf) => etf.fundId === activePortfolioFundId);
  const etfTargetTotal = activePortfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.targetPercent), 0);
  const etfValueTotal = activePortfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.currentValue), 0);
  const backupDue = daysSince(settings.lastBackupDate) >= clampNumber(settings.backupFrequencyDays);

  const addFund = () => {
    if (!newFund.name.trim()) return;
    setData((prev) => ({ ...prev, funds: [...prev.funds, sanitizeFund({ ...newFund, id: crypto.randomUUID() })] }));
    setNewFund(emptyFund());
    setIsAddFundOpen(false);
  };

  const updateFund = () => {
    if (!editingFund?.name?.trim()) return;
    setData((prev) => ({ ...prev, funds: prev.funds.map((fund) => (fund.id === editingFund.id ? sanitizeFund(editingFund) : fund)) }));
    setEditingFund(null);
  };

  const deleteFund = (id) => {
    setData((prev) => ({ ...prev, funds: prev.funds.filter((fund) => fund.id !== id), etfs: prev.etfs.filter((etf) => etf.fundId !== id), transactions: prev.transactions.filter((tx) => tx.fundId !== id) }));
  };

  const addDebt = () => {
    if (!newDebt.name.trim()) return;
    setData((prev) => ({ ...prev, debts: [...prev.debts, sanitizeDebt({ ...newDebt, id: crypto.randomUUID() })] }));
    setNewDebt(emptyDebt());
    setIsAddDebtOpen(false);
  };

  const updateDebt = () => {
    if (!editingDebt?.name?.trim()) return;
    setData((prev) => ({ ...prev, debts: prev.debts.map((debt) => (debt.id === editingDebt.id ? sanitizeDebt(editingDebt) : debt)) }));
    setEditingDebt(null);
  };

  const deleteDebt = (id) => setData((prev) => ({ ...prev, debts: prev.debts.filter((debt) => debt.id !== id), debtTransactions: prev.debtTransactions.filter((tx) => tx.debtId !== id) }));

  const addDebtPayment = () => {
    if (!newDebtTransaction.debtId || !newDebtTransaction.amount) return;
    const tx = { ...newDebtTransaction, id: crypto.randomUUID(), amount: clampNumber(newDebtTransaction.amount), date: newDebtTransaction.date || todayISO(), note: newDebtTransaction.note?.trim() || "" };
    setData((prev) => ({
      ...prev,
      debtTransactions: [tx, ...prev.debtTransactions],
      debts: prev.debts.map((debt) => debt.id === tx.debtId ? { ...debt, currentBalance: Math.max(0, clampNumber(debt.currentBalance) - tx.amount), status: Math.max(0, clampNumber(debt.currentBalance) - tx.amount) === 0 ? "paidOff" : debt.status } : debt),
    }));
    setNewDebtTransaction(emptyDebtTransaction());
    setIsDebtPaymentOpen(false);
  };

  const quickDebtPayment = (debt) => {
    const amount = clampNumber(debt.minimumPayment) + clampNumber(debt.extraPayment);
    if (!amount) return;
    const tx = { id: crypto.randomUUID(), debtId: debt.id, amount, date: todayISO(), note: `Paid scheduled amount toward ${debt.name}` };
    setData((prev) => ({
      ...prev,
      debtTransactions: [tx, ...prev.debtTransactions],
      debts: prev.debts.map((item) => item.id === debt.id ? { ...item, currentBalance: Math.max(0, clampNumber(item.currentBalance) - amount), status: Math.max(0, clampNumber(item.currentBalance) - amount) === 0 ? "paidOff" : item.status } : item),
    }));
  };

  const addTransaction = () => {
    if (!newTransaction.fundId || !newTransaction.amount) return;
    const tx = { ...newTransaction, id: crypto.randomUUID(), amount: clampNumber(newTransaction.amount), date: newTransaction.date || todayISO(), note: newTransaction.note?.trim() || "" };
    setData((prev) => ({
      ...prev,
      transactions: [tx, ...prev.transactions],
      funds: prev.funds.map((fund) => {
        if (fund.id !== tx.fundId) return fund;
        const sign = tx.type === "withdrawal" || tx.type === "loss" ? -1 : 1;
        return { ...fund, current: Math.max(0, clampNumber(fund.current) + sign * tx.amount) };
      }),
    }));
    setNewTransaction(emptyTransaction());
    setIsAddTxOpen(false);
  };

  const quickContribution = (fund) => {
    const amount = clampNumber(fund.monthlyContribution);
    if (!amount) return;
    const parentFund = funds.find((item) => item.id === fund.id) || fund;
    const portfolioEtfs = etfs.filter((etf) => etf.fundId === fund.id);
    const canAutoAllocate = isPortfolioFund(parentFund) && portfolioEtfs.length > 0 && portfolioEtfs.some((etf) => clampNumber(etf.livePrice) > 0);
    const tx = { id: crypto.randomUUID(), fundId: fund.id, type: "contribution", amount, date: todayISO(), note: `Added planned monthly contribution to ${fund.name}` };
    if (canAutoAllocate) {
      const totalTarget = portfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.targetPercent), 0) || 100;
      setData((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
        etfs: prev.etfs.map((etf) => {
          if (etf.fundId !== fund.id) return etf;
          const price = clampNumber(etf.livePrice);
          if (price <= 0) return etf;
          const contributionForEtf = amount * (clampNumber(etf.targetPercent) / totalTarget);
          const addedShares = contributionForEtf / price;
          const shares = clampNumber(etf.shares) + addedShares;
          return { ...etf, shares, currentValue: shares * price };
        }),
      }));
      return;
    }
    setData((prev) => ({ ...prev, transactions: [tx, ...prev.transactions], funds: prev.funds.map((item) => (item.id === fund.id ? { ...item, current: clampNumber(item.current) + amount } : item)) }));
  };

  const saveSnapshot = () => {
    const snap = { id: crypto.randomUUID(), date: todayISO(), total: assetTotals.totalCurrent, debt: debtTotals.totalDebt, netWorth, funds: effectiveFunds.map((fund) => ({ id: fund.id, name: fund.name, current: fund.current })), debts: debts.map((debt) => ({ id: debt.id, name: debt.name, currentBalance: debt.currentBalance })) };
    setData((prev) => ({ ...prev, snapshots: [snap, ...prev.snapshots.filter((s) => s.date !== snap.date)] }));
  };

  const addEtf = () => {
    if (!newEtf.ticker.trim()) return;
    if (!activePortfolioFundId) {
      alert("Create or select a brokerage/Roth fund before adding ETFs.");
      return;
    }
    const shares = clampNumber(newEtf.shares);
    const livePrice = clampNumber(newEtf.livePrice);
    setData((prev) => ({
      ...prev,
      etfs: [...prev.etfs, { ...newEtf, id: crypto.randomUUID(), fundId: activePortfolioFundId, ticker: newEtf.ticker.toUpperCase().trim(), shares, targetPercent: clampNumber(newEtf.targetPercent), livePrice, previousClose: clampNumber(newEtf.previousClose), dailyChange: clampNumber(newEtf.dailyChange), dailyChangePercent: clampNumber(newEtf.dailyChangePercent), currentValue: shares * livePrice || clampNumber(newEtf.currentValue), annualReturn: clampNumber(newEtf.annualReturn), lastUpdated: null }],
    }));
    setNewEtf(emptyEtf());
    setIsEtfOpen(false);
  };

  const updateEtf = (id, field, value) => {
    setData((prev) => ({
      ...prev,
      etfs: prev.etfs.map((etf) => {
        if (etf.id !== id) return etf;
        const updated = { ...etf, [field]: field === "ticker" ? value.toUpperCase().trim() : value };
        const shares = clampNumber(updated.shares);
        const livePrice = clampNumber(updated.livePrice);
        return { ...updated, currentValue: shares * livePrice };
      }),
    }));
  };

  const deleteEtf = (id) => setData((prev) => ({ ...prev, etfs: prev.etfs.filter((etf) => etf.id !== id) }));

  const refreshEtfPrices = async () => {
    const apiKey = settings.finnhubApiKey?.trim();
    if (!apiKey) {
      alert("Add your Finnhub API key in Settings first.");
      return;
    }
    if (!activePortfolioFundId) {
      alert("Select a portfolio fund first.");
      return;
    }
    const visibleEtfs = etfs.filter((etf) => etf.fundId === activePortfolioFundId);
    if (visibleEtfs.length === 0) {
      alert("This portfolio does not have any ETFs yet.");
      return;
    }
    try {
      const refreshedEtfs = await Promise.all(visibleEtfs.map(async (etf) => {
        const ticker = String(etf.ticker || "").trim().toUpperCase();
        if (!ticker) return etf;
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Finnhub error for ${ticker}:`, response.status, errorText);
          return etf;
        }
        const quote = await response.json();
        const livePrice = clampNumber(quote.c);
        const previousClose = clampNumber(quote.pc);
        const dailyChange = Number.isFinite(Number(quote.d)) ? Number(quote.d) : livePrice - previousClose;
        const dailyChangePercent = Number.isFinite(Number(quote.dp)) ? Number(quote.dp) : previousClose > 0 ? (dailyChange / previousClose) * 100 : 0;
        const shares = clampNumber(etf.shares);
        return { ...etf, ticker, livePrice, previousClose, dailyChange, dailyChangePercent, currentValue: shares * livePrice, lastUpdated: new Date().toISOString() };
      }));
      setData((prev) => ({ ...prev, etfs: prev.etfs.map((etf) => refreshedEtfs.find((item) => item.id === etf.id) || etf) }));
    } catch (error) {
      console.error(error);
      alert("Price refresh failed. Check your Finnhub API key, tickers, internet connection, or rate limits.");
    }
  };

  const exportData = () => {
    const payload = { ...data, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wealth-tracker-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setData((prev) => ({ ...prev, settings: { ...prev.settings, lastBackupDate: todayISO() } }));
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed?.funds) throw new Error("Invalid data");
        const normalizedFunds = parsed.funds.map((fund) => ({ annualReturn: 7, ...fund }));
        const firstPortfolioFundId = normalizedFunds.find((fund) => isPortfolioFund(fund))?.id || "";
        setData({ ...defaultState, ...parsed, funds: normalizedFunds, etfs: (parsed.etfs || []).map((etf) => ({ ...etf, fundId: etf.fundId || firstPortfolioFundId })), debts: parsed.debts || [], debtTransactions: parsed.debtTransactions || [], settings: { ...defaultState.settings, ...parsed.settings } });
      } catch (error) {
        alert("Could not import file. Make sure it is a valid tracker JSON export.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetAll = () => {
    if (confirm("Reset everything to the starter template? This replaces your saved local data.")) setData(makeFreshDefaultState());
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Hero
          isAddFundOpen={isAddFundOpen}
          setIsAddFundOpen={setIsAddFundOpen}
          newFund={newFund}
          setNewFund={setNewFund}
          addFund={addFund}
          isAddTxOpen={isAddTxOpen}
          setIsAddTxOpen={setIsAddTxOpen}
          newTransaction={newTransaction}
          setNewTransaction={setNewTransaction}
          addTransaction={addTransaction}
          funds={effectiveFunds}
          exportData={exportData}
          importData={importData}
        />

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={DollarSign} label="Assets" value={currency(assetTotals.totalCurrent)} sub="Funds and linked portfolios" />
          <StatCard icon={CreditCard} label="Debt" value={currency(debtTotals.totalDebt)} sub={`${debtTotals.weightedApr.toFixed(1)}% weighted APR`} />
          <StatCard icon={Scale} label="Net worth" value={signedCurrency(netWorth)} sub="Assets minus debt" />
          <StatCard icon={ArrowUpRight} label="Monthly investing" value={currency(assetTotals.totalMonthly)} sub="Planned contributions" />
          <StatCard icon={AlertTriangle} label="Debt payments" value={currency(debtTotals.monthlyDebtPayment)} sub="Minimum + extra payments" />
        </section>

        {backupDue && <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Bell className="h-5 w-5" /><p className="text-sm">Backup reminder: export your JSON backup. You can edit the reminder frequency in Settings.</p></div><Button onClick={exportData} className="rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200">Export backup</Button></div></div>}

        <nav className="mt-6 flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur">
          {[
            ["dashboard", "Dashboard", BarChart3],
            ["debt", "Debt", CreditCard],
            ["visuals", "Visuals", Eye],
            ["transactions", "Transactions", History],
            ["snapshots", "Snapshots", CalendarDays],
            ["etfs", "Portfolios", PieChartIcon],
            ["projections", "Projections", LineChartIcon],
            ["realWealth", "Real Wealth", TrendingUpIcon],
            ["settings", "Settings", Save],
          ].map(([key, label, Icon]) => <button key={key} onClick={() => setActiveView(key)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition ${activeView === key ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>

        {activeView === "dashboard" && <DashboardView funds={filteredFunds} allEtfs={etfs} query={query} setQuery={setQuery} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} setEditingFund={setEditingFund} deleteFund={deleteFund} quickContribution={quickContribution} openPortfolioForFund={openPortfolioForFund} />}
        {activeView === "debt" && <DebtView debts={debts} debtTransactions={debtTransactions} debtTotals={debtTotals} debtToAssets={debtToAssets} isAddDebtOpen={isAddDebtOpen} setIsAddDebtOpen={setIsAddDebtOpen} newDebt={newDebt} setNewDebt={setNewDebt} addDebt={addDebt} setEditingDebt={setEditingDebt} deleteDebt={deleteDebt} quickDebtPayment={quickDebtPayment} isDebtPaymentOpen={isDebtPaymentOpen} setIsDebtPaymentOpen={setIsDebtPaymentOpen} newDebtTransaction={newDebtTransaction} setNewDebtTransaction={setNewDebtTransaction} addDebtPayment={addDebtPayment} />}
        {activeView === "visuals" && <VisualsView assetTotals={assetTotals} debtTotals={debtTotals} netWorth={netWorth} debtToAssets={debtToAssets} fundProgressData={fundProgressData} allocationData={allocationData} debtAllocationData={debtAllocationData} currentMonthContributionData={currentMonthContributionData} netWorthData={netWorthData} />}
        {activeView === "transactions" && <TransactionsView transactions={transactions} funds={effectiveFunds} monthlyData={currentMonthContributionData} />}
        {activeView === "snapshots" && <SnapshotsView snapshots={snapshots} netWorthData={netWorthData} onSaveSnapshot={saveSnapshot} />}
        {activeView === "etfs" && <EtfView etfs={etfs} portfolioFunds={portfolioFunds} activePortfolioFundId={activePortfolioFundId} activePortfolioFund={activePortfolioFund} setSelectedPortfolioFundId={setSelectedPortfolioFundId} updateEtf={updateEtf} deleteEtf={deleteEtf} addEtf={addEtf} refreshEtfPrices={refreshEtfPrices} newEtf={newEtf} setNewEtf={setNewEtf} isEtfOpen={isEtfOpen} setIsEtfOpen={setIsEtfOpen} etfTargetTotal={etfTargetTotal} etfValueTotal={etfValueTotal} stockProjectionData={stockProjectionData} />}
        {activeView === "projections" && <ProjectionView projectionData={projectionData} milestoneData={milestoneData} settings={settings} funds={effectiveFunds} setData={setData} />}
        {activeView === "realWealth" && <RealWealthView realWealthData={realWealthData} settings={settings} setData={setData} />}
        {activeView === "settings" && <SettingsView settings={settings} setData={setData} resetAll={resetAll} exportData={exportData} />}
      </div>

      <Dialog open={!!editingFund} onOpenChange={(open) => !open && setEditingFund(null)}>
        <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Edit fund</DialogTitle><DialogDescription className="text-slate-400">Update balance, goal, monthly contribution, annual return, or notes.</DialogDescription></DialogHeader>{editingFund && <FundForm fund={editingFund} setFund={setEditingFund} onSubmit={updateFund} submitLabel="Save Changes" />}</DialogContent>
      </Dialog>
      <Dialog open={!!editingDebt} onOpenChange={(open) => !open && setEditingDebt(null)}>
        <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Edit debt</DialogTitle><DialogDescription className="text-slate-400">Update debt balance, APR, payments, and notes.</DialogDescription></DialogHeader>{editingDebt && <DebtForm debt={editingDebt} setDebt={setEditingDebt} onSubmit={updateDebt} submitLabel="Save Debt" />}</DialogContent>
      </Dialog>
    </main>
  );
}

function Hero(props) {
  return <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:p-8"><div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" /><div className="absolute bottom-[-140px] left-[-140px] h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" /><div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200"><Sparkles className="h-4 w-4" /> Local-first wealth dashboard</div><h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Investment, Savings & Debt Tracker</h1><p className="mt-3 max-w-2xl text-slate-300">Track assets, linked stock portfolios, debt, ETF allocation, transactions, net worth snapshots, and projections.</p></div><div className="flex flex-wrap gap-3"><Dialog open={props.isAddFundOpen} onOpenChange={props.setIsAddFundOpen}><DialogTrigger asChild><Button className="rounded-2xl bg-emerald-400 px-5 text-slate-950 hover:bg-emerald-300"><Plus className="mr-2 h-4 w-4" /> Add Fund</Button></DialogTrigger><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Add a new fund</DialogTitle><DialogDescription className="text-slate-400">Brokerage and Roth funds can have their own ETF portfolios.</DialogDescription></DialogHeader><FundForm fund={props.newFund} setFund={props.setNewFund} onSubmit={props.addFund} submitLabel="Add Fund" /></DialogContent></Dialog><Dialog open={props.isAddTxOpen} onOpenChange={props.setIsAddTxOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"><History className="mr-2 h-4 w-4" /> Add Transaction</Button></DialogTrigger><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Add transaction</DialogTitle><DialogDescription className="text-slate-400">Record contributions, withdrawals, gains, or losses.</DialogDescription></DialogHeader><TransactionForm funds={props.funds} tx={props.newTransaction} setTx={props.setNewTransaction} onSubmit={props.addTransaction} /></DialogContent></Dialog><Button variant="outline" onClick={props.exportData} className="rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"><Download className="mr-2 h-4 w-4" /> Export</Button><Label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"><Upload className="mr-2 h-4 w-4" /> Import<input type="file" accept="application/json" className="hidden" onChange={props.importData} /></Label></div></div></motion.section>;
}

function DashboardView({ funds, allEtfs, query, setQuery, categoryFilter, setCategoryFilter, setEditingFund, deleteFund, quickContribution, openPortfolioForFund }) {
  return <section className="mt-6"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="text-xl">Your Funds</CardTitle><p className="mt-1 text-sm text-slate-400">Brokerage and Roth funds can open into their own ETF portfolio.</p></div><div className="flex flex-col gap-3 sm:flex-row"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search funds..." className="h-11 rounded-2xl border-white/10 bg-slate-950/60 pl-9 text-slate-100 placeholder:text-slate-500" /></div><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-11 w-full rounded-2xl border-white/10 bg-slate-950/60 text-slate-100 sm:w-48"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100"><SelectItem value="all">All categories</SelectItem>{Object.entries(categoryLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent><div className="grid gap-4">{funds.map((fund, index) => <FundCard key={fund.id} fund={fund} allEtfs={allEtfs} index={index} onEdit={() => setEditingFund(fund)} onDelete={() => deleteFund(fund.id)} onQuickContribution={() => quickContribution(fund)} onOpenPortfolio={() => openPortfolioForFund(fund.id)} />)}{funds.length === 0 && <EmptyChart text="No funds match your search." />}</div></CardContent></Card></section>;
}

function FundCard({ fund, allEtfs, index, onEdit, onDelete, onQuickContribution, onOpenPortfolio }) {
  const Icon = fundIcons[fund.category] || Wallet;
  const progress = fund.target > 0 ? (fund.current / fund.target) * 100 : 0;
  const months = monthsToTarget(fund);
  const canHavePortfolio = isPortfolioFund(fund);
  const holdingsCount = getFundHoldingsCount(fund.id, allEtfs);
  const portfolioValue = getFundPortfolioValue(fund.id, allEtfs);
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.03 }} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-lg"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20 text-emerald-200"><Icon className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{fund.name}</h3><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">{categoryLabels[fund.category] || "Custom Fund"}</span>{canHavePortfolio && <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-300">{holdingsCount > 0 ? `${holdingsCount} holdings` : "Portfolio not set up"}</span>}</div><p className="mt-1 max-w-2xl text-sm text-slate-400">{fund.notes || "No notes added yet."}</p></div></div><div className="flex shrink-0 flex-wrap gap-2">{canHavePortfolio && <Button size="sm" onClick={onOpenPortfolio} className="rounded-xl bg-sky-400 text-slate-950 hover:bg-sky-300"><PieChartIcon className="mr-1.5 h-4 w-4" />{holdingsCount > 0 ? "View Portfolio" : "Set Up Portfolio"}</Button>}<Button size="sm" onClick={onQuickContribution} className="rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="mr-1.5 h-4 w-4" />Add Monthly</Button><Button size="sm" variant="outline" onClick={onEdit} className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"><Edit3 className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={onDelete} className="rounded-xl border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20"><Trash2 className="h-4 w-4" /></Button></div></div><div className="mt-5 grid gap-3 md:grid-cols-5"><MiniMetric label="Current" value={currency(fund.current)} /><MiniMetric label="Target" value={currency(fund.target)} /><MiniMetric label="Monthly" value={currency(fund.monthlyContribution)} /><MiniMetric label="Annual return" value={`${clampNumber(fund.annualReturn).toFixed(1)}%`} /><MiniMetric label="ETA" value={months === Infinity ? "No plan" : months === 0 ? "Done" : `${months} mo`} /></div>{canHavePortfolio && <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-100"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><span>Portfolio value: <b>{portfolioValue > 0 ? currency(portfolioValue) : "Not set up"}</b></span><span className="text-sky-100/70">This value rolls into total assets and net worth.</span></div></div>}<ProgressBar progress={progress} /></motion.div>;
}

function EtfView({ etfs, portfolioFunds, activePortfolioFundId, activePortfolioFund, setSelectedPortfolioFundId, updateEtf, deleteEtf, addEtf, refreshEtfPrices, newEtf, setNewEtf, isEtfOpen, setIsEtfOpen, etfTargetTotal, stockProjectionData }) {
  const [editingEtfId, setEditingEtfId] = useState(null);
  const portfolioEtfs = etfs.filter((etf) => etf.fundId === activePortfolioFundId);
  const etfPie = portfolioEtfs.filter((etf) => clampNumber(etf.currentValue) > 0).map((etf) => ({ name: etf.ticker, value: clampNumber(etf.currentValue) }));
  const totalValue = portfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.currentValue), 0);
  const totalDailyChange = portfolioEtfs.reduce((sum, etf) => sum + clampNumber(etf.dailyChange) * clampNumber(etf.shares), 0);
  const latestUpdate = portfolioEtfs.map((etf) => etf.lastUpdated).filter(Boolean).sort().at(-1);
  const projectionKeys = ["StockPortfolio", ...portfolioEtfs.map((etf) => etf.ticker)];
  const rebalanceRows = portfolioEtfs.map((etf) => {
    const currentValue = clampNumber(etf.currentValue);
    const targetValue = totalValue * (clampNumber(etf.targetPercent) / 100);
    const difference = targetValue - currentValue;
    const actualPercent = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    return { ...etf, actualPercent, targetValue, difference };
  }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  const underweightEtfs = rebalanceRows.filter((etf) => etf.difference > 1);
  const overweightEtfs = rebalanceRows.filter((etf) => etf.difference < -1);
  const getStatus = (actualPercent, targetPercent) => {
    const diff = actualPercent - targetPercent;
    if (Math.abs(diff) <= 2) return { label: "On Target", className: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" };
    if (diff < -2) return { label: "Buy More", className: "bg-sky-400/10 text-sky-300 border-sky-400/20" };
    return { label: "Overweight", className: "bg-amber-400/10 text-amber-300 border-amber-400/20" };
  };
  if (portfolioFunds.length === 0) return <section className="mt-6"><EmptyChart text="Create a Brokerage or Roth IRA fund first, then you can set up a portfolio." /></section>;
  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-2xl">{activePortfolioFund ? `${activePortfolioFund.name} Portfolio` : "Stock Portfolio"}</CardTitle><p className="mt-1 max-w-2xl text-sm text-slate-400">Each brokerage/Roth fund has its own holdings. This portfolio rolls into its parent fund value.</p><div className="mt-4 max-w-sm"><Label className="text-xs text-slate-400">Selected portfolio</Label><Select value={activePortfolioFundId || ""} onValueChange={setSelectedPortfolioFundId}><SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue placeholder="Choose portfolio fund" /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100">{portfolioFunds.map((fund) => <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>)}</SelectContent></Select></div></div><div className="flex flex-wrap gap-2"><Button onClick={refreshEtfPrices} className="rounded-2xl bg-sky-400 text-slate-950 hover:bg-sky-300"><RefreshCcw className="mr-2 h-4 w-4" />Refresh Prices</Button><Dialog open={isEtfOpen} onOpenChange={setIsEtfOpen}><DialogTrigger asChild><Button className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="mr-2 h-4 w-4" />Add ETF</Button></DialogTrigger><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>Add ETF</DialogTitle><DialogDescription className="text-slate-400">Add another ETF to this selected portfolio.</DialogDescription></DialogHeader><EtfForm etf={newEtf} setEtf={setNewEtf} onSubmit={addEtf} /></DialogContent></Dialog></div></CardHeader><CardContent><div className="mb-5 grid gap-3 md:grid-cols-4"><MiniMetric label="Portfolio value" value={currency(totalValue)} /><MiniMetric label="Daily change" value={signedCurrency(totalDailyChange)} /><MiniMetric label="Holdings" value={portfolioEtfs.length} /><MiniMetric label="Last refreshed" value={latestUpdate ? new Date(latestUpdate).toLocaleTimeString() : "Never"} /></div><div className="mb-5 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100"><p className="font-semibold">How to read this</p><p className="mt-1 text-sky-100/80">“Buy More” means the ETF is below your target allocation. “Overweight” means it is above your target. You can usually rebalance by directing future contributions toward underweight ETFs instead of selling.</p></div><div className="grid gap-4">{portfolioEtfs.length === 0 && <EmptyChart text="No ETFs in this portfolio yet. Click Add ETF to start." />}{portfolioEtfs.map((etf) => { const currentValue = clampNumber(etf.currentValue); const actualPercent = totalValue > 0 ? (currentValue / totalValue) * 100 : 0; const targetPercent = clampNumber(etf.targetPercent); const targetValue = totalValue * (targetPercent / 100); const rebalanceDifference = targetValue - currentValue; const status = getStatus(actualPercent, targetPercent); const isEditing = editingEtfId === etf.id; return <div key={etf.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-2xl font-bold">{etf.ticker}</h3><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></div><p className="mt-1 text-slate-400">{etf.name || "Unnamed ETF"}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditingEtfId(isEditing ? null : etf.id)} className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">{isEditing ? "Done" : "Edit"}</Button><Button size="sm" variant="outline" onClick={() => deleteEtf(etf.id)} className="rounded-xl border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20 hover:text-red-100"><Trash2 className="h-4 w-4" /></Button></div></div>{isEditing ? <div className="mt-5 grid gap-4 md:grid-cols-3"><EditEtfInput label="Ticker" value={etf.ticker} onChange={(value) => updateEtf(etf.id, "ticker", value)} /><EditEtfInput label="ETF name" value={etf.name} onChange={(value) => updateEtf(etf.id, "name", value)} /><EditEtfInput label="Shares owned" type="number" value={etf.shares ?? 0} onChange={(value) => updateEtf(etf.id, "shares", value)} /><EditEtfInput label="Target allocation %" type="number" value={etf.targetPercent} onChange={(value) => updateEtf(etf.id, "targetPercent", value)} /><EditEtfInput label="Latest price" type="number" value={etf.livePrice ?? 0} onChange={(value) => updateEtf(etf.id, "livePrice", value)} /><EditEtfInput label="Expected annual return %" type="number" value={etf.annualReturn ?? 8} onChange={(value) => updateEtf(etf.id, "annualReturn", value)} /></div> : <div className="mt-5 grid gap-3 md:grid-cols-4"><MiniMetric label="Current value" value={currency(currentValue)} /><MiniMetric label="Shares" value={Number(clampNumber(etf.shares).toFixed(4))} /><MiniMetric label="Latest price" value={currency(etf.livePrice)} /><MiniMetric label="Daily change" value={`${signedCurrency(clampNumber(etf.dailyChange) * clampNumber(etf.shares))} (${Number(etf.dailyChangePercent || 0).toFixed(2)}%)`} /></div>}<div className="mt-5 grid gap-3 md:grid-cols-3"><MiniMetric label="Current allocation" value={`${actualPercent.toFixed(1)}%`} /><MiniMetric label="Target allocation" value={`${targetPercent.toFixed(1)}%`} /><MiniMetric label="Needed to target" value={signedCurrency(rebalanceDifference)} /></div><ProgressBar progress={targetPercent > 0 ? Math.min(100, (actualPercent / targetPercent) * 100) : 0} label="Allocation progress toward target" /><p className="mt-4 text-xs text-slate-500">Last updated: {etf.lastUpdated ? new Date(etf.lastUpdated).toLocaleString() : "Not refreshed yet"}</p></div>})}</div></CardContent></Card><div className="grid gap-6"><ChartCard title="ETF Current Allocation" subtitle="Your actual ETF allocation by dollar value.">{etfPie.length > 0 ? <PieViz data={etfPie} /> : <EmptyChart text="Enter shares and refresh prices to see your ETF allocation." />}</ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Suggested Next Buys</CardTitle><p className="text-sm text-slate-400">Based on this portfolio’s target allocation.</p></CardHeader><CardContent>{underweightEtfs.length === 0 ? <EmptyChart text="No underweight ETFs right now. Your allocation is close to target." /> : <div className="grid gap-3">{underweightEtfs.map((etf) => <div key={etf.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div><p className="font-semibold">{etf.ticker}</p><p className="text-sm text-slate-400">Add more to move toward target</p></div><p className="font-bold text-emerald-300">{signedCurrency(etf.difference)}</p></div>)}</div>}</CardContent></Card><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Overweight ETFs</CardTitle><p className="text-sm text-slate-400">These are above target. You may direct future contributions elsewhere.</p></CardHeader><CardContent>{overweightEtfs.length === 0 ? <EmptyChart text="No ETFs are meaningfully overweight." /> : <div className="grid gap-3">{overweightEtfs.map((etf) => <div key={etf.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div><p className="font-semibold">{etf.ticker}</p><p className="text-sm text-slate-400">Above target allocation</p></div><p className="font-bold text-red-300">{signedCurrency(etf.difference)}</p></div>)}</div>}</CardContent></Card></div><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur xl:col-span-2"><CardHeader><CardTitle>Portfolio Projection</CardTitle><p className="text-sm text-slate-400">Projects this selected fund’s ETF portfolio using current holdings, target-weighted monthly contributions, and expected ETF returns.</p></CardHeader><CardContent>{stockProjectionData.length > 0 ? <MultiMetricLineViz data={stockProjectionData} keys={projectionKeys} xKey="year" /> : <EmptyChart text="Add ETF holdings to see this portfolio projection." />}</CardContent></Card></section>;
}

function EditEtfInput({ label, value, onChange, type = "text" }) {
  return <div><Label className="text-xs text-slate-400">{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div>;
}

function DebtView({ debts, debtTransactions, debtTotals, debtToAssets, isAddDebtOpen, setIsAddDebtOpen, newDebt, setNewDebt, addDebt, setEditingDebt, deleteDebt, quickDebtPayment, isDebtPaymentOpen, setIsDebtPaymentOpen, newDebtTransaction, setNewDebtTransaction, addDebtPayment }) {
  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Debt & Liabilities</CardTitle><p className="text-sm text-slate-400">Track debt balances, APRs, payments, and payoff timelines.</p></div><div className="flex flex-wrap gap-2"><Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}><DialogTrigger asChild><Button className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="mr-2 h-4 w-4" />Add Debt</Button></DialogTrigger><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Add debt</DialogTitle><DialogDescription className="text-slate-400">Add credit cards, student loans, car loans, or other liabilities.</DialogDescription></DialogHeader><DebtForm debt={newDebt} setDebt={setNewDebt} onSubmit={addDebt} submitLabel="Add Debt" /></DialogContent></Dialog><Dialog open={isDebtPaymentOpen} onOpenChange={setIsDebtPaymentOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"><CreditCard className="mr-2 h-4 w-4" />Add Payment</Button></DialogTrigger><DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>Add debt payment</DialogTitle><DialogDescription className="text-slate-400">Record a payment that lowers a debt balance.</DialogDescription></DialogHeader><DebtPaymentForm debts={debts} tx={newDebtTransaction} setTx={setNewDebtTransaction} onSubmit={addDebtPayment} /></DialogContent></Dialog></div></CardHeader><CardContent><div className="grid gap-4">{debts.length === 0 && <EmptyChart text="No debt added. If you have no debt, that is great — leave this tab empty." />}{debts.map((debt, index) => <DebtCard key={debt.id} debt={debt} index={index} onEdit={() => setEditingDebt(debt)} onDelete={() => deleteDebt(debt.id)} onQuickPayment={() => quickDebtPayment(debt)} />)}</div></CardContent></Card><div className="grid gap-6"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Debt Impact</CardTitle><p className="text-sm text-slate-400">Debt affects both net worth and monthly cash flow.</p></CardHeader><CardContent className="grid gap-3"><MiniMetric label="Total debt" value={currency(debtTotals.totalDebt)} /><MiniMetric label="Monthly payments" value={currency(debtTotals.monthlyDebtPayment)} /><MiniMetric label="Weighted APR" value={`${debtTotals.weightedApr.toFixed(2)}%`} /><MiniMetric label="Debt-to-assets" value={debtToAssets === Infinity ? "∞" : `${debtToAssets.toFixed(1)}%`} /><ProgressBar progress={debtTotals.payoffProgress} label="Debt payoff progress" /></CardContent></Card><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Recent Debt Payments</CardTitle><p className="text-sm text-slate-400">Manual payment history.</p></CardHeader><CardContent><div className="grid max-h-72 gap-3 overflow-auto">{debtTransactions.length === 0 && <EmptyChart text="No debt payments recorded yet." />}{debtTransactions.map((tx) => { const debtName = debts.find((d) => d.id === tx.debtId)?.name || "Deleted debt"; return <div key={tx.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><p className="font-semibold">Paid {currency(tx.amount)} toward {debtName}</p><p className="text-sm text-slate-400">{tx.date}</p>{tx.note && <p className="mt-1 text-sm text-slate-300">{tx.note}</p>}</div>})}</div></CardContent></Card></div></section>;
}

function DebtCard({ debt, index, onEdit, onDelete, onQuickPayment }) {
  const payoff = estimateDebtPayoff(debt);
  const risk = debtRisk(debt.apr);
  const original = clampNumber(debt.originalBalance || debt.currentBalance);
  const progress = original > 0 ? ((original - clampNumber(debt.currentBalance)) / original) * 100 : 0;
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.03 }} className="rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-lg"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-400/10 text-red-200"><CreditCard className="h-6 w-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{debt.name}</h3><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">{debtTypeLabels[debt.type] || "Debt"}</span><span className={`rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs ${risk.className}`}>{risk.label}</span></div><p className="mt-1 max-w-2xl text-sm text-slate-400">{debt.notes || risk.note}</p></div></div><div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" onClick={onQuickPayment} className="rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="mr-1.5 h-4 w-4" />Pay Scheduled</Button><Button size="sm" variant="outline" onClick={onEdit} className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"><Edit3 className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={onDelete} className="rounded-xl border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20"><Trash2 className="h-4 w-4" /></Button></div></div><div className="mt-5 grid gap-3 md:grid-cols-5"><MiniMetric label="Balance" value={currency(debt.currentBalance)} /><MiniMetric label="APR" value={`${clampNumber(debt.apr).toFixed(2)}%`} /><MiniMetric label="Payment" value={currency(clampNumber(debt.minimumPayment) + clampNumber(debt.extraPayment))} /><MiniMetric label="Payoff" value={payoff.months === Infinity ? "Never" : payoff.months === 0 ? "Paid" : `${payoff.months} mo`} /><MiniMetric label="Interest left" value={payoff.totalInterest === Infinity ? "∞" : currency(payoff.totalInterest)} /></div><ProgressBar progress={progress} label="Debt paid off" /></motion.div>;
}

function VisualsView({ assetTotals, debtTotals, netWorth, fundProgressData, allocationData, debtAllocationData, currentMonthContributionData, netWorthData }) {
  const balanceSheet = [{ name: "Now", Assets: assetTotals.totalCurrent, Debt: debtTotals.totalDebt, "Net Worth": netWorth }];
  return <section className="mt-6 grid gap-6 xl:grid-cols-2"><ChartCard title="Balance Sheet View" subtitle="Assets, debt, and net worth in one view."><BarViz data={balanceSheet} first="Assets" second="Debt" third="Net Worth" /></ChartCard><ChartCard title="Overall Asset Progress" subtitle="Combined progress toward all asset targets."><div className="mb-5"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-400">Progress</span><span className="font-semibold text-emerald-300">{percent(assetTotals.progress)}</span></div><div className="h-4 overflow-hidden rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, assetTotals.progress)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" /></div></div><BarViz data={fundProgressData} first="Target" second="Current" /></ChartCard><ChartCard title="Current Asset Allocation" subtitle="Where your tracked money sits.">{allocationData.length > 0 ? <PieViz data={allocationData} /> : <EmptyChart text="Add balances to see your allocation chart." />}</ChartCard><ChartCard title="Debt Allocation" subtitle="Which liabilities make up your total debt.">{debtAllocationData.length > 0 ? <PieViz data={debtAllocationData} /> : <EmptyChart text="Add debt to see your debt allocation." />}</ChartCard><ChartCard title="Monthly Planned vs Actual" subtitle="This month’s contributions compared to your monthly plan."><BarViz data={currentMonthContributionData} first="Planned" second="Actual" /></ChartCard><ChartCard title="Net Worth Over Time" subtitle="Snapshot-based trend line including debt.">{netWorthData.length > 1 ? <MultiMetricLineViz data={netWorthData} keys={["Assets", "Debt", "Net Worth"]} xKey="date" /> : <EmptyChart text="Save snapshots to see your net worth chart." />}</ChartCard></section>;
}

function ProjectionView({ projectionData, milestoneData, settings, funds, setData }) {
  const updateFundReturn = (id, value) => setData((prev) => ({ ...prev, funds: prev.funds.map((fund) => (fund.id === id ? { ...fund, annualReturn: value } : fund)) }));
  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ChartCard title="Growth Projection" subtitle="Portfolio holdings roll up into parent funds, then into total projected net worth."><div className="mb-4 grid gap-3 sm:grid-cols-2"><div><Label>Projection years</Label><Input type="number" value={settings.projectionYears} onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, projectionYears: e.target.value } }))} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">Debt lowers projected net worth. Brokerage/Roth portfolio values are projected from their ETF holdings.</div></div><MultiLineViz data={projectionData} funds={funds} /></ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Fund Return Assumptions</CardTitle><p className="text-sm text-slate-400">For stock portfolios, ETF-level return assumptions are used when holdings exist.</p></CardHeader><CardContent><div className="grid gap-3">{funds.map((fund) => <div key={fund.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{fund.name}</p><p className="text-sm text-slate-400">Current: {currency(fund.current)} • Monthly: {currency(fund.monthlyContribution)}</p></div><div className="w-full sm:w-36"><Label className="text-xs text-slate-400">Annual return %</Label><Input type="number" value={fund.annualReturn} onChange={(e) => updateFundReturn(fund.id, e.target.value)} className="mt-1 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div></div>)}</div></CardContent></Card><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur xl:col-span-2"><CardHeader><CardTitle>Net Worth Milestone Forecast</CardTitle><p className="text-sm text-slate-400">Estimated time to major milestones using assets minus debt.</p></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{milestoneData.map((m) => <div key={m.target} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-400/10 p-2"><TrendingUpIcon className="h-4 w-4 text-emerald-300" /></div><span>{currency(m.target)}</span></div><span className="font-semibold text-emerald-300">{m.months === Infinity ? "600+ mo" : m.months === 0 ? "Reached" : `${m.months} mo`}</span></div>)}</div></CardContent></Card></section>;
}

function RealWealthView({ realWealthData, settings, setData }) {
  const last = realWealthData[realWealthData.length - 1] || {};
  return <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Inflation Assumptions</CardTitle><p className="text-sm text-slate-400">Convert future dollars into today-dollar purchasing power.</p></CardHeader><CardContent className="grid gap-4"><div><Label>Inflation rate assumption (%)</Label><Input type="number" step="0.1" value={settings.inflationRate} onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, inflationRate: e.target.value } }))} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Base year</Label><Input type="number" value={settings.baseYear} onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, baseYear: e.target.value } }))} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><MiniMetric label="Projected nominal net worth" value={currency(last.ProjectedNetWorth)} /><MiniMetric label="Today-dollar value" value={currency(last.RealNetWorth)} /><MiniMetric label="Inflation drag" value={currency(last.InflationDrag)} /></CardContent></Card><ChartCard title="Nominal vs Real Net Worth" subtitle={`Real values are shown in ${settings.baseYear || new Date().getFullYear()} dollars.`}><MultiMetricLineViz data={realWealthData} keys={["ProjectedNetWorth", "RealNetWorth", "InflationDrag"]} xKey="year" /></ChartCard></section>;
}

function TransactionsView({ transactions, funds, monthlyData }) { const fundName = (id) => funds.find((fund) => fund.id === id)?.name || "Deleted fund"; return <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"><ChartCard title="Monthly Planned vs Actual" subtitle="This month’s contributions compared to your monthly plan."><BarViz data={monthlyData} first="Planned" second="Actual" /></ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Transaction History</CardTitle><p className="text-sm text-slate-400">Examples: Added $500 to brokerage, added $625 to Roth IRA, or recorded a withdrawal.</p></CardHeader><CardContent><div className="grid max-h-[520px] gap-3 overflow-auto pr-1">{transactions.length === 0 && <EmptyChart text="No transactions yet. Use Add Transaction or Add Monthly." />}{transactions.map((tx) => <div key={tx.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{tx.type === "withdrawal" || tx.type === "loss" ? "Removed" : "Added"} {currency(tx.amount)} {tx.type !== "withdrawal" && tx.type !== "loss" ? "to" : "from"} {fundName(tx.fundId)}</p><p className="mt-1 text-sm text-slate-400">{tx.date} • {tx.type}</p>{tx.note && <p className="mt-2 text-sm text-slate-300">{tx.note}</p>}</div><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div></div>)}</div></CardContent></Card></section>; }
function SnapshotsView({ snapshots, netWorthData, onSaveSnapshot }) { return <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ChartCard title="Net Worth Over Time" subtitle="Save snapshots monthly to see assets, debt, and net worth.">{netWorthData.length > 1 ? <MultiMetricLineViz data={netWorthData} keys={["Assets", "Debt", "Net Worth"]} xKey="date" /> : <EmptyChart text="Save your first snapshot to start the net worth line chart." />}<Button onClick={onSaveSnapshot} className="mt-4 rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><CalendarDays className="mr-2 h-4 w-4" />Save Today’s Snapshot</Button></ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Saved Snapshots</CardTitle><p className="text-sm text-slate-400">One snapshot per day. Save monthly for a clean long-term chart.</p></CardHeader><CardContent><div className="grid gap-3">{snapshots.length === 0 && <EmptyChart text="No snapshots saved yet." />}{[...snapshots].sort((a,b)=>b.date.localeCompare(a.date)).map((snap) => <div key={snap.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-center justify-between"><span className="text-slate-300">{snap.date}</span><span className="font-bold text-emerald-300">{signedCurrency(snap.netWorth ?? snap.total - (snap.debt || 0))}</span></div><p className="mt-1 text-xs text-slate-500">Assets: {currency(snap.total)} • Debt: {currency(snap.debt || 0)}</p></div>)}</div></CardContent></Card></section>; }
function SettingsView({ settings, setData, resetAll, exportData }) { return <section className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Settings</CardTitle><p className="text-sm text-slate-400">API keys are stored locally in this browser only.</p></CardHeader><CardContent className="grid gap-4"><div><Label>Finnhub API key</Label><Input type="password" value={settings.finnhubApiKey || ""} onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, finnhubApiKey: e.target.value } }))} placeholder="Paste Finnhub API key here" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Backup reminder frequency in days</Label><Input type="number" value={settings.backupFrequencyDays} onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, backupFrequencyDays: e.target.value } }))} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><MiniMetric label="Last backup" value={settings.lastBackupDate || "Never"} /><Button onClick={exportData} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Download className="mr-2 h-4 w-4" />Export JSON Backup</Button></CardContent></Card><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Local Data Controls</CardTitle><p className="text-sm text-slate-400">Useful while developing locally.</p></CardHeader><CardContent className="flex flex-wrap gap-3"><Button variant="outline" onClick={resetAll} className="rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"><RefreshCcw className="mr-2 h-4 w-4" />Reset Starter Template</Button><Button variant="outline" onClick={() => localStorage.removeItem(STORAGE_KEY)} className="rounded-2xl border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20"><Trash2 className="mr-2 h-4 w-4" />Clear Local Save Only</Button></CardContent></Card></section>; }

function StatCard({ icon: Icon, label, value, sub }) { return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}><Card className="rounded-[1.6rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardContent className="p-5"><div className="w-fit rounded-2xl bg-white/10 p-3"><Icon className="h-5 w-5 text-emerald-300" /></div><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-sm text-slate-500">{sub}</p></CardContent></Card></motion.div>; }
function MiniMetric({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-100">{value}</p></div>; }
function ProgressBar({ progress, label = "Progress to target" }) { return <div className="mt-5"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold text-emerald-300">{percent(progress)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }} transition={{ duration: 0.75, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" /></div></div>; }
function ChartCard({ title, subtitle, children }) { return <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle className="text-xl">{title}</CardTitle><p className="text-sm text-slate-400">{subtitle}</p></CardHeader><CardContent>{children}</CardContent></Card>; }
function EmptyChart({ text }) { return <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-slate-400">{text}</div>; }

function BarViz({ data, first, second, third }) { return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 55 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-20} textAnchor="end" interval={0} height={60} /><YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => currency(value)} contentStyle={tooltipStyle} /><Legend verticalAlign="bottom" height={36} /><Bar dataKey={first} radius={[8, 8, 0, 0]} fill="rgba(148,163,184,0.35)" /><Bar dataKey={second} radius={[8, 8, 0, 0]} fill="#34d399" />{third && <Bar dataKey={third} radius={[8, 8, 0, 0]} fill="#38bdf8" />}</BarChart></ResponsiveContainer></div>; }
function PieViz({ data }) { return <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">{data.map((entry, index) => <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value) => currency(value)} contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div>; }
function MultiMetricLineViz({ data, keys, xKey = "year" }) { return <div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey={xKey} tick={{ fill: "#94a3b8", fontSize: 12 }} /><YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => currency(value)} contentStyle={tooltipStyle} /><Legend />{keys.map((key, index) => <Line key={key} type="monotone" dataKey={key} stroke={chartColors[index % chartColors.length]} strokeWidth={key.includes("Net") || key.includes("Portfolio") ? 4 : 2.5} dot={false} />)}</LineChart></ResponsiveContainer></div>; }
function MultiLineViz({ data, funds }) { return <div className="h-[430px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 70 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 12 }} interval="preserveStartEnd" height={55} /><YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => currency(value)} contentStyle={{ ...tooltipStyle, maxHeight: "260px", overflowY: "auto", maxWidth: "280px" }} /><Legend verticalAlign="bottom" align="center" height={48} wrapperStyle={{ paddingTop: "18px", fontSize: "12px" }} /><Line type="monotone" dataKey="ProjectedNetWorth" name="Projected Net Worth" stroke="#34d399" strokeWidth={4} dot={false} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="ProjectedAssets" name="Projected Assets" stroke="#38bdf8" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="ProjectedDebt" name="Projected Debt" stroke="#fb7185" strokeWidth={3} dot={false} />{funds.map((fund, index) => <Line key={fund.id} type="monotone" dataKey={fund.name} stroke={chartColors[(index + 3) % chartColors.length]} strokeWidth={1.5} dot={false} legendType="none" />)}</LineChart></ResponsiveContainer></div>; }

function TransactionForm({ funds, tx, setTx, onSubmit }) { const update = (field, value) => setTx((prev) => ({ ...prev, [field]: value })); return <div className="grid gap-4 pt-2"><div className="grid gap-2"><Label>Fund</Label><Select value={tx.fundId} onValueChange={(value) => update("fundId", value)}><SelectTrigger className="rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue placeholder="Choose fund" /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100">{funds.map((fund) => <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-3"><div><Label>Type</Label><Select value={tx.type} onValueChange={(value) => update("type", value)}><SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100"><SelectItem value="contribution">Contribution</SelectItem><SelectItem value="gain">Gain</SelectItem><SelectItem value="withdrawal">Withdrawal</SelectItem><SelectItem value="loss">Loss</SelectItem></SelectContent></Select></div><div><Label>Amount</Label><Input type="number" value={tx.amount} onChange={(e) => update("amount", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Date</Label><Input type="date" value={tx.date} onChange={(e) => update("date", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div><div><Label>Note</Label><textarea value={tx.note} onChange={(e) => update("note", e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="Added $500 to brokerage on June 1..." /></div><Button onClick={onSubmit} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Save className="mr-2 h-4 w-4" />Save Transaction</Button></div>; }
function DebtPaymentForm({ debts, tx, setTx, onSubmit }) { const update = (field, value) => setTx((prev) => ({ ...prev, [field]: value })); return <div className="grid gap-4 pt-2"><div className="grid gap-2"><Label>Debt</Label><Select value={tx.debtId} onValueChange={(value) => update("debtId", value)}><SelectTrigger className="rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue placeholder="Choose debt" /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100">{debts.map((debt) => <SelectItem key={debt.id} value={debt.id}>{debt.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Amount</Label><Input type="number" value={tx.amount} onChange={(e) => update("amount", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Date</Label><Input type="date" value={tx.date} onChange={(e) => update("date", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div><div><Label>Note</Label><textarea value={tx.note} onChange={(e) => update("note", e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="Paid $200 toward student loan..." /></div><Button onClick={onSubmit} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Save className="mr-2 h-4 w-4" />Save Payment</Button></div>; }
function DebtForm({ debt, setDebt, onSubmit, submitLabel }) { const update = (field, value) => setDebt((prev) => ({ ...prev, [field]: value })); return <div className="grid gap-4 pt-2"><div><Label>Debt name</Label><Input value={debt.name} onChange={(e) => update("name", e.target.value)} placeholder="Example: Student Loan" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Debt type</Label><Select value={debt.type} onValueChange={(value) => update("type", value)}><SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100">{Object.entries(debtTypeLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-3"><div><Label>Current balance</Label><Input type="number" value={debt.currentBalance} onChange={(e) => update("currentBalance", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Original balance</Label><Input type="number" value={debt.originalBalance} onChange={(e) => update("originalBalance", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>APR %</Label><Input type="number" step="0.01" value={debt.apr} onChange={(e) => update("apr", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div><div className="grid gap-4 sm:grid-cols-3"><div><Label>Minimum payment</Label><Input type="number" value={debt.minimumPayment} onChange={(e) => update("minimumPayment", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Extra payment</Label><Input type="number" value={debt.extraPayment} onChange={(e) => update("extraPayment", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Due day</Label><Input type="number" min="1" max="31" value={debt.dueDay} onChange={(e) => update("dueDay", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div><div><Label>Status</Label><Select value={debt.status} onValueChange={(value) => update("status", value)}><SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100"><SelectItem value="active">Active</SelectItem><SelectItem value="paidOff">Paid Off</SelectItem></SelectContent></Select></div><div><Label>Notes</Label><textarea value={debt.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400/50" placeholder="Federal loan, promo APR, payoff strategy..." /></div><Button onClick={onSubmit} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Save className="mr-2 h-4 w-4" />{submitLabel}</Button></div>; }
function EtfForm({ etf, setEtf, onSubmit }) { const update = (field, value) => setEtf(prev => ({ ...prev, [field]: value })); return <div className="grid gap-4 pt-2"><div><Label>Ticker</Label><Input value={etf.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} placeholder="SCHG" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Name</Label><Input value={etf.name} onChange={(e) => update("name", e.target.value)} placeholder="Large-Cap Growth" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Shares</Label><Input type="number" value={etf.shares} onChange={(e) => update("shares", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Target %</Label><Input type="number" value={etf.targetPercent} onChange={(e) => update("targetPercent", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Manual/latest price</Label><Input type="number" value={etf.livePrice} onChange={(e) => update("livePrice", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><div><Label>Expected annual return %</Label><Input type="number" value={etf.annualReturn} onChange={(e) => update("annualReturn", e.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div></div><Button onClick={onSubmit} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="mr-2 h-4 w-4" />Add ETF</Button></div>; }
function FundForm({ fund, setFund, onSubmit, submitLabel }) { const update = (field, value) => setFund((prev) => ({ ...prev, [field]: value })); return <div className="grid gap-4 pt-2"><div><Label>Fund name</Label><Input value={fund.name} onChange={(e) => update("name", e.target.value)} placeholder="Example: Future Rental Property Fund" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500" /></div><div><Label>Category</Label><Select value={fund.category} onValueChange={(value) => update("category", value)}><SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="border-white/10 bg-slate-950 text-slate-100">{Object.entries(categoryLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-4"><div><Label>Current balance</Label><Input type="number" min="0" value={fund.current} onChange={(e) => update("current", e.target.value)} placeholder="0" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500" /></div><div><Label>Target</Label><Input type="number" min="0" value={fund.target} onChange={(e) => update("target", e.target.value)} placeholder="25000" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500" /></div><div><Label>Monthly plan</Label><Input type="number" min="0" value={fund.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} placeholder="500" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500" /></div><div><Label>Annual return %</Label><Input type="number" min="0" step="0.1" value={fund.annualReturn} onChange={(e) => update("annualReturn", e.target.value)} placeholder="7" className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100 placeholder:text-slate-500" /></div></div><div><Label>Notes</Label><textarea value={fund.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Strategy, ETF allocation, purpose, reminders..." rows={4} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50" /></div><div className="flex justify-end gap-3 pt-2"><Button onClick={onSubmit} className="rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Save className="mr-2 h-4 w-4" />{submitLabel}</Button></div></div>; }

export default App;
