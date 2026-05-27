import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { percent } from "@/utils/format";

export function StatCard({ icon: Icon, label, value, sub }) {
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}><Card className="rounded-[1.6rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardContent className="p-5"><div className="w-fit rounded-2xl bg-white/10 p-3"><Icon className="h-5 w-5 text-emerald-300" /></div><p className="mt-4 text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-sm text-slate-500">{sub}</p></CardContent></Card></motion.div>;
}

export function MiniMetric({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-100">{value}</p></div>;
}

export function ProgressBar({ progress, label = "Progress to target" }) {
  return <div className="mt-5"><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold text-emerald-300">{percent(progress)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }} transition={{ duration: 0.75, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" /></div></div>;
}

export function ChartCard({ title, subtitle, children }) {
  return <Card className="rounded-[2rem] border-white/10 bg-white/[0.04] text-slate-100 shadow-xl backdrop-blur"><CardHeader><CardTitle className="text-xl">{title}</CardTitle><p className="text-sm text-slate-400">{subtitle}</p></CardHeader><CardContent>{children}</CardContent></Card>;
}

export function EmptyChart({ text }) {
  return <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-slate-400">{text}</div>;
}
