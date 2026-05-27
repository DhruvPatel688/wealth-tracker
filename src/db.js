import Dexie from "dexie";

export const db = new Dexie("wealthTrackerDB");

db.version(1).stores({
  funds: "++id, name, category, current, target, monthlyContribution, createdAt, updatedAt",

  transactions:
    "++id, fundId, type, amount, date, createdAt",

  snapshots:
    "++id, date, total, createdAt",

  etfs:
    "++id, ticker, name, targetPercent, currentValue, createdAt, updatedAt",

  settings:
    "id",
});