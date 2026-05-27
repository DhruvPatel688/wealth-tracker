import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CreditCard,
  DollarSign,
  Eye,
  History,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Save,
  Scale,
  TrendingUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STORAGE_KEY } from "@/constants";
import { Hero } from "@/components/Hero";
import { StatCard } from "@/components/common";
import { DebtForm, FundForm } from "@/components/forms";
import { defaultState, emptyDebt, emptyDebtTransaction, emptyEtf, emptyFund, emptyTransaction, makeFreshDefaultState, sanitizeDebt, sanitizeFund } from "@/data/defaultState";
import { DashboardView } from "@/views/DashboardView";
import { DebtView } from "@/views/DebtView";
import { EtfView } from "@/views/EtfView";
import { ProjectionView } from "@/views/ProjectionView";
import { RealWealthView } from "@/views/RealWealthView";
import { SettingsView } from "@/views/SettingsView";
import { SnapshotsView } from "@/views/SnapshotsView";
import { TransactionsView } from "@/views/TransactionsView";
import { VisualsView } from "@/views/VisualsView";
import { clampNumber, currency, daysSince, monthKey, signedCurrency, todayISO } from "@/utils/format";
import { getMonthlyContribution } from "@/utils/ira";
import { projectAssetsWithLinkedPortfolios, projectDebt } from "@/utils/projections";
import { getEffectiveFundValue, isPortfolioFund } from "@/utils/portfolio";

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
    return funds.map((fund) => ({ ...fund, current: getEffectiveFundValue(fund, etfs), monthlyContribution: getMonthlyContribution(fund, settings) }));
  }, [funds, etfs, settings]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.funds) {
          const normalizedFunds = parsed.funds.map((fund) => ({ annualReturn: 7, contributionMode: fund.category === "roth" ? fund.contributionMode || "manual" : "manual", iraCatchUp: Boolean(fund.iraCatchUp), ...fund }));
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
          // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const fundRows = projectAssetsWithLinkedPortfolios(funds, etfs, years, settings);
    const debtRows = projectDebt(debts, years);
    return fundRows.map((row, index) => {
      const debt = debtRows[index]?.ProjectedDebt || 0;
      return { ...row, ProjectedDebt: debt, ProjectedNetWorth: row.ProjectedAssets - debt };
    });
  }, [funds, etfs, debts, settings]);

  const milestoneData = useMemo(() => {
    const milestones = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    return milestones.map((target) => {
      const years = 50;
      const fundRows = projectAssetsWithLinkedPortfolios(funds, etfs, years, settings);
      const debtRows = projectDebt(debts, years);
      const rows = fundRows.map((row, i) => ({ monthApprox: row.month, netWorth: row.ProjectedAssets - (debtRows[i]?.ProjectedDebt || 0) }));
      const hit = rows.find((row) => row.netWorth >= target);
      return { target, months: hit ? hit.monthApprox : Infinity };
    });
  }, [funds, etfs, debts, settings]);

  const stockProjectionData = useMemo(() => {
    const years = Math.max(1, clampNumber(settings.projectionYears));
  
    if (!activePortfolioFundId) return [];
  
    const portfolioEtfs = etfs.filter(
      (etf) => etf.fundId === activePortfolioFundId
    );
  
    if (portfolioEtfs.length === 0) return [];
  
    const parentFund = funds.find((fund) => fund.id === activePortfolioFundId);
  
    const targetTotal = portfolioEtfs.reduce(
      (sum, etf) => sum + clampNumber(etf.targetPercent),
      0
    );
  
    const hasValidTargets = targetTotal > 0;
    const equalWeight = portfolioEtfs.length > 0 ? 1 / portfolioEtfs.length : 0;
  
    const balances = portfolioEtfs.map((etf) => {
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
    });
  
    const rows = [];
    const totalMonths = Math.max(12, Math.round(years * 12));
  
  for (let month = 0; month <= totalMonths; month++) {
    if (month > 0) {
        const monthlyStockContribution = getMonthlyContribution(parentFund, settings, month);
        balances.forEach((etf) => {
          etf.balance =
            etf.balance * (1 + etf.monthlyRate) + monthlyStockContribution * etf.allocationWeight;
        });
      }
  
      const yearElapsed = month / 12;
  
      const row = {
        month,
        year: `Y${yearElapsed.toFixed(month % 12 === 0 ? 0 : 1)}`,
      };
  
      balances.forEach((etf) => {
        row[etf.ticker] = Math.round(etf.balance);
      });
  
      row.StockPortfolio = Math.round(
        balances.reduce((sum, etf) => sum + etf.balance, 0)
      );
  
      rows.push(row);
    }
  
    return rows;
  }, [etfs, funds, activePortfolioFundId, settings]);
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
    const amount = getMonthlyContribution(fund, settings);
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
        const normalizedFunds = parsed.funds.map((fund) => ({ annualReturn: 7, contributionMode: fund.category === "roth" ? fund.contributionMode || "manual" : "manual", iraCatchUp: Boolean(fund.iraCatchUp), ...fund }));
        const firstPortfolioFundId = normalizedFunds.find((fund) => isPortfolioFund(fund))?.id || "";
        setData({ ...defaultState, ...parsed, funds: normalizedFunds, etfs: (parsed.etfs || []).map((etf) => ({ ...etf, fundId: etf.fundId || firstPortfolioFundId })), debts: parsed.debts || [], debtTransactions: parsed.debtTransactions || [], settings: { ...defaultState.settings, ...parsed.settings } });
      } catch {
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

export default App;
