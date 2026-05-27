export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(dateString = todayISO()) {
  return dateString.slice(0, 7);
}

export function currency(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function signedCurrency(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const sign = safe < 0 ? "-" : "";
  return `${sign}${currency(Math.abs(safe))}`;
}

export function percent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.min(100, Math.max(0, value)).toFixed(1)}%`;
}

export function clampNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

export function daysSince(date) {
  if (!date) return Infinity;
  const then = new Date(`${date}T00:00:00`);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
