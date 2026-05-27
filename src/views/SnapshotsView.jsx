import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard, EmptyChart } from "@/components/common";
import { MultiMetricLineViz } from "@/components/charts";
import { currency, signedCurrency } from "@/utils/format";

export function SnapshotsView({ snapshots, netWorthData, onSaveSnapshot }) {
  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ChartCard title="Net Worth Over Time" subtitle="Save snapshots monthly to see assets, debt, and net worth.">{netWorthData.length > 1 ? <MultiMetricLineViz data={netWorthData} keys={["Assets", "Debt", "Net Worth"]} xKey="date" /> : <EmptyChart text="Save your first snapshot to start the net worth line chart." />}<Button onClick={onSaveSnapshot} className="mt-4 rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"><CalendarDays className="mr-2 h-4 w-4" />Save Today's Snapshot</Button></ChartCard><Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle>Saved Snapshots</CardTitle><p className="text-sm text-slate-400">One snapshot per day.</p></CardHeader><CardContent><div className="grid gap-3">{snapshots.length === 0 && <EmptyChart text="No snapshots saved yet." />}{[...snapshots].sort((a,b)=>b.date.localeCompare(a.date)).map((snap) => <div key={snap.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"><div className="flex items-center justify-between"><span className="text-slate-300">{snap.date}</span><span className="font-bold text-emerald-300">{signedCurrency(snap.netWorth ?? snap.total - (snap.debt || 0))}</span></div><p className="mt-1 text-xs text-slate-500">Assets: {currency(snap.total)} / Debt: {currency(snap.debt || 0)}</p></div>)}</div></CardContent></Card></section>;
}
