import { clampNumber } from "@/utils/format";

export function debtRisk(apr) {
  const rate = clampNumber(apr);
  if (rate >= 20) return { label: "Emergency debt", className: "text-red-300", note: "Usually prioritize aggressively." };
  if (rate >= 10) return { label: "Very high APR", className: "text-orange-300", note: "Strong payoff priority." };
  if (rate >= 7) return { label: "High APR", className: "text-amber-300", note: "Consider extra payments." };
  if (rate >= 4) return { label: "Moderate APR", className: "text-sky-300", note: "Balanced approach." };
  return { label: "Low APR", className: "text-emerald-300", note: "Minimums may be reasonable." };
}

export function estimateDebtPayoff(debt) {
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
