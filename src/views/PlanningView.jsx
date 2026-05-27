import { Calculator, Info, Landmark, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MiniMetric } from "@/components/common";
import { MonthlyPlanLineViz } from "@/components/charts";
import { categoryLabels } from "@/constants";
import { clampNumber, currency } from "@/utils/format";
import { buildPlanningMonthlyPath, calculatePlanningRecommendations, DIAL_MAX_TODAY_VALUE, WEALTHY_TODAY_VALUE } from "@/utils/planning";

export function PlanningView({ funds, settings, setData, projectionData, netWorth }) {
  const planningGoal = settings.planningGoal || {};
  const updatePlanningGoal = (field, value) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        planningGoal: {
          ...prev.settings.planningGoal,
          [field]: value,
        },
      },
    }));
  };
  const updateSetting = (field, value) => setData((prev) => ({ ...prev, settings: { ...prev.settings, [field]: value } }));
  const targetDate = planningGoal.targetDate || `${new Date().getFullYear() + 20}-01-01`;
  const targetAmount = planningGoal.targetAmount || WEALTHY_TODAY_VALUE;
  const targetMode = planningGoal.targetMode === "nominal" ? "nominal" : "real";
  const preview = calculatePlanningRecommendations({ funds, settings, planningGoal: { targetAmount, targetMode, targetDate }, projectedDebt: 0 });
  const projectionRow = projectionData[Math.min(preview.months, Math.max(0, projectionData.length - 1))];
  const projectedDebt = projectionRow?.ProjectedDebt || 0;
  const currentPlanNetWorth = projectionRow?.ProjectedNetWorth ?? netWorth;
  const plan = calculatePlanningRecommendations({ funds, settings, planningGoal: { targetAmount, targetMode, targetDate }, projectedDebt });
  const totalCurrentMonthly = plan.recommendations.reduce((sum, row) => sum + row.currentMonthly, 0);
  const totalRecommendedMonthly = plan.recommendations.reduce((sum, row) => sum + row.recommendedMonthly, 0);
  const extraMonthly = Math.max(0, totalRecommendedMonthly - totalCurrentMonthly);
  const goalProgress = DIAL_MAX_TODAY_VALUE > 0 ? (plan.realTarget / DIAL_MAX_TODAY_VALUE) * 100 : 0;
  const goalTier = plan.realTarget >= WEALTHY_TODAY_VALUE ? "Wealthy" : "Meager";
  const currentPlanReal = plan.inflationFactor > 0 ? currentPlanNetWorth / plan.inflationFactor : currentPlanNetWorth;
  const monthlyPath = buildPlanningMonthlyPath(plan, settings);
  const finalMonthlyPath = monthlyPath.at(-1) || {};

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><Calculator className="h-6 w-6 text-emerald-300" />Planning Goal</CardTitle>
          <p className="text-sm text-slate-400">Set a target, choose whether it is in today's dollars or future dollars, and see the monthly fund plan needed to reach it.</p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Monetary goal</Label>
              <Input type="number" min="0" value={targetAmount} onChange={(event) => updatePlanningGoal("targetAmount", event.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" />
            </div>
            <div>
              <Label>Goal value type</Label>
              <Select value={targetMode} onValueChange={(value) => updatePlanningGoal("targetMode", value)}>
                <SelectTrigger className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
                  <SelectItem value="real">Today&apos;s dollars</SelectItem>
                  <SelectItem value="nominal">Future dollars</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target date</Label>
              <Input type="date" value={targetDate} onChange={(event) => updatePlanningGoal("targetDate", event.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" />
            </div>
            <div>
              <Label>Inflation rate %</Label>
              <Input type="number" min="0" step="0.1" value={settings.inflationRate} onChange={(event) => updateSetting("inflationRate", event.target.value)} className="mt-2 rounded-2xl border-white/10 bg-slate-900 text-slate-100" />
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/50 p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">This goal is currently classified as <b className="text-slate-100">{goalTier}</b></span>
              <span className="font-semibold text-emerald-300">{currency(plan.realTarget)} today</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-slate-800">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-400 via-sky-400 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, goalProgress))}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-xs text-slate-500">
              <span>Meager</span>
              <span className="text-center">$3M today</span>
              <span className="text-right">Wealthy</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Goal in future dollars" value={currency(plan.nominalTarget)} />
            <MiniMetric label="Goal buying power" value={currency(plan.realTarget)} />
            <MiniMetric label="Current plan buying power" value={currency(currentPlanReal)} />
            <MiniMetric label="Extra monthly needed" value={currency(extraMonthly)} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><Target className="h-6 w-6 text-sky-300" />Monthly Fund Recommendations</CardTitle>
          <p className="text-sm text-slate-400">Recommendations preserve maxed Roth IRA limits, then spread the remaining monthly need across other funds by each fund&apos;s target weight.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Current monthly" value={currency(totalCurrentMonthly)} />
            <MiniMetric label="Recommended monthly" value={currency(totalRecommendedMonthly)} />
            <MiniMetric label="Recommended net worth" value={currency(plan.recommendedProjectedNetWorth)} />
          </div>
          <div className="grid gap-3">
            {plan.recommendations.map((row) => (
              <div key={row.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{row.name}</h3>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">{categoryLabels[row.category] || "Custom Fund"}</span>
                      {row.isRothMaxed && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-200"><Landmark className="h-3 w-3" />Roth max kept</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">Projected fund value on the goal date: {currency(row.projectedValue)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <MiniMetric label="Current" value={currency(row.currentMonthly)} />
                    <MiniMetric label="Recommended" value={currency(row.recommendedMonthly)} />
                    <MiniMetric label="Change" value={row.monthlyChange > 0 ? `+${currency(row.monthlyChange)}` : currency(0)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {plan.recommendations.some((row) => row.isRothMaxed) && (
            <div className="mt-4 flex gap-3 rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Maxed Roth IRA funds stay at their IRA-limit monthly amount, so any extra needed to hit the planning goal is routed to non-maxed funds.</p>
            </div>
          )}
          {clampNumber(plan.targetGap) < 0 && (
            <div className="mt-4 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              The app could not fully close the gap with the available fund plan. Add or uncap a non-Roth fund to create more room.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-2xl">Inflation-Adjusted Monthly Plan</CardTitle>
          <p className="text-sm text-slate-400">The recommended monthly line grows with inflation over the goal timeline. Roth IRA maxed funds stay capped unless IRA limit growth is enabled in Settings.</p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <MonthlyPlanLineViz data={monthlyPath} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.recommendations.map((row) => (
              <MiniMetric key={row.id} label={`${row.name} at goal date`} value={currency(finalMonthlyPath[row.name] || row.recommendedMonthly)} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
