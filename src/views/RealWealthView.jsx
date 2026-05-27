import { TrendingUpIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartCard, MiniMetric } from "@/components/common";
import { MultiMetricLineViz } from "@/components/charts";
import { currency } from "@/utils/format";

export function RealWealthView({ realWealthData, settings, setData }) {
  const last = realWealthData.at(-1);
  return <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ChartCard title="Inflation-Adjusted Net Worth" subtitle="Projected nominal net worth versus today's dollars."><div className="mb-4 max-w-xs"><Label>Inflation rate %</Label><Input type="number" value={settings.inflationRate} onChange={(e) => setData((prev) => ({ ...prev, settings: { ...prev.settings, inflationRate: e.target.value } }))} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" /></div><MultiMetricLineViz data={realWealthData} keys={["ProjectedNetWorth", "RealNetWorth", "InflationDrag"]} /></ChartCard><ChartCard title="Purchasing Power" subtitle="Nominal projection adjusted for inflation."><div className="grid gap-3"><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"><TrendingUpIcon className="mb-3 h-5 w-5 text-emerald-300" /><MiniMetric label="Projected net worth" value={currency(last?.ProjectedNetWorth || 0)} /></div><MiniMetric label="Real net worth" value={currency(last?.RealNetWorth || 0)} /><MiniMetric label="Inflation drag" value={currency(last?.InflationDrag || 0)} /><MiniMetric label="Base year" value={settings.baseYear || new Date().getFullYear()} /></div></ChartCard></section>;
}
