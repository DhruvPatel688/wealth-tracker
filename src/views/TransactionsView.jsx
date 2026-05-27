import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard, EmptyChart } from "@/components/common";
import { BarViz } from "@/components/charts";
import { currency } from "@/utils/format";

export function TransactionsView({ transactions, funds, monthlyData }) {
  const fundName = (id) => funds.find((fund) => fund.id === id)?.name || "Deleted fund";
  return <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"><ChartCard title="Monthly Planned vs Actual" subtitle="This month's contributions compared to your monthly plan."><BarViz data={monthlyData} first="Planned" second="Actual" /></ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Transaction History</CardTitle><p className="text-sm text-slate-400">Contributions, withdrawals, gains, and losses.</p></CardHeader><CardContent><div className="grid max-h-[520px] gap-3 overflow-auto pr-1">{transactions.length === 0 && <EmptyChart text="No transactions yet. Use Add Transaction or Add Monthly." />}{transactions.map((tx) => <div key={tx.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{tx.type === "withdrawal" || tx.type === "loss" ? "Removed" : "Added"} {currency(tx.amount)} {tx.type !== "withdrawal" && tx.type !== "loss" ? "to" : "from"} {fundName(tx.fundId)}</p><p className="mt-1 text-sm text-slate-400">{tx.date} / {tx.type}</p>{tx.note && <p className="mt-2 text-sm text-slate-300">{tx.note}</p>}</div><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div></div>)}</div></CardContent></Card></section>;
}
