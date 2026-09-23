import { useState, useEffect, useRef, useMemo } from "react";
import {
  Utensils, Coffee, Car, Sparkles, Home, Cat, Dumbbell, MoreHorizontal,
  Plus, Trash2, Bell, AlertTriangle, Calendar, Wallet, PiggyBank,
  TrendingUp, TrendingDown, CreditCard, Banknote, ArrowLeftRight,
  CheckCircle2, ChevronLeft, ChevronRight, Flame, Star, Landmark,
  Lock, Award, ShieldCheck, Rocket, PartyPopper, ChevronRight as ChevronR,
  ClipboardList, Settings, RotateCcw, Percent, ChevronDown, ChevronUp, Info, X, SkipForward,
  Clock, Repeat, Tag, PieChart as PieChartIcon, Store, Bike, Package, Pencil
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

/* ---------------------------------------------------------------- */
/*  Design tokens — playful, colorful "quiz app" energy              */
/* ---------------------------------------------------------------- */
const C = {
  bg: "#F6F5FC",
  card: "#FFFFFF",
  ink: "#1B1B2F",
  inkSoft: "#8C8CA0",
  purple: "#6C5CE7",
  purpleDeep: "#4B3FC7",
  purpleSoft: "#EDEBFC",
  yellow: "#FFC93C",
  yellowDeep: "#F5AF00",
  yellowSoft: "#FFF3D6",
  coral: "#FF7A59",
  coralSoft: "#FFE3DA",
  teal: "#2ECC9B",
  tealSoft: "#DAF7EE",
  blue: "#4FB6E8",
  blueSoft: "#DEF2FC",
  pink: "#FF6B9D",
  pinkSoft: "#FDE3EC",
  gray: "#B7BACB",
  graySoft: "#EDEDF4",
  brown: "#C97B3E",
  brownSoft: "#F6E4D2",
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap');
`;

const ICON_LIBRARY = {
  Utensils, Coffee, Car, Sparkles, Home, Cat, Dumbbell, Store, Bike, Package,
  CreditCard, MoreHorizontal, Wallet, PiggyBank, Bell, Calendar, Star, Flame,
  Landmark, Rocket, ShieldCheck, Award, Tag, Clock, Percent, TrendingUp,
  TrendingDown, Banknote, ArrowLeftRight, ClipboardList, Settings,
};
const ICON_NAMES = Object.keys(ICON_LIBRARY);
function resolveIcon(name) { return ICON_LIBRARY[name] || MoreHorizontal; }
const CATEGORY_COLOR_PALETTE = ["#FF7A59", "#4FB6E8", "#6C5CE7", "#FF6B9D", "#F5AF00", "#9B7BF0", "#2ECC9B", "#C97B3E", "#1DB954", "#5B6BC0", "#6B4EA6", "#B7BACB"];

const DEFAULT_EXPENSE_CATEGORIES = [
  { key: "food", label: "Food", icon: "Utensils", color: "#FF7A59", subcategories: [
    { key: "seven11", label: "7-Eleven", icon: "Store", color: "#C97B3E" },
    { key: "grab", label: "Grab", icon: "Bike", color: "#1DB954" },
    { key: "drink", label: "Drinks", icon: "Coffee", color: "#4FB6E8" },
    { key: "lineman", label: "Lineman", icon: "Package", color: "#5B6BC0" },
  ] },
  { key: "car", label: "Car", icon: "Car", color: "#6C5CE7" },
  { key: "beauty", label: "Beauty", icon: "Sparkles", color: "#FF6B9D" },
  { key: "home", label: "Home", icon: "Home", color: "#F5AF00" },
  { key: "cat", label: "Cat", icon: "Cat", color: "#9B7BF0" },
  { key: "exercise", label: "Fitness", icon: "Dumbbell", color: "#2ECC9B" },
  { key: "creditcard", label: "Credit Card", icon: "CreditCard", color: "#6B4EA6" },
  { key: "investment", label: "Investment", icon: "TrendingUp", color: "#4FB6E8" },
  { key: "others", label: "Other", icon: "MoreHorizontal", color: "#B7BACB" },
];
const DEFAULT_CREDIT_CARDS = [
  { name: "SCB", icon: "Landmark", color: "#6C5CE7" },
  { name: "JCB", icon: "CreditCard", color: "#FF7A59" },
  { name: "Shopee", icon: "Store", color: "#FF6B9D" },
  { name: "Krungsri", icon: "Landmark", color: "#F5AF00" },
  { name: "Kbank", icon: "Landmark", color: "#2ECC9B" },
  { name: "Premier", icon: "Award", color: "#9B7BF0" },
  { name: "Prefered", icon: "Star", color: "#4FB6E8" },
];
function cardMeta(creditCards, name) {
  return creditCards.find((c) => c.name === name) || { name, icon: "CreditCard", color: "#6C5CE7" };
}
// Auto-synced credit-card debts are keyed by id (cc-<card>-<statementMonth>),
// but a card rename or a cross-device merge racing with one can leave two
// entries that both represent the same real card+due-date under different
// ids. Collapse those by their actual identity, not just by id string.
function dedupeAutoDebtsByCardDue(debts) {
  const manual = debts.filter((d) => !d.auto);
  const autoByKey = new Map();
  debts.filter((d) => d.auto).forEach((d) => {
    const key = d.card + "|" + d.dueDate;
    const existing = autoByKey.get(key);
    if (!existing) { autoByKey.set(key, d); return; }
    const rank = (x) => (x.paid ? 2 : 0) + (x.amountOverridden ? 1 : 0);
    const winner = rank(d) >= rank(existing) ? d : existing;
    autoByKey.set(key, winner);
  });
  return [...manual, ...autoByKey.values()];
}
const DEFAULT_BANKS = [];
function bankMeta(banks, name) {
  return banks.find((b) => b.name === name) || { name, icon: "Landmark", color: "#4FB6E8" };
}
// A bank's displayed balance = its manually-set anchor + the net effect of
// every transfer transaction that references it. Only transactions created
// through the bank picker (i.e. after the bank existed) ever carry a
// `.bank` field, so older records never retroactively affect this.
function bankTransferDelta(transactions, bankName) {
  return transactions.reduce((sum, t) => {
    if (t.payment === "transfer" && t.bank === bankName) {
      return sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount));
    }
    return sum;
  }, 0);
}
function computeBankBalance(transactions, bankBalances, bankName) {
  return (bankBalances[bankName] || 0) + bankTransferDelta(transactions, bankName);
}
// A card's owed amount is a running balance (like a bank balance), minus
// whatever's already been paid off — but it must still respect each card's
// own statement cutoff day: a transaction dated after the cutoff that
// closes the statement leading to the CURRENT due date belongs to the
// NEXT cycle, and must not count toward what's due right now.
function cardTransactionTotal(transactions, cardName) {
  return transactions.reduce((sum, t) => {
    if (t.type === "expense" && t.payment === "credit" && t.card === cardName) return sum + Number(t.amount);
    return sum;
  }, 0);
}
// The due date for a statement in month M is always the cutoff of month
// M-1 (charges up to that cutoff are billed, due the following month).
function cardCutoffBoundaryForDueYm(cardSettings, cardName, dueDateYm) {
  const cutoffDay = Math.min(cardSettings[cardName]?.cutoffDay ?? 25, 28);
  const cutoffYm = addMonths(dueDateYm, -1);
  return dateForDayInMonth(cutoffYm, cutoffDay);
}
function cardBilledTotal(transactions, cardSettings, cardName, dueDateYm) {
  const boundary = cardCutoffBoundaryForDueYm(cardSettings, cardName, dueDateYm);
  return transactions.reduce((sum, t) => {
    if (t.type === "expense" && t.payment === "credit" && t.card === cardName && t.date <= boundary) return sum + Number(t.amount);
    return sum;
  }, 0);
}
function computeCardOwed(transactions, cardOwedBaseline, cardSettings, cardName, dueDateYm) {
  return Math.max(0, cardBilledTotal(transactions, cardSettings, cardName, dueDateYm) - (cardOwedBaseline[cardName] || 0));
}
function monthsBetweenYm(fromYm, toYm) {
  const [fy, fm] = fromYm.split("-").map(Number);
  const [ty, tm] = toYm.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
// A line item (manually-added card installment) only counts toward the
// card's total once its own start cycle has arrived, and — if it has a
// fixed installment count — only for that many cycles. This is what makes
// a newly-added plan apply from next month's bill, not retroactively pad
// the cycle that's already in progress.
function lineItemActiveFor(li, cycleYm) {
  if (!li.startYm) return true; // pre-existing item from before installment tracking existed
  const elapsed = monthsBetweenYm(li.startYm, cycleYm);
  if (elapsed < 0) return false;
  if (li.totalInstallments == null) return true;
  return elapsed < li.totalInstallments;
}
function activeLineItemsTotal(lineItems, cycleYm) {
  return (lineItems || []).filter((li) => lineItemActiveFor(li, cycleYm)).reduce((a, li) => a + Number(li.amount), 0);
}
// Cash works like a bank balance (anchor + net delta), but since
// payment==='cash' already existed on every transaction (not a new field),
// this naturally includes the full cash history, not just new records.
function cashDelta(transactions) {
  return transactions.reduce((sum, t) => {
    if (t.payment === "cash") return sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount));
    return sum;
  }, 0);
}
function computeCashBalance(transactions, cashBalance) {
  return (cashBalance || 0) + cashDelta(transactions);
}

function subcategoryMeta(categories, catKey, subKey) {
  const cat = categories.find((c) => c.key === catKey);
  return cat?.subcategories?.find((s) => s.key === subKey) || null;
}
function resolveMainCategory(categories, key) {
  for (const c of categories) {
    if (c.subcategories && c.subcategories.some((s) => s.key === key)) return c.key;
  }
  return key;
}
function categoryColor(categories, key) {
  for (const c of categories) {
    if (c.key === key) return c.color;
    if (c.subcategories) { const s = c.subcategories.find((s) => s.key === key); if (s) return s.color; }
  }
  return C.gray;
}
const INCOME_CATEGORIES = [
  { key: "salary", label: "Salary", icon: "Landmark", color: "#2ECC9B" },
  { key: "extra", label: "Side Income", icon: "TrendingUp", color: "#4FB6E8" },
  { key: "other_income", label: "Other", icon: "MoreHorizontal", color: "#B7BACB" },
];

const TAB_COLOR = {
  overview: C.purple, transactions: C.coral, savings: C.teal,
  debts: C.yellowDeep, budgets: C.blue, plan: C.pink, homeLoan: C.brown,
};

const INCOME_TYPE_PRESETS = ["Main Salary", "Side Income", "Bonus", "Own Business", "Other"];
const FIXCOST_TYPE_PRESETS = ["Rent/Home Loan", "Utilities & Internet", "Insurance", "Car Loan", "Membership/Subscription", "Tuition", "Other"];
const INVEST_CATEGORY_PRESETS = ["Stocks", "Mutual Fund", "Gold", "Cryptocurrency", "Bonds/Fixed Income", "Endowment Insurance", "Real Estate", "Other"];
const PROFILE_COLORS = [C.purple, C.coral, C.teal, C.blue, C.pink, C.yellowDeep, C.brown, "#9B7BF0"];
function profileById(profiles, id) { return profiles.find((p) => p.id === id) || null; }
const INVEST_PALETTE = [C.purple, C.teal, C.blue, C.coral, C.pink, C.yellowDeep, "#9B7BF0", C.gray];

function investItemAmount(item, totalPool, ym, overrides) {
  if (ym && overrides?.[ym]?.[item.id] !== undefined) return overrides[ym][item.id];
  return item.mode === "percent" ? (Number(totalPool) || 0) * (Number(item.value) || 0) / 100 : (Number(item.value) || 0);
}
function investItemStatus(item) {
  if (item.executed) return { level: "done", text: "Invested" };
  const diff = daysUntil(item.date);
  const nowTime = new Date().toTimeString().slice(0, 5);
  if (diff < 0) return { level: "hot", text: `Overdue ${Math.abs(diff)} days` };
  if (diff === 0) return item.time && nowTime < item.time ? { level: "warn", text: `Today at ${item.time}` } : { level: "hot", text: "Time's up" };
  if (diff <= 2) return { level: "warn", text: `${diff} days left` };
  return { level: "ok", text: `${diff} days left` };
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toLocalDateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseLocalDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function ymOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1); }
function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function addMonths(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ymOf(d);
}
function dateForDayInMonth(ym, day) {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return toLocalDateStr(new Date(y, m - 1, Math.min(Math.max(1, day), lastDay)));
}
function effectiveAmount(item, ym, overrides) {
  if (!item.recurring) return item.amount;
  const ov = overrides?.[ym]?.[item.id];
  return ov !== undefined ? ov : item.amount;
}
function itemsForMonth(items, ym) {
  return items.filter((i) => {
    if (!i.recurring) return i.month === ym;
    if (i.startMonth && ym < i.startMonth) return false;
    if (i.endMonth && ym > i.endMonth) return false;
    return true;
  });
}

const HOME_LOAN_FIXCOST_ID = "home-loan-fixcost";
const HOME_LOAN_DEBT_ID = "home-loan-debt";

function rateForMonth(rateChanges, ym) {
  const sorted = [...(rateChanges || [])].sort((a, b) => a.ym.localeCompare(b.ym));
  let r = sorted[0]?.rate ?? 0;
  for (const rc of sorted) { if (rc.ym <= ym) r = rc.rate; else break; }
  return r;
}

function buildAmortizationSchedule(loan, planOverrides) {
  if (!loan || !loan.active || !loan.principal || loan.principal <= 0 || !loan.payment || loan.payment <= 0 || !loan.startMonth) return [];
  let remaining = loan.principal;
  let ym = loan.startMonth;
  const rows = [];
  let i = 0;
  while (remaining > 1 && i < 600) {
    const rate = rateForMonth(loan.rateChanges, ym);
    const monthlyRate = rate / 100 / 12;
    const interest = remaining * monthlyRate;
    const pay = planOverrides?.[ym]?.[HOME_LOAN_FIXCOST_ID] ?? loan.payment;
    let principalPaid = pay - interest;
    if (principalPaid < 0) principalPaid = 0;
    if (principalPaid > remaining) principalPaid = remaining;
    const newRemaining = Math.max(0, remaining - principalPaid);
    rows.push({ ym, rate, payment: pay, interest, principalPaid, remaining: newRemaining });
    remaining = newRemaining;
    if (remaining <= 0) break;
    ym = addMonths(ym, 1);
    i++;
  }
  return rows;
}

function fmtTHB(n) {
  const v = Number(n) || 0;
  return "฿" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function todayStr() { return toLocalDateStr(new Date()); }
// Data retention: transactions older than 6 months are permanently purged
// (not just hidden) — see loadData()'s cleanup step.
const TRANSACTION_RETENTION_MONTHS = 6;
function retentionCutoffStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - TRANSACTION_RETENTION_MONTHS);
  return toLocalDateStr(d);
}
function thDate(d) {
  try { return parseLocalDate(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return d; }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function catMeta(list, key) { return list.find((c) => c.key === key) || list[list.length - 1]; }
function daysUntil(dateStr) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = parseLocalDate(dateStr);
  return Math.round((d - now) / 86400000);
}
function computeStreak(transactions) {
  if (transactions.length === 0) return 0;
  const days = [...new Set(transactions.map((t) => t.date))].sort().reverse();
  const today = todayStr();
  const yest = toLocalDateStr(new Date(Date.now() - 86400000));
  if (days[0] !== today && days[0] !== yest) return 0;
  let streak = 1;
  let cursor = parseLocalDate(days[0]);
  for (let i = 1; i < days.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const expected = toLocalDateStr(cursor);
    if (days[i] === expected) streak++; else break;
  }
  return streak;
}

const STORAGE_KEY = "finance-tracker-data";

// Merge two arrays of records by an id field: union of both sides, so an
// item added on one device is never silently erased by a save from another
// device that doesn't know about it yet. On an actual same-id conflict
// (edited on both sides), the local copy wins since it's the one the user
// is looking at right now.
function mergeArraysById(localArr, remoteArr, idField = "id") {
  const map = new Map();
  (remoteArr || []).forEach((item) => { if (item && item[idField] != null) map.set(item[idField], item); });
  (localArr || []).forEach((item) => { if (item && item[idField] != null) map.set(item[idField], item); });
  return Array.from(map.values());
}
// Shallow-merge two flat key->value maps: union of keys from both sides,
// local wins on conflicts.
function mergeMaps(localMap, remoteMap) {
  return { ...(remoteMap || {}), ...(localMap || {}) };
}

/* ---------------------------------------------------------------- */

export default function FinanceTracker({ syncStatus, syncUsername, syncError, onOpenSyncSettings, buildVersion } = {}) {
  const [tab, setTab] = useState("overview");
  // Global toast — one implementation shared by every page, so any add/delete
  // action anywhere in the app can surface the same top-right confirmation.
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  function showToast(msg) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }
  const [transactions, setTransactions] = useState([]);
  const [savings, setSavings] = useState([]);
  const [debts, setDebts] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [planIncomeItems, setPlanIncomeItems] = useState([]);
  const [planFixCostItems, setPlanFixCostItems] = useState([]);
  const [planOverrides, setPlanOverrides] = useState({});
  const [savingsPlan, setSavingsPlan] = useState({
    saving: { mode: "percent", value: 10 },
    invest: { mode: "percent", value: 10 },
  });
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [creditCards, setCreditCards] = useState(DEFAULT_CREDIT_CARDS);
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [bankBalances, setBankBalances] = useState({});
  const [cardSettings, setCardSettings] = useState(
    Object.fromEntries(DEFAULT_CREDIT_CARDS.map((c) => [c.name, { cutoffDay: 25, dueDay: 5 }]))
  );
  const [investPlan, setInvestPlan] = useState({ totalPool: 0, items: [], overrides: {} });
  const [holdings, setHoldings] = useState([]);
  const [homeLoan, setHomeLoan] = useState({
    active: false, name: "", principal: 0, startMonth: ymOf(new Date()),
    payment: 0, dueDay: 5, rateChanges: [], paidMonths: {},
  });
  const [dismissedAlerts, setDismissedAlerts] = useState({});
  // A plain delete only removes an item from this device's array; the
  // merge-on-save logic unions with whatever another device still has, so a
  // deleted id can silently come back. Tombstoning the id itself (and
  // filtering it out everywhere debts are loaded/merged) is what makes a
  // delete actually stick across devices.
  const [deletedDebtIds, setDeletedDebtIds] = useState([]);
  const [deletedBankNames, setDeletedBankNames] = useState([]);
  const [deletedCardNames, setDeletedCardNames] = useState([]);
  const [deletedCategoryKeys, setDeletedCategoryKeys] = useState([]);
  // Same vulnerability class as debts/banks/cards/categories: deleting a
  // transaction, a savings log entry, or a portfolio holding is a plain
  // array filter, and the cross-device merge unions with remote by id — so
  // without a tombstone, a delete can get silently resurrected by a save
  // that races against a not-yet-caught-up remote copy.
  const [deletedTransactionIds, setDeletedTransactionIds] = useState([]);
  const [deletedSavingsIds, setDeletedSavingsIds] = useState([]);
  const [deletedHoldingIds, setDeletedHoldingIds] = useState([]);
  const [deletedInvestItemIds, setDeletedInvestItemIds] = useState([]);
  // Each card's debt entry is now a persistent running balance (like a bank
  // balance) rather than one entry per statement cycle: baseline tracks how
  // much of the card's total transaction history has already been paid off,
  // so owed = (all credit transactions for that card) - baseline.
  const [cardOwedBaseline, setCardOwedBaseline] = useState({});
  // Cash-on-hand works the same way as a bank balance: an anchor the user
  // sets directly, plus the net effect of every cash transaction — but
  // unlike banks (a new field old transactions never had), payment==='cash'
  // already existed on every historical transaction, so this naturally
  // reflects the full cash history from day one, not just new records.
  const [cashBalance, setCashBalance] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  async function loadData() {
    try {
      const res = await window.storage.get(STORAGE_KEY);
      if (res && res.value) {
        const data = JSON.parse(res.value);
        // Hard delete: keep only the last 6 months of transactions. This is
        // permanent — anything older is dropped here and never written back.
        const cutoff = retentionCutoffStr();
        const txTombstones = data.deletedTransactionIds || [];
        setDeletedTransactionIds(txTombstones);
        const keptTransactions = (data.transactions || []).filter((t) => t.date >= cutoff && !txTombstones.includes(t.id));
        setTransactions(keptTransactions);
        const savingsTombstones = data.deletedSavingsIds || [];
        setDeletedSavingsIds(savingsTombstones);
        setSavings((data.savings || []).filter((s) => !savingsTombstones.includes(s.id)));
        const tombstones = data.deletedDebtIds || [];
        setDeletedDebtIds(tombstones);
        setDebts((data.debts || []).filter((d) => !tombstones.includes(d.id)));
        setBudgets(data.budgets || {});
        setPlanIncomeItems(data.planIncomeItems || []);
        setPlanFixCostItems(data.planFixCostItems || []);
        setPlanOverrides(data.planOverrides || {});
        if (data.savingsPlan) setSavingsPlan(data.savingsPlan);
        if (data.cardSettings) {
          setCardSettings((prev) => ({ ...prev, ...data.cardSettings }));
        } else if (data.cardDueDay) {
          // migrate legacy format: plain number -> { cutoffDay, dueDay }
          setCardSettings((prev) => {
            const next = { ...prev };
            Object.entries(data.cardDueDay).forEach(([card, val]) => {
              next[card] = typeof val === "number" ? { cutoffDay: 25, dueDay: val } : val;
            });
            return next;
          });
        }
        const investItemTombstones = data.deletedInvestItemIds || [];
        setDeletedInvestItemIds(investItemTombstones);
        if (data.investPlan) setInvestPlan((p) => ({ ...p, ...data.investPlan, items: (data.investPlan.items || []).filter((i) => !investItemTombstones.includes(i.id)), overrides: data.investPlan.overrides || {} }));
        const holdingsTombstones = data.deletedHoldingIds || [];
        setDeletedHoldingIds(holdingsTombstones);
        setHoldings((data.holdings || []).filter((h) => !holdingsTombstones.includes(h.id)));
        if (data.homeLoan) setHomeLoan((prev) => ({ ...prev, ...data.homeLoan }));
        if (data.dismissedAlerts) setDismissedAlerts(data.dismissedAlerts);
        setProfiles(data.profiles || []);
        const categoryTombstones = data.deletedCategoryKeys || [];
        setDeletedCategoryKeys(categoryTombstones);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories.filter((c) => !categoryTombstones.includes(c.key)));
        const cardTombstones = data.deletedCardNames || [];
        setDeletedCardNames(cardTombstones);
        if (data.creditCards) setCreditCards(data.creditCards.map((c) => typeof c === "string" ? { name: c, icon: "CreditCard", color: "#6C5CE7" } : c).filter((c) => !cardTombstones.includes(c.name)));
        const bankTombstones = data.deletedBankNames || [];
        setDeletedBankNames(bankTombstones);
        if (data.banks) setBanks(data.banks.filter((b) => !bankTombstones.includes(b.name)));
        if (data.bankBalances) setBankBalances(data.bankBalances);
        if (data.cardOwedBaseline) setCardOwedBaseline(data.cardOwedBaseline);
        if (typeof data.cashBalance === "number") setCashBalance(data.cashBalance);
      }
    } catch (e) { /* fresh start / offline */ }
  }

  useEffect(() => {
    (async () => {
      await loadData();
      loadedRef.current = true;
      setReady(true);
    })();
  }, []);

  // The app only ever loaded data once on page mount, so a tab left open on
  // one device never saw changes made on another device until manually
  // reloaded. Re-pull the latest data whenever this tab/window regains
  // focus or becomes visible again, so switching between devices "just syncs".
  useEffect(() => {
    function onFocus() { if (loadedRef.current) loadData(); }
    function onVisible() { if (document.visibilityState === "visible" && loadedRef.current) loadData(); }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const t = setTimeout(async () => {
      const localBlob = {
        transactions, savings, debts, budgets,
        planIncomeItems, planFixCostItems, planOverrides, savingsPlan, cardSettings, investPlan, holdings, homeLoan, dismissedAlerts, profiles, expenseCategories, creditCards, deletedDebtIds, banks, bankBalances, deletedBankNames, deletedCardNames, cashBalance, deletedCategoryKeys, deletedTransactionIds, deletedSavingsIds, deletedHoldingIds, deletedInvestItemIds, cardOwedBaseline,
      };
      try {
        // Read the latest remote data first and merge it with what we're
        // about to save, so a save from this device never erases items
        // that another device already added (e.g. while this tab was open).
        const res = await window.storage.get(STORAGE_KEY);
        const remote = res && res.value ? JSON.parse(res.value) : {};
        const mergedDeletedDebtIds = Array.from(new Set([...(deletedDebtIds || []), ...((remote.deletedDebtIds) || [])]));
        const mergedDeletedBankNames = Array.from(new Set([...(deletedBankNames || []), ...((remote.deletedBankNames) || [])]));
        const mergedDeletedCardNames = Array.from(new Set([...(deletedCardNames || []), ...((remote.deletedCardNames) || [])]));
        const mergedDeletedCategoryKeys = Array.from(new Set([...(deletedCategoryKeys || []), ...((remote.deletedCategoryKeys) || [])]));
        const mergedDeletedInvestItemIds = Array.from(new Set([...(deletedInvestItemIds || []), ...((remote.deletedInvestItemIds) || [])]));
        const mergedDeletedTransactionIds = Array.from(new Set([...(deletedTransactionIds || []), ...((remote.deletedTransactionIds) || [])]));
        const mergedDeletedSavingsIds = Array.from(new Set([...(deletedSavingsIds || []), ...((remote.deletedSavingsIds) || [])]));
        const mergedDeletedHoldingIds = Array.from(new Set([...(deletedHoldingIds || []), ...((remote.deletedHoldingIds) || [])]));
        const merged = {
          transactions: mergeArraysById(transactions, remote.transactions).filter((t) => t.date >= retentionCutoffStr() && !mergedDeletedTransactionIds.includes(t.id)),
          savings: mergeArraysById(savings, remote.savings).filter((s) => !mergedDeletedSavingsIds.includes(s.id)),
          debts: dedupeAutoDebtsByCardDue(mergeArraysById(debts, remote.debts).filter((d) => !mergedDeletedDebtIds.includes(d.id))),
          budgets: mergeMaps(budgets, remote.budgets),
          planIncomeItems: mergeArraysById(planIncomeItems, remote.planIncomeItems),
          planFixCostItems: mergeArraysById(planFixCostItems, remote.planFixCostItems),
          planOverrides,
          savingsPlan,
          cardSettings: mergeMaps(cardSettings, remote.cardSettings),
          investPlan: { ...investPlan, items: mergeArraysById(investPlan.items, remote.investPlan?.items).filter((i) => !mergedDeletedInvestItemIds.includes(i.id)) },
          holdings: mergeArraysById(holdings, remote.holdings).filter((h) => !mergedDeletedHoldingIds.includes(h.id)),
          homeLoan,
          dismissedAlerts: mergeMaps(dismissedAlerts, remote.dismissedAlerts),
          profiles,
          expenseCategories: mergeArraysById(expenseCategories, remote.expenseCategories, "key").filter((c) => !mergedDeletedCategoryKeys.includes(c.key)),
          creditCards: mergeArraysById(creditCards, remote.creditCards, "name").filter((c) => !mergedDeletedCardNames.includes(c.name)),
          deletedDebtIds: mergedDeletedDebtIds,
          banks: mergeArraysById(banks, remote.banks, "name").filter((b) => !mergedDeletedBankNames.includes(b.name)),
          bankBalances: mergeMaps(bankBalances, remote.bankBalances),
          cardOwedBaseline: mergeMaps(cardOwedBaseline, remote.cardOwedBaseline),
          deletedBankNames: mergedDeletedBankNames,
          deletedCardNames: mergedDeletedCardNames,
          deletedCategoryKeys: mergedDeletedCategoryKeys,
          deletedTransactionIds: mergedDeletedTransactionIds,
          deletedSavingsIds: mergedDeletedSavingsIds,
          deletedHoldingIds: mergedDeletedHoldingIds,
          cashBalance,
        };
        await window.storage.set(STORAGE_KEY, JSON.stringify(merged));
        // Reflect anything merged in from another device back into this
        // tab immediately, not just on the next focus/visibility refresh.
        if (merged.transactions.length !== transactions.length) setTransactions(merged.transactions);
        if (merged.savings.length !== savings.length) setSavings(merged.savings);
        if (merged.debts.length !== debts.length) setDebts(merged.debts);
        if (merged.planIncomeItems.length !== planIncomeItems.length) setPlanIncomeItems(merged.planIncomeItems);
        if (merged.planFixCostItems.length !== planFixCostItems.length) setPlanFixCostItems(merged.planFixCostItems);
        if (merged.holdings.length !== holdings.length) setHoldings(merged.holdings);
        if (merged.investPlan.items.length !== investPlan.items.length) setInvestPlan((p) => ({ ...p, items: merged.investPlan.items }));
        if (Object.keys(merged.budgets).length !== Object.keys(budgets).length) setBudgets(merged.budgets);
        if (Object.keys(merged.cardSettings).length !== Object.keys(cardSettings).length) setCardSettings(merged.cardSettings);
        if (merged.deletedDebtIds.length !== (deletedDebtIds || []).length) setDeletedDebtIds(merged.deletedDebtIds);
        if (merged.banks.length !== banks.length) setBanks(merged.banks);
        if (Object.keys(merged.bankBalances).length !== Object.keys(bankBalances).length) setBankBalances(merged.bankBalances);
        if (Object.keys(merged.cardOwedBaseline).length !== Object.keys(cardOwedBaseline).length) setCardOwedBaseline(merged.cardOwedBaseline);
        if (merged.deletedBankNames.length !== (deletedBankNames || []).length) setDeletedBankNames(merged.deletedBankNames);
        if (merged.deletedCardNames.length !== (deletedCardNames || []).length) setDeletedCardNames(merged.deletedCardNames);
        if (merged.creditCards.length !== creditCards.length) setCreditCards(merged.creditCards);
        if (merged.deletedCategoryKeys.length !== (deletedCategoryKeys || []).length) setDeletedCategoryKeys(merged.deletedCategoryKeys);
        if (merged.expenseCategories.length !== expenseCategories.length) setExpenseCategories(merged.expenseCategories);
        if (merged.deletedTransactionIds.length !== (deletedTransactionIds || []).length) setDeletedTransactionIds(merged.deletedTransactionIds);
        if (merged.deletedSavingsIds.length !== (deletedSavingsIds || []).length) setDeletedSavingsIds(merged.deletedSavingsIds);
        if (merged.deletedHoldingIds.length !== (deletedHoldingIds || []).length) setDeletedHoldingIds(merged.deletedHoldingIds);
      } catch (e) {
        // Offline or request failed — fall back to a plain save of local
        // state so nothing is lost locally; it'll merge properly next time.
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(localBlob)); } catch (e2) { /* ignore */ }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [transactions, savings, debts, budgets, planIncomeItems, planFixCostItems, planOverrides, savingsPlan, cardSettings, investPlan, holdings, homeLoan, dismissedAlerts, profiles, expenseCategories, creditCards, deletedDebtIds, banks, bankBalances, deletedBankNames, deletedCardNames, cashBalance, deletedCategoryKeys, deletedTransactionIds, deletedSavingsIds, deletedHoldingIds, deletedInvestItemIds, cardOwedBaseline]);

  // Sync the home loan installment into Monthly Plan's Fix Cost list automatically
  useEffect(() => {
    if (!loadedRef.current) return;
    setPlanFixCostItems((prev) => {
      const idx = prev.findIndex((i) => i.id === HOME_LOAN_FIXCOST_ID);
      if (!homeLoan.active || !homeLoan.payment) {
        return idx === -1 ? prev : prev.filter((i) => i.id !== HOME_LOAN_FIXCOST_ID);
      }
      const schedule = buildAmortizationSchedule(homeLoan, planOverrides);
      const payoffYm = schedule.length ? schedule[schedule.length - 1].ym : null;
      const itemName = homeLoan.name || "Home Loan";
      const item = {
        id: HOME_LOAN_FIXCOST_ID, name: itemName, type: "Rent/Home Loan",
        amount: homeLoan.payment, recurring: true, startMonth: homeLoan.startMonth, endMonth: payoffYm, auto: true,
      };
      let next = [...prev];
      // Remove any leftover manually-added item with the exact same name (from
      // before this loan was set up here) so it doesn't show up twice.
      next = next.filter((i) => {
        if (i.id === HOME_LOAN_FIXCOST_ID) return true;
        if (i.auto) return true;
        return i.name.trim().toLowerCase() !== itemName.trim().toLowerCase();
      });
      const newIdx = next.findIndex((i) => i.id === HOME_LOAN_FIXCOST_ID);
      if (newIdx === -1) return [...next, item];
      const existing = next[newIdx];
      if (existing.amount !== item.amount || existing.endMonth !== item.endMonth || existing.name !== item.name || existing.startMonth !== item.startMonth || next.length !== prev.length) {
        next[newIdx] = { ...existing, ...item }; return next;
      }
      return prev;
    });
  }, [homeLoan, planOverrides]);

  // Sync the home loan installment into the Debts tab automatically, as a
  // single recurring auto-managed debt — the existing "mark paid → roll
  // forward one month" behavior in Debts handles subsequent months on its
  // own, same as any other recurring debt.
  useEffect(() => {
    if (!loadedRef.current) return;
    setDebts((prev) => {
      const idx = prev.findIndex((d) => d.id === HOME_LOAN_DEBT_ID);
      const schedule = homeLoan.active ? buildAmortizationSchedule(homeLoan, planOverrides) : [];
      const payoffYm = schedule.length ? schedule[schedule.length - 1].ym : null;
      const itemName = homeLoan.name || "Home Loan";
      if (!homeLoan.active || !homeLoan.payment) {
        return idx === -1 ? prev : prev.filter((d) => d.id !== HOME_LOAN_DEBT_ID);
      }
      if (idx === -1) {
        // Seed the first due date: the loan's due-day in the later of
        // (this month, the loan's start month), pushed to next month if
        // that date has already passed.
        const dueDay = homeLoan.dueDay || 5;
        let candidateYm = homeLoan.startMonth && homeLoan.startMonth > ymOf(new Date()) ? homeLoan.startMonth : ymOf(new Date());
        let candidateDate = dateForDayInMonth(candidateYm, dueDay);
        if (candidateDate < todayStr()) { candidateYm = addMonths(candidateYm, 1); candidateDate = dateForDayInMonth(candidateYm, dueDay); }
        if (payoffYm && candidateYm > payoffYm) return prev; // loan already paid off by then
        return [...prev, { id: HOME_LOAN_DEBT_ID, name: itemName, amount: homeLoan.payment, dueDate: candidateDate, recurring: true, paid: false, auto: true }];
      }
      const existing = prev[idx];
      // The loan finished paying off before this entry's current cycle —
      // stop generating it (leave it alone if already paid/dismissed).
      if (payoffYm && existing.dueDate.slice(0, 7) > payoffYm && !existing.paid && !existing.dismissed) {
        return prev.filter((d) => d.id !== HOME_LOAN_DEBT_ID);
      }
      if (existing.paid || existing.dismissed) return prev;
      const updates = {};
      if (!existing.amountOverridden && existing.amount !== homeLoan.payment) updates.amount = homeLoan.payment;
      if (existing.name !== itemName) updates.name = itemName;
      if (Object.keys(updates).length === 0) return prev;
      return prev.map((d) => (d.id === HOME_LOAN_DEBT_ID ? { ...d, ...updates } : d));
    });
  }, [homeLoan, planOverrides]);

  // Each credit card gets exactly one persistent debt entry — a running
  // balance (like a bank balance), not one entry per statement cycle. Every
  // configured card gets an entry even with nothing owed (amount 0), and
  // manually-added recurring card installments live as lineItems inside
  // that same entry rather than as separate debts.
  useEffect(() => {
    if (!loadedRef.current) return;
    setDebts((prev) => {
      let changed = false;
      let next = [...prev];
      // One-time migration: fold any old-style per-statement-cycle entries
      // (id "cc-<card>-<yyyy-mm>") into the new model. A PAID old entry
      // represents a cycle already settled — its amount needs to be baked
      // into this card's baseline so the new running balance doesn't
      // double-count it. An UNPAID old entry needs no baseline adjustment
      // (its transactions are already part of the raw total) — just remove
      // it so it doesn't show up twice. Removing it locally isn't enough —
      // without tombstoning the id, a stale remote copy (or another
      // device/tab that hasn't migrated yet) can resurrect it right back
      // via the ordinary cross-device merge.
      const oldStyleRe = /^cc-(.+)-(\d{4}-\d{2})$/;
      const migratedBaselineBump = {};
      const migratedAwayIds = [];
      next = next.filter((d) => {
        const m = oldStyleRe.exec(d.id);
        if (!m) return true;
        const card = m[1];
        if (d.paid) migratedBaselineBump[card] = (migratedBaselineBump[card] || 0) + Number(d.amount);
        migratedAwayIds.push(d.id);
        changed = true;
        return false;
      });
      if (migratedAwayIds.length > 0) {
        setDeletedDebtIds((prev2) => Array.from(new Set([...prev2, ...migratedAwayIds])));
      }
      let baseline = cardOwedBaseline;
      if (Object.keys(migratedBaselineBump).length > 0) {
        baseline = { ...cardOwedBaseline };
        Object.entries(migratedBaselineBump).forEach(([card, amt]) => { baseline[card] = (baseline[card] || 0) + amt; });
        setCardOwedBaseline(baseline);
      }
      creditCards.forEach((c) => {
        const cardName = c.name;
        const id = "cc-card-" + cardName;
        const dueDay = Math.min(cardSettings[cardName]?.dueDay ?? 5, 28);
        const now = new Date();
        let candidateYm = ymOf(now);
        let candidateDate = dateForDayInMonth(candidateYm, dueDay);
        if (candidateDate < todayStr()) { candidateYm = addMonths(candidateYm, 1); candidateDate = dateForDayInMonth(candidateYm, dueDay); }
        const autoAmt = computeCardOwed(transactions, baseline, cardSettings, cardName, candidateYm);
        const existingLineItems = next.find((d) => d.id === id)?.lineItems || [];
        const lineItemsTotal = activeLineItemsTotal(existingLineItems, candidateYm);
        const totalAmt = autoAmt + lineItemsTotal;
        const label = `Credit Card ${cardName}`;
        const idx = next.findIndex((d) => d.id === id);
        if (idx === -1) {
          next.push({ id, name: label, amount: totalAmt, dueDate: candidateDate, recurring: true, paid: false, auto: true, card: cardName, lineItems: [] });
          changed = true;
        } else if (!next[idx].dismissed) {
          const updates = {};
          if (next[idx].amount !== totalAmt) updates.amount = totalAmt;
          if (next[idx].dueDate !== candidateDate) updates.dueDate = candidateDate;
          if (next[idx].name !== label) updates.name = label;
          if (!next[idx].lineItems) updates.lineItems = [];
          if (Object.keys(updates).length > 0) {
            next[idx] = { ...next[idx], ...updates };
            changed = true;
          }
        }
      });
      // A card removed from Settings: drop its debt entry too, unless it
      // still has real state worth keeping (paid history or line items).
      next = next.filter((d) => {
        if (!d.auto || !d.id.startsWith("cc-card-")) return true;
        if (creditCards.some((c) => c.name === d.card)) return true;
        if (d.dismissed || (d.lineItems && d.lineItems.length > 0)) return true;
        changed = true;
        return false;
      });
      return changed ? next : prev;
    });
  }, [transactions, cardSettings, creditCards, cardOwedBaseline]);

  useEffect(() => {
    if (profiles.length === 1 && !activeProfileId) setActiveProfileId(profiles[0].id);
  }, [profiles, activeProfileId]);

  const streak = useMemo(() => computeStreak(transactions), [transactions]);
  const points = transactions.length * 5 + savings.length * 15 + debts.filter((d) => d.paid).length * 10;

  const monthKey = ymOf(new Date());
  const monthSpend = useMemo(() => {
    const m = {};
    transactions.forEach((t) => { if (t.type === "expense" && t.date.slice(0, 7) === monthKey) { const k = resolveMainCategory(expenseCategories, t.category); m[k] = (m[k] || 0) + Number(t.amount); } });
    return m;
  }, [transactions, monthKey, expenseCategories]);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalSpentBudgeted = Object.entries(budgets).reduce((a, [k]) => a + (monthSpend[k] || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpentBudgeted / totalBudget) * 100)) : null;

  // Auto-sync the savings/invest plan targets into the Savings & Investment
  // tab for the real current month. This used to live inside the Fix Cost
  // tab's own component and only ran while that tab was mounted — moved up
  // here so it keeps working (and always reflects the actual current month)
  // regardless of whether Fix Cost is in the navigation.
  useEffect(() => {
    if (!loadedRef.current) return;
    const planIncomeThisMonth = itemsForMonth(planIncomeItems, monthKey).reduce((a, i) => a + effectiveAmount(i, monthKey, planOverrides), 0);
    const savingAmt = savingsPlan.saving.mode === "percent" ? Math.round(planIncomeThisMonth * (savingsPlan.saving.value / 100)) : (Number(savingsPlan.saving.value) || 0);
    const investAmt = savingsPlan.invest.mode === "percent" ? Math.round(planIncomeThisMonth * (savingsPlan.invest.value / 100)) : (Number(savingsPlan.invest.value) || 0);
    setSavings((prev) => {
      let next = [...prev];
      let changed = false;
      [
        ["plan-saving-" + monthKey, "saving", savingAmt, `Planned savings (${monthLabel(monthKey)})`],
        ["plan-invest-" + monthKey, "investment", investAmt, `Planned investment (${monthLabel(monthKey)})`],
      ].forEach(([id, kind, amt, name]) => {
        const idx = next.findIndex((s) => s.id === id);
        if (amt > 0) {
          if (idx === -1) { next.push({ id, kind, name, amount: amt, date: monthKey + "-01", target: null, auto: true }); changed = true; }
          else if (next[idx].amount !== amt) { next[idx] = { ...next[idx], amount: amt }; changed = true; }
        } else if (idx !== -1) { next.splice(idx, 1); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [planIncomeItems, planOverrides, savingsPlan, monthKey]);

  const alerts = useMemo(() => {
    const list = [];
    Object.entries(budgets).forEach(([cat, limit]) => {
      if (!limit) return;
      const spent = monthSpend[cat] || 0;
      if (spent >= limit) {
        const meta = catMeta(expenseCategories, cat);
        list.push({ id: "b-" + cat, level: "hot", text: `"${meta.label}" spending has hit the budget you set (${fmtTHB(spent)} / ${fmtTHB(limit)})` });
      } else if (spent >= limit * 0.8) {
        const meta = catMeta(expenseCategories, cat);
        list.push({ id: "b-" + cat, level: "warn", text: `"${meta.label}" is close to its budget (${fmtTHB(spent)} / ${fmtTHB(limit)})` });
      }
    });
    debts.forEach((d) => {
      if (d.paid) return;
      const diff = daysUntil(d.dueDate);
      if (diff < 0) list.push({ id: "d-" + d.id, level: "hot", text: `"${d.name}" is ${Math.abs(diff)} days overdue (${fmtTHB(d.amount)})` });
      else if (diff <= 3) list.push({ id: "d-" + d.id, level: "warn", text: `"${d.name}" is due in ${diff} days (${fmtTHB(d.amount)})` });
    });
    investPlan.items.forEach((item) => {
      if (item.executed) return;
      const st = investItemStatus(item);
      const amt = investItemAmount(item, investPlan.totalPool);
      if (st.level === "hot") list.push({ id: "inv-" + item.id, level: "hot", text: `"${item.name}" investment is due (${fmtTHB(amt)}) — ${st.text}` });
      else if (st.level === "warn") list.push({ id: "inv-" + item.id, level: "warn", text: `"${item.name}" investment coming up ${st.text} (${fmtTHB(amt)})` });
    });
    return list;
  }, [budgets, monthSpend, debts, monthKey, investPlan, expenseCategories]);

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedAlerts[a.id] || dismissedAlerts[a.id] < todayStr()),
    [alerts, dismissedAlerts]
  );
  const debtAlerts = useMemo(() => visibleAlerts.filter((a) => a.id.startsWith("d-")), [visibleAlerts]);
  function dismissAlert(a) {
    setDismissedAlerts((prev) => ({ ...prev, [a.id]: addMonthsToDate(todayStr(), 1) }));
  }

  // Clear the Debts tab notification badge once the user actually visits it,
  // instead of leaving it stuck on even after they've seen the reminders.
  useEffect(() => {
    if (!loadedRef.current || tab !== "debts" || debtAlerts.length === 0) return;
    setDismissedAlerts((prev) => {
      const next = { ...prev };
      debtAlerts.forEach((a) => { next[a.id] = addMonthsToDate(todayStr(), 1); });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!ready) {
    return (
      <div style={{ background: C.bg, minHeight: 480, fontFamily: "'Prompt', sans-serif" }} className="w-full flex items-center justify-center p-10">
        <style>{FONT_IMPORT}</style>
        <p style={{ color: C.inkSoft }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, fontFamily: "'Prompt', sans-serif", color: C.ink }} className="w-full min-h-full pb-24">
      <style>{FONT_IMPORT}</style>
      {toast && (
        <div style={{ position: "fixed", top: 14, right: 10, zIndex: 250, background: C.teal, color: "#fff" }} className="px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2">
          <CheckCircle2 size={16} />{toast}
        </div>
      )}
      <Header streak={streak} points={points} alertCount={visibleAlerts.length} budgetPct={budgetPct}
        activeProfile={profileById(profiles, activeProfileId)} onOpenProfilePicker={() => setShowProfilePicker(true)}
        onOpenSettings={() => setShowSettingsPage(true)}
        syncStatus={syncStatus} syncUsername={syncUsername} syncError={syncError} onOpenSyncSettings={onOpenSyncSettings} buildVersion={buildVersion} />
      <main className="px-4 md:px-6 max-w-2xl mx-auto flex flex-col gap-4 mt-4">
        {tab === "overview" && (
          <Overview transactions={transactions} alerts={visibleAlerts} onDismissAlert={dismissAlert} setTab={setTab} expenseCategories={expenseCategories} banks={banks} bankBalances={bankBalances} cashBalance={cashBalance} />
        )}
        {tab === "transactions" && (
          <TransactionsTab transactions={transactions} setTransactions={setTransactions} budgets={budgets} setTab={setTab} expenseCategories={expenseCategories} creditCards={creditCards} banks={banks} setDeletedTransactionIds={setDeletedTransactionIds} showToast={showToast} />
        )}
        {tab === "savings" && (
          <SavingsTab savings={savings} setSavings={setSavings} investPlan={investPlan} setInvestPlan={setInvestPlan} holdings={holdings} setHoldings={setHoldings} banks={banks} bankBalances={bankBalances} setBankBalances={setBankBalances} transactions={transactions} setTransactions={setTransactions} cashBalance={cashBalance} setCashBalance={setCashBalance} setDeletedSavingsIds={setDeletedSavingsIds} setDeletedHoldingIds={setDeletedHoldingIds} setDeletedInvestItemIds={setDeletedInvestItemIds} showToast={showToast} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} creditCards={creditCards} />
        )}
        {tab === "debts" && (
          <DebtsTab debts={debts} setDebts={setDebts} creditCards={creditCards} banks={banks} setTransactions={setTransactions} setDeletedDebtIds={setDeletedDebtIds} setPlanOverrides={setPlanOverrides} showToast={showToast} cardOwedBaseline={cardOwedBaseline} setCardOwedBaseline={setCardOwedBaseline} transactions={transactions} cardSettings={cardSettings} />
        )}
        {tab === "budgets" && (
          <BudgetsTab budgets={budgets} setBudgets={setBudgets} monthSpend={monthSpend} expenseCategories={expenseCategories} />
        )}
        {tab === "homeLoan" && (
          <HomePlanningTab homeLoan={homeLoan} setHomeLoan={setHomeLoan} planOverrides={planOverrides} setPlanOverrides={setPlanOverrides} planFixCostItems={planFixCostItems} setPlanFixCostItems={setPlanFixCostItems} debts={debts} showToast={showToast} />
        )}
      </main>
      <BottomNav tab={tab} setTab={setTab} debtAlertCount={debtAlerts.length} />
      {showProfilePicker && (
        <ProfilePickerModal
          profiles={profiles} setProfiles={setProfiles}
          activeProfileId={activeProfileId} setActiveProfileId={setActiveProfileId}
          onClose={() => setShowProfilePicker(false)}
        />
      )}
      {showSettingsPage && (
        <SettingsPage
          expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories}
          creditCards={creditCards} setCreditCards={setCreditCards}
          cardSettings={cardSettings} setCardSettings={setCardSettings}
          banks={banks} setBanks={setBanks} bankBalances={bankBalances} setBankBalances={setBankBalances}
          transactions={transactions} debts={debts}
          setTransactions={setTransactions} setDebts={setDebts}
          setDeletedBankNames={setDeletedBankNames} setDeletedCardNames={setDeletedCardNames} setDeletedCategoryKeys={setDeletedCategoryKeys}
          showToast={showToast}
          onClose={() => setShowSettingsPage(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Header({ streak, points, alertCount, budgetPct, activeProfile, onOpenProfilePicker, onOpenSettings, syncStatus, syncUsername, syncError, onOpenSyncSettings, buildVersion }) {
  const syncLabel = syncStatus && syncStatus.mode === "cloud"
    ? (syncStatus.connected ? `☁️ ${syncUsername || "My personal info"}` : "⚠️ Offline")
    : syncStatus ? "💾 Saved locally" : null;
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, borderRadius: "0 0 28px 28px" }} className="px-5 pt-6 pb-5 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-left">
          <button onClick={onOpenProfilePicker} className="shrink-0">
            <div style={{ background: activeProfile ? activeProfile.color : C.yellow }} className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm">
              {activeProfile ? (
                <span style={{ fontFamily: "'Prompt', sans-serif", color: "#fff" }} className="text-lg font-bold">{activeProfile.name.trim()[0]?.toUpperCase()}</span>
              ) : (
                <Wallet size={20} color={C.purpleDeep} strokeWidth={2.3} />
              )}
            </div>
          </button>
          <div>
            <button onClick={onOpenProfilePicker} className="text-left">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-lg font-bold leading-tight">{activeProfile ? `Hi, ${activeProfile.name} 👋` : "Hi 👋"}</p>
            </button>
            {syncLabel ? (
              <button onClick={onOpenSyncSettings} className="flex items-center gap-1.5 mt-0.5">
                <span style={{ background: "rgba(255,255,255,0.18)" }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">{syncLabel}</span>
                {buildVersion && <span style={{ color: "#DCDCFB" }} className="text-[9px] font-semibold">v{buildVersion}</span>}
              </button>
            ) : (
              <p style={{ color: "#DCDCFB" }} className="text-xs leading-tight">{activeProfile ? "Tap to switch user" : "Tap to set your name"}</p>
            )}
            {syncError && (
              <button onClick={onOpenSyncSettings} style={{ color: "#FFD9CC" }} className="text-[10px] font-semibold text-left mt-0.5 block">{syncError}</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenSettings} style={{ background: "rgba(255,255,255,0.18)" }} className="p-1.5 rounded-full">
            <Settings size={16} />
          </button>
        </div>
      </div>
      {budgetPct !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1" style={{ color: "#DCDCFB" }}>
            <span>This month's budget</span><span className="font-bold">{budgetPct}%</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.25)", height: 8, borderRadius: 8 }}>
            <div style={{ width: `${budgetPct}%`, background: C.yellow, height: 8, borderRadius: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, setTab, debtAlertCount }) {
  const items = [
    { key: "overview", label: "Overview", icon: Wallet },
    { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { key: "savings", label: "Savings", icon: PiggyBank },
    { key: "debts", label: "Debts", icon: Bell, badge: debtAlertCount },
    { key: "budgets", label: "Budget", icon: TrendingDown },
    { key: "homeLoan", label: "Home Loan", icon: Home },
  ];
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, borderRadius: "28px 28px 0 0", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }} className="fixed bottom-0 left-0 right-0 z-40 shadow-[0_-4px_20px_rgba(75,63,199,0.35)]">
      <div className="flex gap-1 overflow-x-auto max-w-2xl mx-auto px-2 pt-3.5" style={{ scrollbarWidth: "none" }}>
        {items.map((it) => {
          const active = tab === it.key;
          const Icon = it.icon;
          return (
            <button key={it.key} onClick={() => setTab(it.key)} className="flex flex-col items-center gap-1.5 px-3.5 py-1 shrink-0 relative min-w-[68px]" style={{ opacity: active ? 1 : 0.62 }}>
              <Icon size={20} color="#fff" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] whitespace-nowrap leading-none text-white" style={{ fontWeight: active ? 800 : 600 }}>{it.label}</span>
              {!!it.badge && (
                <span style={{ background: C.coral, color: "#fff", border: `1.5px solid ${C.purpleDeep}` }} className="absolute top-0 right-2 text-[9px] leading-none rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Profile picker — lightweight multi-person "who's using this"     */
/*  identity + invite flow (share the same URL/sync code)            */
/* ---------------------------------------------------------------- */
function ProfilePickerModal({ profiles, setProfiles, activeProfileId, setActiveProfileId, onClose }) {
  const mine = profiles[0] || null;
  const [name, setName] = useState(mine?.name || "");
  const [color, setColor] = useState(mine?.color || PROFILE_COLORS[0]);

  function save() {
    const nm = name.trim();
    if (!nm) { setProfiles([]); setActiveProfileId(null); onClose(); return; }
    const p = { id: mine?.id || uid(), name: nm, color };
    setProfiles([p]);
    setActiveProfileId(p.id);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg mb-1">Your name</p>
        <p className="text-xs mb-4" style={{ color: C.inkSoft }}>Only used for the greeting — all data in this app is yours alone anyway</p>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, marginBottom: 12 }} autoFocus />
        <p className="text-xs font-bold mb-1.5" style={{ color: C.inkSoft }}>Color</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {PROFILE_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{ background: c, width: 28, height: 28, borderRadius: 28, border: color === c ? `3px solid ${C.ink}` : "3px solid transparent" }} />
          ))}
        </div>
        <button onClick={save} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-bold mb-3"><CheckCircle2 size={16} /> Save</button>

        <button onClick={onClose} style={{ color: C.inkSoft }} className="w-full py-2 text-xs font-bold">Close this window</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Overview({ transactions, alerts, onDismissAlert, setTab, expenseCategories, banks = [], bankBalances = {}, cashBalance = 0 }) {
  const [period, setPeriod] = useState("month");
  const [ref, setRef] = useState(new Date());
  const TREND_MONTHS = 6;

  const hasToday = transactions.some((t) => t.date === todayStr());

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const nowYm = ymOf(now);
    const months = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      months.push(ymOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return months.map((ym) => {
      const byCat = {};
      let total = 0;
      transactions
        .filter((t) => t.type === "expense" && t.payment !== "credit" && t.date.slice(0, 7) === ym)
        .forEach((t) => {
          const mainCat = resolveMainCategory(expenseCategories, t.category);
          byCat[mainCat] = (byCat[mainCat] || 0) + Number(t.amount);
          total += Number(t.amount);
        });
      const segments = expenseCategories
        .map((c) => ({ key: c.key, label: c.label, color: c.color, value: byCat[c.key] || 0 }))
        .filter((s) => s.value > 0)
        .sort((a, b) => b.value - a.value);
      const [y, m] = ym.split("-").map(Number);
      return { ym, label: MONTH_ABBR_TH[m - 1], value: total, segments, isCurrent: ym === nowYm };
    });
  }, [transactions, expenseCategories]);
  const trendAvg = monthlyTrend.length ? monthlyTrend.reduce((a, m) => a + m.value, 0) / monthlyTrend.length : 0;
  const trendCats = useMemo(() => {
    const seen = new Map();
    monthlyTrend.forEach((m) => m.segments.forEach((s) => { if (!seen.has(s.key)) seen.set(s.key, s); }));
    return Array.from(seen.values());
  }, [monthlyTrend]);
  const trendMax = Math.max(...monthlyTrend.map((m) => m.value), 1);

  const range = useMemo(() => {
    const d = new Date(ref);
    if (period === "day") { const key = toLocalDateStr(d); return { match: (t) => t.date === key, label: thDate(key) }; }
    if (period === "year") { const y = d.getFullYear(); return { match: (t) => parseLocalDate(t.date).getFullYear() === y, label: `Year ${y}` }; }
    const y = d.getFullYear(), m = d.getMonth();
    return { match: (t) => { const dt = parseLocalDate(t.date); return dt.getFullYear() === y && dt.getMonth() === m; }, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }, [period, ref]);

  const filtered = transactions.filter(range.match);
  const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = filtered.filter((t) => t.type === "expense" && t.payment !== "credit").reduce((s, t) => s + Number(t.amount), 0);
  const creditExpense = filtered.filter((t) => t.type === "expense" && t.payment === "credit").reduce((s, t) => s + Number(t.amount), 0);

  const daysInPeriod = useMemo(() => {
    const now = new Date();
    if (period === "day") return 1;
    if (period === "year") {
      const y = ref.getFullYear();
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      const totalDays = isLeap ? 366 : 365;
      if (y === now.getFullYear()) {
        const startOfYear = new Date(y, 0, 1);
        const elapsed = Math.floor((now - startOfYear) / 86400000) + 1;
        return Math.max(1, Math.min(elapsed, totalDays));
      }
      return totalDays;
    }
    const y = ref.getFullYear(), m = ref.getMonth();
    const totalDaysInMonth = new Date(y, m + 1, 0).getDate();
    if (y === now.getFullYear() && m === now.getMonth()) return Math.max(1, now.getDate());
    return totalDaysInMonth;
  }, [period, ref]);

  const byCat = useMemo(() => {
    const m = {};
    filtered.filter((t) => t.type === "expense").forEach((t) => { const k = resolveMainCategory(expenseCategories, t.category); m[k] = (m[k] || 0) + Number(t.amount); });
    return Object.entries(m).map(([k, v]) => ({ key: k, name: catMeta(expenseCategories, k).label, icon: catMeta(expenseCategories, k).icon, value: v, avgPerDay: v / daysInPeriod, color: categoryColor(expenseCategories, k) })).sort((a, b) => b.value - a.value);
  }, [filtered, daysInPeriod, expenseCategories]);
  const byCatTotal = byCat.reduce((a, c) => a + c.value, 0);

  function shift(delta) {
    const d = new Date(ref);
    if (period === "day") d.setDate(d.getDate() + delta);
    if (period === "month") d.setMonth(d.getMonth() + delta);
    if (period === "year") d.setFullYear(d.getFullYear() + delta);
    setRef(d);
  }

  return (
    <div className="flex flex-col gap-4">
      {!hasToday && (
        <button onClick={() => setTab("transactions")} style={{ background: `linear-gradient(135deg, ${C.yellow}, ${C.yellowDeep})` }} className="w-full text-left rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p style={{ fontFamily: "'Prompt', sans-serif", color: C.purpleDeep }} className="text-lg font-bold mb-1">Nothing logged today yet</p>
            <p className="text-sm" style={{ color: "#7A5B00" }}>Tap to log today's income/expense</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.35)" }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0">
            <Plus size={20} color={C.purpleDeep} />
          </div>
        </button>
      )}

      {alerts.length > 0 && <AlertBanner alerts={alerts} onDismiss={onDismissAlert} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-full overflow-hidden p-1" style={{ background: C.card, border: `1px solid ${C.graySoft}` }}>
          {[["day", "day"], ["month", "Month"], ["year", "year"]].map(([k, label]) => (
            <button key={k} onClick={() => setPeriod(k)} style={{ background: period === k ? C.purple : "transparent", color: period === k ? "#fff" : C.inkSoft }} className="px-3.5 py-1.5 text-sm font-bold rounded-full">{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
          <button onClick={() => shift(-1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-1.5 rounded-full"><ChevronLeft size={14} /></button>
          <span style={{ fontFamily: "'Prompt', sans-serif", color: C.ink }} className="font-bold">{range.label}</span>
          <button onClick={() => shift(1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-1.5 rounded-full"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` }} className="rounded-3xl p-5 shadow-sm text-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>Balance now</p>
          <span style={{ background: "rgba(255,255,255,0.18)" }} className="text-[11px] px-2.5 py-1 rounded-full">{range.label}</span>
        </div>
        {(() => {
          const liquidTotal = computeCashBalance(transactions, cashBalance) + banks.reduce((a, b) => a + computeBankBalance(transactions, bankBalances, b.name), 0);
          return <p style={{ fontFamily: "'Prompt', sans-serif", color: liquidTotal < 0 ? "#FF5C5C" : "#fff" }} className="text-3xl mb-1">{fmtTHB(liquidTotal)}</p>;
        })()}
        <p className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>Cash + all banks (matches the total on the Saving page)</p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.22)" }} className="flex items-center pt-3 gap-4">
          <div className="flex-1 flex items-center gap-2">
            <div style={{ background: "rgba(255,255,255,0.18)" }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={15} /></div>
            <div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Income</p>
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-sm">{fmtTHB(income)}</p>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.22)", width: 1, alignSelf: "stretch" }} />
          <div className="flex-1 flex items-center gap-2">
            <div style={{ background: "rgba(255,255,255,0.18)" }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"><TrendingDown size={15} /></div>
            <div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Expense</p>
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-sm">{fmtTHB(expense)}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">Expense breakdown by category</p>
          {byCatTotal > 0 && <span className="text-xs font-bold" style={{ color: C.inkSoft }}>Avg {fmtTHB(byCatTotal / daysInPeriod)}/day</span>}
        </div>
        {byCat.length === 0 ? <EmptyNote text="No expenses in this period" /> : (
          <div className="flex flex-col items-center gap-5">
            <div style={{ width: "100%", maxWidth: 260, height: 260, position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={3} cornerRadius={8}>
                    {byCat.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtTHB(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <p className="text-xs font-semibold" style={{ color: C.inkSoft }}>{period === "day" ? "Today" : period === "month" ? "This month" : "This year"}</p>
                <p style={{ fontFamily: "'Prompt', sans-serif", color: C.ink }} className="text-2xl font-extrabold">{fmtTHB(byCatTotal)}</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              {byCat.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold"><span style={{ width: 10, height: 10, borderRadius: 10, background: e.color }} />{e.name}</span>
                  <div className="text-right">
                    <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold leading-tight">{fmtTHB(e.value)}</p>
                    <p className="text-[10px] leading-tight" style={{ color: C.inkSoft }}>Avg {fmtTHB(e.avgPerDay)}/day</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-1">Compare monthly spending</p>
        <p className="text-[11px] mb-4" style={{ color: C.inkSoft }}>Avg {fmtTHB(trendAvg)}/month · Last 6 months · Colored by category · Cash/transfer only (excludes credit card)</p>
        <div className="flex items-end justify-between gap-2.5" style={{ height: 160 }}>
          {monthlyTrend.map((m, i) => {
            const totalPct = trendMax > 0 ? Math.max(m.value > 0 ? 4 : 0, Math.round((m.value / trendMax) * 100)) : 0;
            const title = m.segments.length > 0
              ? m.segments.map((s) => `${s.label}: ${fmtTHB(s.value)}`).join("\n") + `\nTotal: ${fmtTHB(m.value)}`
              : "No expenses yet";
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div title={title} style={{ background: m.value > 0 ? "#1B1B2F" : C.graySoft, width: "100%", maxWidth: 34, height: 120, borderRadius: 999, position: "relative", overflow: "hidden", opacity: m.isCurrent ? 1 : 0.82 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${totalPct}%`, borderRadius: 999, overflow: "hidden", display: "flex", flexDirection: "column-reverse" }}>
                    {m.segments.map((s) => (
                      <div key={s.key} style={{ background: s.color, height: `${m.value > 0 ? (s.value / m.value) * 100 : 0}%`, width: "100%" }} />
                    ))}
                  </div>
                </div>
                <span style={{ color: m.isCurrent ? C.ink : C.inkSoft, fontWeight: m.isCurrent ? 800 : 600 }} className="text-[11px]">{m.label}</span>
              </div>
            );
          })}
        </div>
        {trendCats.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4">
            {trendCats.map((c) => (
              <span key={c.key} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.inkSoft }}>
                <span style={{ background: c.color, width: 8, height: 8, borderRadius: 8 }} />{c.label}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: C.card }} className="rounded-2xl p-3 shadow-sm flex flex-col gap-2">
      <div style={{ background: color }} className="w-8 h-8 rounded-xl flex items-center justify-center">
        <Icon size={15} color="#fff" />
      </div>
      <div>
        <p className="text-[11px] font-semibold" style={{ color: C.inkSoft }}>{label}</p>
        <p style={{ fontFamily: "'Prompt', sans-serif", color }} className="text-sm font-bold truncate">{fmtTHB(value)}</p>
      </div>
    </div>
  );
}

function AlertBanner({ alerts, onDismiss }) {
  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a) => (
        <div key={a.id} style={{ background: a.level === "hot" ? C.coral : C.yellow }} className="rounded-2xl px-4 py-3 flex items-center gap-2.5 text-sm font-semibold text-white shadow-sm">
          <AlertTriangle size={16} className="shrink-0" color="#fff" />
          <span style={{ color: a.level === "hot" ? "#fff" : "#5C4400" }} className="flex-1">{a.text}</span>
          {onDismiss && (
            <button onClick={() => onDismiss(a)} style={{ color: a.level === "hot" ? "#fff" : "#5C4400" }} className="shrink-0 p-0.5 opacity-80 hover:opacity-100">
              <X size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyNote({ text }) { return <p className="text-sm py-6 text-center" style={{ color: C.inkSoft }}>{text}</p>; }

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseLocalDate(from || todayStr()));
  const [tempFrom, setTempFrom] = useState(from || null);
  const [tempTo, setTempTo] = useState(to || null);

  function openPicker() {
    setTempFrom(from || null);
    setTempTo(to || null);
    setViewDate(parseLocalDate(from || todayStr()));
    setOpen(true);
  }
  function dayClick(dStr) {
    if (!tempFrom || tempTo) { setTempFrom(dStr); setTempTo(null); return; }
    if (dStr < tempFrom) { setTempFrom(dStr); return; }
    setTempTo(dStr);
  }
  function apply() {
    onChange(tempFrom || "", tempTo || tempFrom || "");
    setOpen(false);
  }
  function clear() {
    setTempFrom(null); setTempTo(null);
    onChange("", "");
    setOpen(false);
  }
  function shiftMonth(n) { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + n, 1)); }

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysCount = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);

  const label = !from ? "Select date range" : (to && to !== from) ? `${thDate(from)} - ${thDate(to)}` : thDate(from);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={openPicker} style={{ ...inputStyle, width: "auto", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} className="text-xs font-semibold">
        <Calendar size={13} color={C.inkSoft} />{label}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "110%", left: 0, background: C.card, borderRadius: 20, padding: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", zIndex: 201, width: 288 }}>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => shiftMonth(-1)} style={{ background: C.graySoft }} className="p-1.5 rounded-full"><ChevronLeft size={14} /></button>
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-sm font-bold">{MONTH_ABBR_TH[m]} {y}</p>
              <button onClick={() => shiftMonth(1)} style={{ background: C.graySoft }} className="p-1.5 rounded-full"><ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d} className="text-[10px] font-bold" style={{ color: C.inkSoft }}>{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const dStr = `${y}-${pad2(m + 1)}-${pad2(d)}`;
                const inRange = tempFrom && tempTo && dStr >= tempFrom && dStr <= tempTo;
                const isEdge = dStr === tempFrom || dStr === tempTo;
                return (
                  <button key={i} onClick={() => dayClick(dStr)}
                    style={{
                      background: isEdge ? C.purple : inRange ? C.purpleSoft : "transparent",
                      color: isEdge ? "#fff" : C.ink,
                      borderRadius: 999, width: 30, height: 30, fontSize: 12, fontWeight: isEdge ? 800 : 600,
                    }} className="mx-auto flex items-center justify-center">
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={clear} style={{ background: C.graySoft, color: C.inkSoft }} className="flex-1 py-2 rounded-full text-xs font-bold">Clear</button>
              <button onClick={apply} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex-1 py-2 rounded-full text-xs font-bold">OK</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function TransactionsTab({ transactions, setTransactions, budgets = {}, setTab, expenseCategories, creditCards, banks = [], setDeletedTransactionIds, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [payment, setPayment] = useState(null);
  const [card, setCard] = useState(null);
  const [bank, setBank] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const now0 = new Date();
  const defaultDateFrom = toLocalDateStr(new Date(now0.getFullYear(), now0.getMonth(), 1));
  const defaultDateTo = toLocalDateStr(new Date(now0.getFullYear(), now0.getMonth() + 1, 0));
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [catError, setCatError] = useState(false);
  const [payError, setPayError] = useState(false);
  const [cardError, setCardError] = useState(false);
  const [budgetAlert, setBudgetAlert] = useState(null);
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const categories = type === "expense" ? expenseCategories : INCOME_CATEGORIES;
  const activeSubcats = type === "expense" && category ? catMeta(expenseCategories, category)?.subcategories : null;

  function switchType(t) { setType(t); setCategory(null); setSubcategory(null); setCatError(false); }
  function pickCategory(key) {
    setCategory(key); setSubcategory(null); setCatError(false);
    const meta = catMeta(expenseCategories, key);
    if (meta?.subcategories?.length) setShowSubcatModal(true);
  }
  function pickPayment(k) {
    setPayment(k); setPayError(false);
    if (k === "credit") { setCard(null); setShowCardModal(true); }
    else if (k === "transfer" && banks.length > 0) { setBank(null); setShowBankModal(true); }
  }
  function resetForm() {
    setEditingId(null); setType("expense"); setAmount(""); setCategory(null); setSubcategory(null); setCatError(false);
    setPayment(null); setPayError(false); setCard(null); setCardError(false); setBank(null); setDate(todayStr()); setNote("");
  }
  function startEdit(t) {
    setEditingId(t.id); setType(t.type); setAmount(String(t.amount)); setCategory(t.category); setSubcategory(t.subcategory || null);
    setPayment(t.payment); setCard(t.card || null); setBank(t.bank || null); setDate(t.date); setNote(t.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (!category) { setCatError(true); return; }
    if (!payment) { setPayError(true); return; }
    if (payment === "credit" && !card) { setCardError(true); return; }
    const wasEditing = !!editingId;
    const ym = date.slice(0, 7);
    const limit = type === "expense" ? budgets[category] : null;
    if (limit) {
      const monthCatSpend = (excludeId) => transactions
        .filter((t) => t.type === "expense" && t.category === category && t.date.slice(0, 7) === ym && t.id !== excludeId)
        .reduce((a, t) => a + Number(t.amount), 0);
      const prevSpent = monthCatSpend(wasEditing ? editingId : null);
      const newSpent = prevSpent + amt;
      if (prevSpent < limit && newSpent >= limit) {
        setBudgetAlert({ category, spent: newSpent, limit });
      }
    }
    if (editingId) {
      setTransactions((prev) => prev.map((t) => t.id === editingId
        ? { ...t, type, amount: amt, category, subcategory: type === "expense" ? subcategory : null, date, payment, card: payment === "credit" ? card : null, bank: payment === "transfer" ? bank : null, note: note.trim() }
        : t));
    } else {
      setTransactions((prev) => [{ id: uid(), type, amount: amt, category, subcategory: type === "expense" ? subcategory : null, date, payment, card: payment === "credit" ? card : null, bank: payment === "transfer" ? bank : null, note: note.trim() }, ...prev]);
    }
    showToast(wasEditing ? "Edited successfully ✓" : "Saved successfully ✓");
    resetForm();
  }
  function remove(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeletedTransactionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (editingId === id) resetForm();
    showToast("Deleted successfully ✓");
  }

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const byType = filter === "all" ? sorted : sorted.filter((t) => t.type === filter);
  let visible = byType;
  if (categoryFilter.length > 0) visible = visible.filter((t) => categoryFilter.includes(resolveMainCategory(expenseCategories, t.category)));
  if (dateFrom) visible = visible.filter((t) => t.date >= dateFrom);
  if (dateTo) visible = visible.filter((t) => t.date <= dateTo);
  const visibleIncome = visible.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);
  const visibleExpense = visible.filter((t) => t.type === "expense").reduce((a, t) => a + Number(t.amount), 0);

  return (
    <div className="flex flex-col gap-4">
      {budgetAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setBudgetAlert(null)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: C.coralSoft, width: 56, height: 56, borderRadius: 56 }} className="flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={26} color={C.coral} />
            </div>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg mb-1.5">Over budget!</p>
            <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
              Category <b style={{ color: C.ink }}>{catMeta(expenseCategories, budgetAlert.category).label}</b> has spent <b style={{ color: C.coral, fontFamily: "'Prompt', sans-serif" }}>{fmtTHB(budgetAlert.spent)}</b> of the <b style={{ color: C.ink }}>{fmtTHB(budgetAlert.limit)}</b> budget this month
            </p>
            <div className="flex gap-2">
              <button onClick={() => setBudgetAlert(null)} style={{ background: C.graySoft, color: C.inkSoft }} className="flex-1 py-2.5 rounded-full text-sm font-bold">Got it</button>
              {setTab && (
                <button onClick={() => { setBudgetAlert(null); setTab("budgets"); }} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex-1 py-2.5 rounded-full text-sm font-bold">View Budget</button>
              )}
            </div>
          </div>
        </div>
      )}
      {showSubcatModal && activeSubcats && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowSubcatModal(false)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Select subcategory</p>
              <button onClick={() => setShowSubcatModal(false)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-4 gap-y-4 gap-x-1">
              <button onClick={() => { setSubcategory(null); setShowSubcatModal(false); }} className="flex flex-col items-center gap-1.5">
                <div style={{ background: !subcategory ? C.purple : "#fff", border: `1.5px solid ${C.purple}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                  <MoreHorizontal size={19} color={!subcategory ? "#fff" : C.purple} />
                </div>
                <span style={{ color: !subcategory ? C.purple : C.inkSoft }} className="text-[11px] font-bold">General</span>
              </button>
              {activeSubcats.map((s) => {
                const SIcon = resolveIcon(s.icon); const activeSub = subcategory === s.key;
                return (
                  <button key={s.key} onClick={() => { setSubcategory(s.key); setShowSubcatModal(false); }} className="flex flex-col items-center gap-1.5">
                    <div style={{ background: activeSub ? C.purple : "#fff", border: `1.5px solid ${C.purple}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                      <SIcon size={19} color={activeSub ? "#fff" : C.purple} />
                    </div>
                    <span style={{ color: activeSub ? C.purple : C.inkSoft }} className="text-[11px] font-bold text-center leading-tight">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showCardModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowCardModal(false)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Select credit card</p>
              <button onClick={() => setShowCardModal(false)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
            </div>
            {creditCards.length === 0 ? (
              <EmptyNote text="No credit cards yet — add one on the Settings page" />
            ) : (
              <div className="grid grid-cols-3 gap-y-4 gap-x-1">
                {creditCards.map((cd) => {
                  const active = card === cd.name;
                  const CardIcon = resolveIcon(cd.icon);
                  return (
                    <button key={cd.name} onClick={() => { setCard(cd.name); setCardError(false); setShowCardModal(false); }} className="flex flex-col items-center gap-1.5">
                      <div style={{ background: active ? cd.color : "#fff", border: `1.5px solid ${cd.color}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                        <CardIcon size={19} color={active ? "#fff" : cd.color} />
                      </div>
                      <span style={{ color: active ? cd.color : C.inkSoft }} className="text-[11px] font-bold text-center leading-tight">{cd.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {showBankModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setShowBankModal(false)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Select bank</p>
              <button onClick={() => setShowBankModal(false)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-y-4 gap-x-1">
              <button onClick={() => { setBank(null); setShowBankModal(false); }} className="flex flex-col items-center gap-1.5">
                <div style={{ background: !bank ? C.purple : "#fff", border: `1.5px solid ${C.purple}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                  <MoreHorizontal size={19} color={!bank ? "#fff" : C.purple} />
                </div>
                <span style={{ color: !bank ? C.purple : C.inkSoft }} className="text-[11px] font-bold">Unspecified</span>
              </button>
              {banks.map((b) => {
                const active = bank === b.name;
                const BankIcon = resolveIcon(b.icon);
                return (
                  <button key={b.name} onClick={() => { setBank(b.name); setShowBankModal(false); }} className="flex flex-col items-center gap-1.5">
                    <div style={{ background: active ? b.color : "#fff", border: `1.5px solid ${b.color}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                      <BankIcon size={19} color={active ? "#fff" : b.color} />
                    </div>
                    <span style={{ color: active ? b.color : C.inkSoft }} className="text-[11px] font-bold text-center leading-tight">{b.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div style={{ background: C.card, border: editingId ? `2px solid ${C.purple}` : "none" }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{editingId ? "Edit item" : "Save new item"}</p>
          {editingId && <span style={{ background: C.purpleSoft, color: C.purpleDeep }} className="text-[11px] font-bold px-2.5 py-1 rounded-full">Editing</span>}
        </div>

        <div className="flex rounded-full overflow-hidden p-1 mb-3.5 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => switchType("expense")} style={{ background: type === "expense" ? C.coral : "transparent", color: type === "expense" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><TrendingDown size={14} />Expense</button>
          <button onClick={() => switchType("income")} style={{ background: type === "income" ? C.teal : "transparent", color: type === "income" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><TrendingUp size={14} />Income</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <Field label="Amount (THB)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
        </div>

        <Field label="Category">
          <div className="grid grid-cols-4 gap-y-3 gap-x-1">
            {categories.map((c) => {
              const Icon = resolveIcon(c.icon); const active = category === c.key;
              return (
                <button key={c.key} onClick={() => pickCategory(c.key)} className="flex flex-col items-center gap-1.5">
                  <div style={{ background: active ? C.purple : "#fff", border: `1.5px solid ${C.purple}` }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm">
                    <Icon size={20} color={active ? "#fff" : C.purple} strokeWidth={2} />
                  </div>
                  <span style={{ color: active ? C.purple : C.inkSoft }} className="text-[11px] font-bold text-center leading-tight">{c.label}</span>
                </button>
              );
            })}
          </div>
          {catError && <p className="text-xs font-semibold mt-2" style={{ color: C.coral }}>Please select a category before saving</p>}
          {activeSubcats && activeSubcats.length > 0 && (() => {
            const subMeta = subcategory ? subcategoryMeta(expenseCategories, category, subcategory) : null;
            const SubIcon = subMeta ? resolveIcon(subMeta.icon) : null;
            return (
              <button onClick={() => setShowSubcatModal(true)} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold mt-3 w-full">
                {SubIcon && <SubIcon size={14} />}
                <span>{subMeta ? `Subcategory: ${subMeta.label}` : "Select subcategory (optional)"}</span>
                <Pencil size={12} className="ml-auto" />
              </button>
            );
          })()}
        </Field>

        <div className="h-4" />
        <Field label="Payment method">
          <div className="grid grid-cols-3 gap-2">
            {[["cash", "Cash", Banknote], ["transfer", "Transfer", ArrowLeftRight], ["credit", "Credit Card", CreditCard]].map(([k, label, Icon]) => {
              const active = payment === k;
              return (
                <button key={k} onClick={() => pickPayment(k)}
                  style={{ background: active ? C.purple : "#fff", border: `1.5px solid ${C.purple}` }}
                  className="flex flex-col items-center gap-1 px-1 py-2.5 rounded-2xl shadow-sm">
                  <div style={{ background: active ? "rgba(255,255,255,0.25)" : C.purpleSoft }} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                    <Icon size={14} color={active ? "#fff" : C.purple} />
                  </div>
                  <span style={{ color: active ? "#fff" : C.purple }} className="text-[11px] font-bold text-center leading-tight whitespace-nowrap">{label}</span>
                </button>
              );
            })}
          </div>
          {payError && <p className="text-xs font-semibold mt-2 text-center" style={{ color: C.coral }}>Please select a payment method</p>}
          {payment === "credit" && (
            <div className="flex justify-center mt-3">
              <button onClick={() => setShowCardModal(true)} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold">
                <CreditCard size={14} />
                <span>{card ? `Card: ${card}` : "Select credit card"}</span>
                <Pencil size={12} />
              </button>
            </div>
          )}
          {cardError && <p className="text-xs font-semibold mt-2 text-center" style={{ color: C.coral }}>Please select a credit card</p>}
          {payment === "transfer" && banks.length > 0 && (
            <div className="flex justify-center mt-3">
              <button onClick={() => setShowBankModal(true)} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold">
                <Landmark size={14} />
                <span>{bank ? `Bank: ${bank}` : "Select bank (optional)"}</span>
                <Pencil size={12} />
              </button>
            </div>
          )}
        </Field>

        <div className="h-3" />
        <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. lunch with friends" style={inputStyle} /></Field>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={save} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm">
            {editingId ? <><CheckCircle2 size={16} /> Save changes</> : <><Plus size={16} /> Save item</>}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ background: C.graySoft, color: C.inkSoft }} className="px-4 py-2.5 rounded-full text-sm font-bold">Cancel</button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">All items</p>
          <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
        </div>

        <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` }} className="flex gap-2 rounded-2xl p-2 mb-3">
          {[["all", "All"], ["expense", "Expense"], ["income", "Income"]].map(([k, l]) => (
            <button key={k} onClick={() => { setFilter(k); setCategoryFilter([]); }}
              style={{ background: filter === k ? "#fff" : "transparent", color: filter === k ? C.purpleDeep : "#fff", border: filter === k ? "none" : "1.5px solid rgba(255,255,255,0.5)" }}
              className="flex-1 py-2 text-sm font-bold rounded-xl">{l}</button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: "none" }}>
          {(filter === "income" ? INCOME_CATEGORIES : filter === "expense" ? expenseCategories : [...expenseCategories, ...INCOME_CATEGORIES]).map((c) => {
            const active = categoryFilter.includes(c.key);
            const Icon = resolveIcon(c.icon);
            return (
              <button key={c.key} onClick={() => setCategoryFilter((prev) => active ? prev.filter((k) => k !== c.key) : [...prev, c.key])}
                style={{ background: active ? (c.color || C.purple) : C.graySoft, color: active ? "#fff" : C.inkSoft }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0">
                <Icon size={12} />{c.label}
              </button>
            );
          })}
        </div>

        {(categoryFilter.length > 0 || dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) && (
          <div className="flex justify-end mb-3 -mt-2">
            <button onClick={() => { setCategoryFilter([]); setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); }} style={{ color: C.coral }} className="text-xs font-bold">Clear filters</button>
          </div>
        )}
        {visible.length > 0 && (
          <div style={{ background: C.bg }} className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-3">
            <p className="text-xs font-bold" style={{ color: C.inkSoft }}>{visible.length} items</p>
            <div style={{ background: C.graySoft, width: 1, alignSelf: "stretch" }} />
            {filter !== "expense" && (
              <p className="text-xs font-bold" style={{ color: C.teal, fontFamily: "'Prompt', sans-serif" }}>Income {fmtTHB(visibleIncome)}</p>
            )}
            {filter !== "income" && (
              <p className="text-xs font-bold" style={{ color: C.coral, fontFamily: "'Prompt', sans-serif" }}>Expense {fmtTHB(visibleExpense)}</p>
            )}
            {filter === "all" && (
              <p className="text-xs font-bold ml-auto" style={{ color: C.ink, fontFamily: "'Prompt', sans-serif" }}>Net {fmtTHB(visibleIncome - visibleExpense)}</p>
            )}
          </div>
        )}
        {visible.length === 0 ? <EmptyNote text="No items yet — log your first item above" /> : (
          <div className="flex flex-col gap-2">
            {visible.map((t) => {
              const meta = catMeta(t.type === "expense" ? expenseCategories : INCOME_CATEGORIES, t.category);
              const subMeta = t.subcategory && t.type === "expense" ? subcategoryMeta(expenseCategories, t.category, t.subcategory) : null;
              const Icon = resolveIcon(subMeta ? subMeta.icon : meta.icon);
              const color = t.type === "expense" ? categoryColor(expenseCategories, subMeta ? subMeta.key : t.category) : categoryColor(INCOME_CATEGORIES, t.category);
              return (
                <div key={t.id} style={{ background: C.card, border: editingId === t.id ? `2px solid ${C.purple}` : "none" }} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl shadow-sm">
                  <div style={{ background: color }} className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
                    <Icon size={16} color="#fff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{meta.label}{subMeta ? ` · ${subMeta.label}` : ""}{t.note ? ` · ${t.note}` : ""}</p>
                    <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: C.inkSoft }}>
                      <span>{thDate(t.date)}</span><span>·</span>
                      <span>{t.payment === "cash" ? "Cash" : t.payment === "transfer" ? (t.bank ? `Transfer (${t.bank})` : "Transfer") : `Card (${t.card})`}</span>
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Prompt', sans-serif", color: t.type === "expense" ? C.coral : C.teal }} className="text-sm font-bold whitespace-nowrap">
                    {t.type === "expense" ? "-" : "+"}{fmtTHB(t.amount)}
                  </p>
                  <button onClick={() => startEdit(t)} style={{ color: C.purple }} className="p-1"><Pencil size={14} /></button>
                  <button onClick={() => remove(t.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (<div><label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>{label}</label>{children}</div>);
}

const inputStyle = {
  background: C.bg, border: `1px solid ${C.graySoft}`, borderRadius: 12,
  padding: "8px 12px", fontSize: 14, color: C.ink, width: "100%", fontFamily: "'Prompt', sans-serif", fontWeight: 700,
};

/* ---------------------------------------------------------------- */
function SavingsTab({ savings, setSavings, investPlan, setInvestPlan, holdings, setHoldings, banks, bankBalances, setBankBalances, transactions, setTransactions, cashBalance, setCashBalance, setDeletedSavingsIds, setDeletedHoldingIds, setDeletedInvestItemIds, showToast, expenseCategories, setExpenseCategories, creditCards }) {
  const [subTab, setSubTab] = useState("banks");
  const [kind, setKind] = useState("saving");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(todayStr());

  function add() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !name.trim()) return;
    setSavings((prev) => [{ id: uid(), kind, name: name.trim(), amount: amt, target: target ? parseFloat(target) : null, date }, ...prev]);
    setName(""); setAmount(""); setTarget("");
    showToast("Saved successfully ✓");
  }
  function remove(id) {
    setSavings((prev) => prev.filter((s) => s.id !== id));
    setDeletedSavingsIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showToast("Deleted successfully ✓");
  }

  const totalSaving = computeCashBalance(transactions, cashBalance) + banks.reduce((a, b) => a + computeBankBalance(transactions, bankBalances, b.name), 0);
  const totalInvest = holdings.reduce((a, h) => a + h.current, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: `linear-gradient(135deg, ${C.teal}, #22A184)` }} className="rounded-2xl p-4 text-white shadow-sm">
          <PiggyBank size={20} className="mb-2" />
          <p className="text-xs font-semibold opacity-90">Total Savings</p>
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-lg font-bold">{fmtTHB(totalSaving)}</p>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, #2E93C4)` }} className="rounded-2xl p-4 text-white shadow-sm">
          <TrendingUp size={20} className="mb-2" />
          <p className="text-xs font-semibold opacity-90">Total Invested</p>
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-lg font-bold">{fmtTHB(totalInvest)}</p>
        </div>
      </div>

      <div className="flex rounded-full overflow-hidden p-1 w-full" style={{ background: C.graySoft }}>
        <button onClick={() => setSubTab("banks")} style={{ background: subTab === "banks" ? C.card : "transparent" }} className="flex-1 px-3 py-1.5 text-sm font-bold rounded-full flex items-center justify-center gap-1.5"><Landmark size={13} />Saving</button>
        <button onClick={() => setSubTab("plan")} style={{ background: subTab === "plan" ? C.card : "transparent" }} className="flex-1 px-3 py-1.5 text-sm font-bold rounded-full flex items-center justify-center gap-1.5"><PieChartIcon size={13} />Investment</button>
        <button onClick={() => setSubTab("holdings")} style={{ background: subTab === "holdings" ? C.card : "transparent" }} className="flex-1 px-3 py-1.5 text-sm font-bold rounded-full flex items-center justify-center gap-1.5"><Rocket size={13} />Portfolio</button>
      </div>

      {subTab === "banks" && (
        <div className="flex flex-col gap-3">
          <div style={{ background: C.card }} className="flex items-center gap-3 rounded-2xl p-3.5 shadow-sm">
            <div style={{ background: C.teal }} className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"><Banknote size={18} color="#fff" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Cash</p>
              <p className="text-[11px]" style={{ color: C.inkSoft }}>Current balance</p>
            </div>
            <input
              type="number"
              defaultValue={computeCashBalance(transactions, cashBalance)}
              key={"cash-" + computeCashBalance(transactions, cashBalance)}
              onBlur={(e) => {
                const typed = parseFloat(e.target.value);
                if (isNaN(typed)) return;
                setCashBalance(typed - cashDelta(transactions));
              }}
              style={{ ...inputStyle, width: 130, padding: "8px 10px", fontFamily: "'Prompt', sans-serif", fontWeight: 700, textAlign: "right" }}
            />
          </div>
          {banks.length === 0 ? (
            <EmptyNote text='No banks yet — add one on the Settings page (⚙️ top right) under the "Bank" tab' />
          ) : (
            <div className="flex flex-col gap-2">
              {banks.map((b) => {
                const BankIcon = resolveIcon(b.icon);
                const balance = computeBankBalance(transactions, bankBalances, b.name);
                return (
                  <div key={b.name} style={{ background: C.card }} className="flex items-center gap-3 rounded-2xl p-3.5 shadow-sm">
                    <div style={{ background: b.color }} className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"><BankIcon size={18} color="#fff" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{b.name}</p>
                      <p className="text-[11px]" style={{ color: C.inkSoft }}>Current balance</p>
                    </div>
                    <input
                      type="number"
                      defaultValue={balance}
                      key={b.name + "-" + balance}
                      onBlur={(e) => {
                        const typed = parseFloat(e.target.value);
                        if (isNaN(typed)) return;
                        const delta = bankTransferDelta(transactions, b.name);
                        setBankBalances((prev) => ({ ...prev, [b.name]: typed - delta }));
                      }}
                      style={{ ...inputStyle, width: 130, padding: "8px 10px", fontFamily: "'Prompt', sans-serif", fontWeight: 700, textAlign: "right" }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[11px]" style={{ color: C.inkSoft }}>Edit the amount directly anytime (e.g. to match a real balance). New cash/transfer items logged on the Transactions page will add/subtract this automatically — cash counts every past item retroactively (since "cash" already existed on every old record), while banks only count new items after the bank was added</p>
        </div>
      )}

      {subTab === "plan" && (
        <InvestmentPlanPanel investPlan={investPlan} setInvestPlan={setInvestPlan} setSavings={setSavings} savings={savings} showToast={showToast} setDeletedInvestItemIds={setDeletedInvestItemIds} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} banks={banks} creditCards={creditCards} setTransactions={setTransactions} transactions={transactions} holdings={holdings} setHoldings={setHoldings} />
      )}

      {subTab === "holdings" && (
        <PortfolioHoldingsPanel holdings={holdings} setHoldings={setHoldings} setDeletedHoldingIds={setDeletedHoldingIds} showToast={showToast} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function DebtsTab({ debts, setDebts, creditCards, banks = [], setTransactions, setDeletedDebtIds, setPlanOverrides, showToast, cardOwedBaseline, setCardOwedBaseline, transactions, cardSettings }) {
  const [debtType, setDebtType] = useState("other");
  const [selectedCard, setSelectedCard] = useState(creditCards[0]?.name || "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [recurring, setRecurring] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("unlimited");

  function add() {
    const amt = parseFloat(amount);
    if (debtType === "credit") {
      const finalName = name.trim() || `Card item ${selectedCard}`;
      if (!amt || amt <= 0) return;
      const cardDebtId = "cc-card-" + selectedCard;
      setDebts((prev) => {
        const idx = prev.findIndex((d) => d.id === cardDebtId);
        // A newly-added installment shouldn't retroactively pad the cycle
        // that's already in progress — it starts counting from the cycle
        // AFTER the card's current due date.
        const currentCycleYm = idx === -1 ? ymOf(new Date()) : prev[idx].dueDate.slice(0, 7);
        const startYm = addMonths(currentCycleYm, 1);
        const lineItem = { id: uid(), name: finalName, amount: amt, totalInstallments: installmentCount === "unlimited" ? null : parseInt(installmentCount, 10), startYm };
        if (idx === -1) {
          // Shouldn't normally happen (the sync effect seeds one entry per
          // configured card), but handle it defensively.
          return [...prev, { id: cardDebtId, name: `Credit Card ${selectedCard}`, amount: 0, dueDate: todayStr(), recurring: true, paid: false, auto: true, card: selectedCard, lineItems: [lineItem] }];
        }
        const nextLineItems = [...(prev[idx].lineItems || []), lineItem];
        const autoAmt = computeCardOwed(transactions, cardOwedBaseline, cardSettings, selectedCard, currentCycleYm);
        const newTotal = autoAmt + activeLineItemsTotal(nextLineItems, currentCycleYm);
        return prev.map((d, i) => (i === idx ? { ...d, lineItems: nextLineItems, amount: newTotal } : d));
      });
      setName(""); setAmount("");
      showToast("Saved successfully ✓ (will start counting next cycle)");
      return;
    }
    const finalName = name.trim();
    if (!amt || amt <= 0 || !finalName) return;
    const item = { id: uid(), name: finalName, amount: amt, dueDate, recurring, paid: false };
    setDebts((prev) => [item, ...prev]);
    setName(""); setAmount("");
    showToast("Saved successfully ✓");
  }
  function remove(id) {
    setDebts((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target && target.auto) {
        // An auto-synced credit-card debt is derived from real transactions —
        // hard-deleting it would just have the sync effect recreate it next
        // time transactions/cardSettings change. Mark it dismissed instead
        // so the sync effect leaves it alone and it stays hidden.
        return prev.map((d) => (d.id === id ? { ...d, dismissed: true } : d));
      }
      // A plain local delete can get resurrected by the cross-device merge
      // (which unions with whatever another device/tab still has). Record
      // the id as deleted so the merge permanently excludes it everywhere.
      setDeletedDebtIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      return prev.filter((d) => d.id !== id);
    });
    showToast("Deleted successfully ✓");
  }
  function updateAmount(id, val) {
    const amt = parseFloat(val);
    if (isNaN(amt) || amt < 0) return;
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, amount: amt, amountOverridden: d.auto ? true : d.amountOverridden } : d)));
  }
  function logPaymentTransaction(d, paymentInfo, overrideAmount) {
    const isCreditDebt = !!d.card;
    setTransactions((prev) => [{
      id: uid(), type: "expense",
      category: isCreditDebt ? "creditcard" : "others",
      subcategory: null,
      amount: overrideAmount != null ? overrideAmount : d.amount,
      date: todayStr(),
      payment: paymentInfo.payment,
      bank: paymentInfo.payment === "transfer" ? paymentInfo.bank : null,
      card: null,
      note: d.name,
    }, ...prev]);
  }
  // A card's debt entry is a persistent running balance now (like a bank
  // balance), not a one-off paid/unpaid item — "paying" it settles the
  // current cycle's total (auto spending + whichever installments are
  // currently active). Line items naturally phase in/out on their own
  // schedule as calendar months pass, so paying doesn't need to touch
  // them — it just cleans up any that have fully finished their run.
  function payCardDebt(d, paymentInfo) {
    const cycleYm = d.dueDate.slice(0, 7);
    const autoAmt = computeCardOwed(transactions, cardOwedBaseline, cardSettings, d.card, cycleYm);
    const total = autoAmt + activeLineItemsTotal(d.lineItems, cycleYm);
    if (total <= 0) return;
    logPaymentTransaction(d, paymentInfo, total);
    // Advance the baseline only by what was actually billed this cycle
    // (transactions up to the cutoff) — not the full all-time total, which
    // would incorrectly also mark not-yet-billed transactions as paid.
    setCardOwedBaseline((prev) => ({ ...prev, [d.card]: (prev[d.card] || 0) + cardBilledTotal(transactions, cardSettings, d.card, cycleYm) }));
    setDebts((prev) => prev.map((x) => (x.id === d.id ? { ...x, lineItems: (x.lineItems || []).filter((li) => li.totalInstallments == null || monthsBetweenYm(li.startYm, cycleYm) < li.totalInstallments) } : x)));
    showToast("Payment saved ✓");
  }
  function togglePaid(id, paymentInfo) {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const nowPaid = !d.paid;
      if (nowPaid) logPaymentTransaction(d, paymentInfo);
      if (nowPaid && d.id === HOME_LOAN_DEBT_ID) {
        // Feed the actual paid amount (respecting any manual edit here)
        // back into the Home Loan page's per-month override, so its
        // amortization schedule/remaining-balance reflect what was really
        // paid — extra principal or a short payment — not just the
        // standard installment amount.
        const ym = d.dueDate.slice(0, 7);
        setPlanOverrides((prev2) => ({ ...prev2, [ym]: { ...(prev2[ym] || {}), [HOME_LOAN_FIXCOST_ID]: d.amount } }));
      }
      if (nowPaid && d.recurring) {
        const next = parseLocalDate(d.dueDate); next.setMonth(next.getMonth() + 1);
        return { ...d, paid: false, dueDate: toLocalDateStr(next) };
      }
      return { ...d, paid: nowPaid };
    }));
    if (paymentInfo) showToast("Payment saved ✓");
  }
  // Marking a debt as paid needs to know which real payment channel was
  // used so the auto-logged transaction (and any bank-balance deduction)
  // is accurate — so it opens a small picker instead of assuming "transfer"
  // blindly like before. Un-checking (reverting to unpaid) needs no picker.
  const [pendingPayId, setPendingPayId] = useState(null);
  const [payMethod, setPayMethod] = useState(null);
  const [payBank, setPayBank] = useState(null);
  function startPay(d) {
    const isCardDebt = d.id.startsWith("cc-card-");
    if (!isCardDebt && d.paid) { togglePaid(d.id); return; }
    setPendingPayId(d.id); setPayMethod(null); setPayBank(null);
  }
  function confirmPay() {
    if (!payMethod) return;
    const d = debts.find((x) => x.id === pendingPayId);
    const info = { payment: payMethod, bank: payMethod === "transfer" ? payBank : null };
    if (d && d.id.startsWith("cc-card-")) payCardDebt(d, info);
    else togglePaid(pendingPayId, info);
    setPendingPayId(null);
  }
  const [expandedCardId, setExpandedCardId] = useState(null);
  // Deleting a line item offers two modes: skip just the upcoming cycle
  // (shortens a fixed plan by one installment and pushes the start forward
  // one month) or cancel the whole remaining plan (removes it outright).
  const [pendingDeleteLineItem, setPendingDeleteLineItem] = useState(null); // { cardDebtId, lineItem }
  function skipOneCycle(cardDebtId, lineItemId) {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== cardDebtId) return d;
      const cycleYm = d.dueDate.slice(0, 7);
      const nextLineItems = (d.lineItems || [])
        .map((li) => {
          if (li.id !== lineItemId) return li;
          const newStartYm = addMonths(li.startYm, 1);
          const newTotal = li.totalInstallments == null ? null : Math.max(0, li.totalInstallments - 1);
          return { ...li, startYm: newStartYm, totalInstallments: newTotal };
        })
        .filter((li) => li.totalInstallments == null || li.totalInstallments > 0);
      const autoAmt = computeCardOwed(transactions, cardOwedBaseline, cardSettings, d.card, cycleYm);
      return { ...d, lineItems: nextLineItems, amount: autoAmt + activeLineItemsTotal(nextLineItems, cycleYm) };
    }));
    showToast("Cycle skipped ✓");
    setPendingDeleteLineItem(null);
  }
  function cancelAllRemaining(cardDebtId, lineItemId) {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== cardDebtId) return d;
      const cycleYm = d.dueDate.slice(0, 7);
      const nextLineItems = (d.lineItems || []).filter((li) => li.id !== lineItemId);
      const autoAmt = computeCardOwed(transactions, cardOwedBaseline, cardSettings, d.card, cycleYm);
      return { ...d, lineItems: nextLineItems, amount: autoAmt + activeLineItemsTotal(nextLineItems, cycleYm) };
    }));
    showToast("Deleted successfully ✓");
    setPendingDeleteLineItem(null);
  }
  // Editing a card's total directly (e.g. to match a real statement) needs
  // to back-solve the baseline anchor, same idea as editing a bank balance:
  // the lineItems portion stays fixed, only the auto (transaction-derived)
  // portion absorbs the adjustment.
  function updateCardTotal(d, val) {
    const typed = parseFloat(val);
    if (isNaN(typed) || typed < 0) return;
    const cycleYm = d.dueDate.slice(0, 7);
    const lineItemsTotal = activeLineItemsTotal(d.lineItems, cycleYm);
    const desiredAutoAmt = Math.max(0, typed - lineItemsTotal);
    const billedTotal = cardBilledTotal(transactions, cardSettings, d.card, cycleYm);
    setCardOwedBaseline((prev) => ({ ...prev, [d.card]: billedTotal - desiredAutoAmt }));
    setDebts((prev) => prev.map((x) => (x.id === d.id ? { ...x, amount: typed } : x)));
    showToast("Amount updated ✓");
  }

  const sorted = [...debts].filter((d) => !d.dismissed).sort((a, b) => b.amount - a.amount);

  const now = new Date();
  // A recurring debt only ever exists as ONE object with one due date —
  // it only rolls forward once you actually mark it paid. So for planning
  // purposes (the summary cards / a future month's list), we need to
  // *project* a virtual occurrence into a later month, same day-of-month,
  // without creating any real record until that cycle is actually reached.
  function projectForMonth(d, targetYm) {
    const ownYm = d.dueDate.slice(0, 7);
    if (ownYm === targetYm) return d;
    if (d.recurring && !d.paid && ownYm < targetYm) {
      const day = parseLocalDate(d.dueDate).getDate();
      const [ty, tm] = targetYm.split("-").map(Number);
      const lastDay = new Date(ty, tm, 0).getDate();
      const projectedDate = toLocalDateStr(new Date(ty, tm - 1, Math.min(day, lastDay)));
      const isCardDebt = d.id.startsWith("cc-card-");
      // A future cycle's amount is knowable — transactions dated after the
      // CURRENT cycle's cutoff but already recorded belong to that later
      // statement. But it must be the amount NEWLY billed in that specific
      // cycle (this cutoff's total minus the previous cutoff's total), not
      // computeCardOwed's cumulative-minus-baseline — that formula is only
      // correct for the current real entry; reusing it here would also
      // drag along the current cycle's still-unpaid balance and double
      // count it in every future month's projection too.
      const projectedAmount = isCardDebt
        ? cardBilledTotal(transactions, cardSettings, d.card, targetYm) - cardBilledTotal(transactions, cardSettings, d.card, addMonths(targetYm, -1)) + activeLineItemsTotal(d.lineItems, targetYm)
        : d.amount;
      return { ...d, id: d.id + "-proj-" + targetYm, dueDate: projectedDate, amount: projectedAmount, projected: true };
    }
    return null;
  }
  function monthHasDebt(ym) {
    return debts.some((d) => {
      if (d.dismissed || d.paid) return false;
      const proj = projectForMonth(d, ym);
      return proj !== null && proj.amount > 0;
    });
  }
  const summarize = (ym) => {
    const items = debts.filter((d) => !d.dismissed && !d.paid).map((d) => projectForMonth(d, ym)).filter((d) => d && d.amount > 0);
    return { total: items.reduce((a, d) => a + Number(d.amount), 0), count: items.length };
  };
  // Show the soonest months that actually have something owed — checking a
  // forward-looking window (not just months that already have a real
  // record) so a recurring bill correctly projects into months it hasn't
  // technically reached yet. Genuinely overdue real debts still take
  // priority since they're the most urgent.
  const overdueYms = Array.from(new Set(
    debts.filter((d) => !d.paid && !d.dismissed && d.dueDate.slice(0, 7) < ymOf(now)).map((d) => d.dueDate.slice(0, 7))
  ));
  const forwardYms = Array.from({ length: 6 }, (_, i) => ymOf(new Date(now.getFullYear(), now.getMonth() + i, 1)));
  const upcomingYms = Array.from(new Set([...overdueYms, ...forwardYms])).sort().filter(monthHasDebt).slice(0, 2);
  const upcomingSummaries = upcomingYms.map((ym) => {
    const [y, m] = ym.split("-").map(Number);
    return { ym, name: MONTH_FULL_TH[m - 1], year: y, ...summarize(ym) };
  });
  // The summary cards double as a filter for the list below — clicking one
  // narrows the list to that month; it defaults to the soonest upcoming one.
  const [selectedYm, setSelectedYm] = useState(null);
  const effectiveYm = selectedYm === "__all__" ? null : (selectedYm || upcomingYms[0] || null);
  const listForMonth = effectiveYm
    ? debts.filter((d) => !d.dismissed).map((d) => projectForMonth(d, effectiveYm)).filter(Boolean).sort((a, b) => b.amount - a.amount)
    : sorted;
  const selectedMonthLabel = effectiveYm ? (() => { const [y, m] = effectiveYm.split("-").map(Number); return `${MONTH_FULL_TH[m - 1]}${y !== now.getFullYear() ? ` ${y}` : ""}`; })() : null;

  return (
    <div className="flex flex-col gap-4">
      {pendingPayId && (() => {
        const payingDebt = debts.find((d) => d.id === pendingPayId);
        if (!payingDebt) return null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPendingPayId(null)}>
            <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Select payment method</p>
                <button onClick={() => setPendingPayId(null)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
              </div>
              <p className="text-xs mb-4" style={{ color: C.inkSoft }}>{payingDebt.name} · {fmtTHB(payingDebt.amount)}</p>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button onClick={() => { setPayMethod("cash"); setPayBank(null); }} style={{ background: payMethod === "cash" ? C.purple : C.graySoft, color: payMethod === "cash" ? "#fff" : C.inkSoft }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold">
                  <Banknote size={18} />Cash
                </button>
                <button onClick={() => setPayMethod("transfer")} style={{ background: payMethod === "transfer" ? C.purple : C.graySoft, color: payMethod === "transfer" ? "#fff" : C.inkSoft }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold">
                  <Landmark size={18} />Transfer
                </button>
              </div>
              {payMethod === "transfer" && banks.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold mb-2" style={{ color: C.inkSoft }}>Select bank (optional)</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setPayBank(null)} style={{ background: !payBank ? C.purple : C.graySoft, color: !payBank ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">Unspecified</button>
                    {banks.map((b) => (
                      <button key={b.name} onClick={() => setPayBank(b.name)} style={{ background: payBank === b.name ? b.color : C.graySoft, color: payBank === b.name ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">{b.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={confirmPay} disabled={!payMethod} style={{ background: payMethod ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` : C.graySoft, color: payMethod ? "#fff" : C.inkSoft }} className="w-full py-2.5 rounded-full text-sm font-bold">
                Confirm Payment
              </button>
            </div>
          </div>
        );
      })()}
      {pendingDeleteLineItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPendingDeleteLineItem(null)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Remove installment</p>
              <button onClick={() => setPendingDeleteLineItem(null)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: C.inkSoft }}>{pendingDeleteLineItem.lineItem.name} · {fmtTHB(pendingDeleteLineItem.lineItem.amount)}/month</p>
            <button onClick={() => skipOneCycle(pendingDeleteLineItem.cardDebtId, pendingDeleteLineItem.lineItem.id)} style={{ background: C.graySoft, color: C.ink }} className="w-full py-3 rounded-2xl text-sm font-bold mb-2.5 text-left px-4">
              Skip next cycle only
              <span className="block text-[11px] font-normal mt-0.5" style={{ color: C.inkSoft }}>Remaining cycles stay on the original plan</span>
            </button>
            <button onClick={() => cancelAllRemaining(pendingDeleteLineItem.cardDebtId, pendingDeleteLineItem.lineItem.id)} style={{ background: C.coralSoft, color: C.coral }} className="w-full py-3 rounded-2xl text-sm font-bold text-left px-4">
              Delete all remaining
              <span className="block text-[11px] font-normal mt-0.5" style={{ color: C.coral }}>Cancel this plan permanently — won't count again</span>
            </button>
          </div>
        </div>
      )}
      {upcomingSummaries.length === 0 ? (
        <div style={{ background: C.tealSoft }} className="rounded-3xl p-4 text-center">
          <p className="text-sm font-bold" style={{ color: C.teal }}>Nothing due right now 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {upcomingSummaries.map((s) => {
            const active = s.ym === effectiveYm;
            return (
              <button key={s.ym} onClick={() => setSelectedYm(s.ym)} style={active ? { background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` } : { background: C.card, border: `1.5px solid ${C.graySoft}` }} className="rounded-3xl p-4 text-left">
                <p className="text-xs mb-1.5" style={{ color: active ? "rgba(255,255,255,0.75)" : C.inkSoft }}>Payment for {s.name}{s.year !== now.getFullYear() ? ` ${s.year}` : ""}</p>
                <p style={{ fontFamily: "'Prompt', sans-serif", color: active ? "#fff" : C.ink }} className="text-xl mb-1">{fmtTHB(s.total)}</p>
                <p className="text-[11px]" style={{ color: active ? "rgba(255,255,255,0.75)" : C.inkSoft }}>{s.count} items</p>
              </button>
            );
          })}
          {upcomingSummaries.length === 1 && (
            <div style={{ background: C.tealSoft }} className="rounded-3xl p-4 flex items-center justify-center">
              <p className="text-xs font-bold text-center" style={{ color: C.teal }}>No balance due next month</p>
            </div>
          )}
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Add debt / due date item</p>
        <div className="flex rounded-full overflow-hidden p-1 mb-3.5 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => setDebtType("other")} style={{ background: debtType === "other" ? C.purple : "transparent", color: debtType === "other" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full">General Debt</button>
          <button onClick={() => setDebtType("credit")} style={{ background: debtType === "credit" ? C.purple : "transparent", color: debtType === "credit" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><CreditCard size={14} />Credit Card</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Item name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={debtType === "credit" ? "e.g. phone installment on card" : "e.g. phone installment"} style={inputStyle} />
          </Field>
          {debtType === "credit" && (
            <Field label="Credit Card">
              <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} style={inputStyle}>
                {creditCards.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Amount (THB)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          {debtType !== "credit" && (
            <Field label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} /></Field>
          )}
          {debtType === "credit" ? (
            <Field label="Installments">
              <select value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} style={inputStyle}>
                <option value="unlimited">Unset (ongoing monthly)</option>
                {[3, 4, 6, 10, 12].map((n) => <option key={n} value={n}>{n} installments</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Format">
              <button onClick={() => setRecurring((r) => !r)} style={{ background: recurring ? C.purple : C.graySoft, color: recurring ? "#fff" : C.inkSoft }} className="px-3.5 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 w-fit"><Calendar size={13} /> {recurring ? "Pay monthly" : "One-time"}</button>
            </Field>
          )}
        </div>
        <button onClick={add} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> Add item</button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">All Debts{selectedMonthLabel ? ` · ${selectedMonthLabel}` : ""}</p>
          {effectiveYm && (
            <button onClick={() => setSelectedYm("__all__")} style={{ color: C.purple }} className="text-xs font-bold">View all months</button>
          )}
        </div>
        {(selectedYm === "__all__" ? sorted : listForMonth).length === 0 ? <EmptyNote text="No debts or due dates yet" /> : (
          <div className="flex flex-col gap-2">
            {(selectedYm === "__all__" ? sorted : listForMonth).map((d) => {
              const isCardDebt = d.id.startsWith("cc-card-");
              const diff = daysUntil(d.dueDate);
              let chipBg = C.graySoft, chipColor = C.inkSoft, statusText = `${diff} Days left`;
              const isDone = isCardDebt ? d.amount <= 0 : d.paid;
              if (d.projected) { chipBg = C.purpleSoft; chipColor = C.purple; statusText = "Projected"; }
              else if (isDone) { chipBg = C.tealSoft; chipColor = C.teal; statusText = "Done"; }
              else if (diff < 0) { chipBg = C.coralSoft; chipColor = C.coral; statusText = "Over due"; }
              else { chipBg = C.graySoft; chipColor = C.inkSoft; statusText = `${diff} Days left`; }
              const expanded = expandedCardId === d.id;
              return (
                <div key={d.id} style={{ background: C.card, opacity: d.projected ? 0.7 : 1 }} className="rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    {isCardDebt ? (
                      <button onClick={() => !d.projected && startPay(d)} disabled={d.projected || d.amount <= 0} title="Pay this amount" style={{ color: d.amount > 0 ? C.graySoft : C.teal, cursor: d.projected || d.amount <= 0 ? "default" : "pointer" }} className="shrink-0"><CheckCircle2 size={22} /></button>
                    ) : (
                      <button onClick={() => !d.projected && startPay(d)} disabled={d.projected} style={{ color: d.paid ? C.teal : C.graySoft, cursor: d.projected ? "default" : "pointer" }} className="shrink-0"><CheckCircle2 size={22} /></button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate flex items-center gap-1.5" style={{ textDecoration: d.paid ? "line-through" : "none" }}>
                        {d.card && (() => { const cm = cardMeta(creditCards, d.card); const CIcon = resolveIcon(cm.icon); return <CIcon size={12} color={cm.color} className="shrink-0" />; })()}
                        {d.name}{!isCardDebt && d.recurring ? " (Monthly)" : ""}
                      </p>
                      <p className="text-xs truncate" style={{ color: C.inkSoft }}>{isCardDebt ? `Due ${parseLocalDate(d.dueDate).toLocaleDateString("en-US", { day: "numeric", month: "short" })}` : `${d.projected ? "Expected due" : "Due"} ${thDate(d.dueDate)}`}</p>
                    </div>
                    <span style={{ background: chipBg, color: chipColor }} className="text-[11px] font-bold whitespace-nowrap px-2.5 py-1 rounded-full shrink-0">{statusText}</span>
                    {isCardDebt ? (
                      <input type="number" min="0" defaultValue={d.amount} key={d.id + "-amt-" + d.amount}
                        onBlur={(e) => updateCardTotal(d, e.target.value)}
                        style={{ ...inputStyle, width: 92, padding: "6px 8px", fontFamily: "'Prompt', sans-serif", fontWeight: 700, textAlign: "right" }} />
                    ) : d.projected ? (
                      <p style={{ fontFamily: "'Prompt', sans-serif", width: 92, textAlign: "right" }} className="text-sm font-bold shrink-0">{fmtTHB(d.amount)}</p>
                    ) : (
                      <input type="number" min="0" defaultValue={d.amount} key={d.id + "-amt-" + d.amount}
                        onBlur={(e) => updateAmount(d.id, e.target.value)}
                        style={{ ...inputStyle, width: 92, padding: "6px 8px", fontFamily: "'Prompt', sans-serif", fontWeight: 700, textAlign: "right" }} />
                    )}
                    {isCardDebt ? (
                      <button onClick={() => setExpandedCardId(expanded ? null : d.id)} style={{ color: C.inkSoft }} className="p-1 shrink-0">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    ) : (
                      <button onClick={() => !d.projected && remove(d.id)} disabled={d.projected} style={{ color: d.projected ? C.graySoft : C.gray }} className="p-1 shrink-0"><Trash2 size={14} /></button>
                    )}
                  </div>
                  {isCardDebt && expanded && (
                    <div style={{ background: C.bg }} className="px-3.5 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: C.inkSoft }}>Card spending (unpaid)</span>
                        <span style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{fmtTHB(computeCardOwed(transactions, cardOwedBaseline, cardSettings, d.card, d.dueDate.slice(0, 7)))}</span>
                      </div>
                      {(d.lineItems || []).length === 0 ? (
                        <p className="text-[11px]" style={{ color: C.inkSoft }}>No installment items set for this card yet</p>
                      ) : (d.lineItems || []).map((li) => {
                        const cycleYm = d.dueDate.slice(0, 7);
                        const active = lineItemActiveFor(li, cycleYm);
                        const elapsed = li.startYm ? monthsBetweenYm(li.startYm, cycleYm) : 0;
                        let progressText = "";
                        if (li.totalInstallments != null) {
                          progressText = active ? `Installment ${elapsed + 1}/${li.totalInstallments}` : (elapsed < 0 ? `Starts ${monthLabel(li.startYm)}` : "Fully paid");
                        } else {
                          progressText = active ? "Monthly (no end date)" : `Starts ${monthLabel(li.startYm)}`;
                        }
                        return (
                          <div key={li.id} className="flex items-center justify-between text-xs" style={{ opacity: active ? 1 : 0.55 }}>
                            <div className="min-w-0">
                              <p className="truncate">{li.name}</p>
                              <p className="text-[10px]" style={{ color: C.inkSoft }}>{progressText}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{fmtTHB(li.amount)}</span>
                              <button onClick={() => setPendingDeleteLineItem({ cardDebtId: d.id, lineItem: li })} style={{ color: C.gray }}><Trash2 size={12} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] mt-2.5" style={{ color: C.inkSoft }}>For general/home loan debts, edit the amount directly in the number field. Check the box when paid to select a payment method first, then it logs as an expense automatically. **Each credit card always has just 1 item** — the card's current balance due (card spending + set installments). Tap the wallet button to pay the full amount, tap the arrow to see what's included</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function BudgetsTab({ budgets, setBudgets, monthSpend, expenseCategories }) {
  function setLimit(cat, val) { setBudgets((prev) => ({ ...prev, [cat]: val === "" ? undefined : parseFloat(val) })); }

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: C.blueSoft, color: "#1E5A7C" }} className="rounded-2xl px-4 py-3 text-sm font-semibold">
        Set a monthly budget limit per category — you'll get alerted when spending gets close to or hits the limit
      </div>
      <div className="flex flex-col gap-2">
        {expenseCategories.map((c) => {
          const Icon = resolveIcon(c.icon);
          const limit = budgets[c.key];
          const spent = monthSpend[c.key] || 0;
          const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const color = c.color;
          const barColor = pct >= 100 ? C.coral : pct >= 80 ? C.yellowDeep : color;
          return (
            <div key={c.key} style={{ background: C.card }} className="rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div style={{ background: color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Icon size={15} color="#fff" /></div>
                <p className="text-sm font-bold flex-1">{c.label}</p>
                <input type="number" min="0" placeholder="Unset" defaultValue={limit ?? ""} onBlur={(e) => setLimit(c.key, e.target.value)} style={{ ...inputStyle, width: 110 }} />
              </div>
              {limit ? (
                <div>
                  <div style={{ background: C.graySoft, height: 8, borderRadius: 6 }}><div style={{ width: `${pct}%`, background: barColor, height: 8, borderRadius: 6 }} /></div>
                  <p className="text-[11px] mt-1 font-semibold" style={{ color: C.inkSoft }}>{fmtTHB(spent)} of {fmtTHB(limit)} ({pct}%)</p>
                </div>
              ) : (
                <p className="text-[11px] font-semibold" style={{ color: C.inkSoft }}>Spent this month {fmtTHB(spent)} — no limit set</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Monthly Planning                                                  */
/* ---------------------------------------------------------------- */
function MonthlyPlanTab({
  planIncomeItems, setPlanIncomeItems,
  planFixCostItems, setPlanFixCostItems,
  planOverrides, setPlanOverrides,
  savingsPlan, setSavingsPlan,
  cardSettings, setCardSettings,
  debts, transactions, setSavings,
  creditCards,
}) {
  const [ym, setYm] = useState(ymOf(new Date()));
  const [showSettings, setShowSettings] = useState(false);

  const incomeItems = useMemo(() => itemsForMonth(planIncomeItems, ym), [planIncomeItems, ym]);
  const fixItems = useMemo(() => itemsForMonth(planFixCostItems, ym), [planFixCostItems, ym]);

  const totalIncome = incomeItems.reduce((a, i) => a + effectiveAmount(i, ym, planOverrides), 0);
  const totalFixCost = fixItems.reduce((a, i) => a + effectiveAmount(i, ym, planOverrides), 0);
  const fixPct = totalIncome > 0 ? Math.round((totalFixCost / totalIncome) * 100) : 0;

  const debtsThisMonth = useMemo(() => debts.filter((d) => d.dueDate && d.dueDate.slice(0, 7) === ym), [debts, ym]);
  const totalDebt = debtsThisMonth.reduce((a, d) => a + Number(d.amount), 0);

  const savingAmt = savingsPlan.saving.mode === "percent" ? Math.round(totalIncome * (savingsPlan.saving.value / 100)) : (Number(savingsPlan.saving.value) || 0);
  const investAmt = savingsPlan.invest.mode === "percent" ? Math.round(totalIncome * (savingsPlan.invest.value / 100)) : (Number(savingsPlan.invest.value) || 0);

  const budgetedBalance = totalIncome - totalFixCost - totalDebt - savingAmt - investAmt;

  const monthTx = useMemo(() => transactions.filter((t) => t.date.slice(0, 7) === ym), [transactions, ym]);
  const actualCash = monthTx.filter((t) => t.type === "expense" && t.payment !== "credit").reduce((a, t) => a + Number(t.amount), 0);
  const actualCreditByCard = useMemo(() => {
    const m = {};
    monthTx.forEach((t) => { if (t.type === "expense" && t.payment === "credit" && t.card) m[t.card] = (m[t.card] || 0) + Number(t.amount); });
    return m;
  }, [monthTx]);
  const totalCredit = Object.values(actualCreditByCard).reduce((a, b) => a + b, 0);
  const extraIncomeLogged = monthTx.filter((t) => t.type === "income").reduce((a, t) => a + Number(t.amount), 0);

  const remainingNow = budgetedBalance - actualCash;

  function shiftMonth(delta) { setYm((prev) => addMonths(prev, delta)); }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">{monthLabel(ym)}</p>
        <button onClick={() => shiftMonth(1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.pink}, #D6478E)` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">Available now (after actual logged expenses)</p>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-3xl font-extrabold mb-3">{fmtTHB(remainingNow)}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SummaryMini label="Planned Income" value={totalIncome} />
          <SummaryMini label="Fix cost" value={totalFixCost} sub={`${fixPct}% of income`} />
          <SummaryMini label="Debts due this month" value={totalDebt} />
          <SummaryMini label="Save+Invest" value={savingAmt + investAmt} />
        </div>
      </div>

      {totalCredit > 0 && (
        <div style={{ background: C.yellowSoft, color: "#7A5B00" }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Total credit card spending this month {fmtTHB(totalCredit)} — the system will set this as a debt due next month automatically ({Object.entries(actualCreditByCard).map(([c, v]) => `${c} ${fmtTHB(v)}`).join(", ")})</span>
        </div>
      )}

      {extraIncomeLogged > 0 && (
        <p className="text-xs px-1" style={{ color: C.inkSoft }}>* There's extra income logged on the Transactions page this month, {fmtTHB(extraIncomeLogged)} (not included in this plan)</p>
      )}

      {totalIncome > 0 && fixPct > 50 && (
        <div style={{ background: C.coral, color: "#fff" }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2 shadow-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Total Fix Cost this month {fmtTHB(totalFixCost)}, {fixPct}% of income — over half your income. Consider reducing recurring expenses or increasing income</span>
        </div>
      )}

      <PlanSection
        title="Planned income" color={C.teal} icon={TrendingUp}
        items={incomeItems} setItems={setPlanIncomeItems}
        overrides={planOverrides} setOverrides={setPlanOverrides} ym={ym}
        typePresets={INCOME_TYPE_PRESETS} total={totalIncome}
      />

      <PlanSection
        title="Fix Cost item" color={C.coral} icon={ClipboardList}
        items={fixItems} setItems={setPlanFixCostItems}
        overrides={planOverrides} setOverrides={setPlanOverrides} ym={ym}
        typePresets={FIXCOST_TYPE_PRESETS} total={totalFixCost}
        extraNote={totalIncome > 0 ? `${fixPct}% of income this month` : null}
      />

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold flex items-center gap-2"><Bell size={16} color={C.yellowDeep} />Debts due this month</p>
          <span style={{ fontFamily: "'Prompt', sans-serif" }} className="text-sm font-bold">{fmtTHB(totalDebt)}</span>
        </div>
        {debtsThisMonth.length === 0 ? <EmptyNote text="No debts due this month" /> : (
          <div className="flex flex-col gap-2">
            {debtsThisMonth.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 text-sm">
                <span style={{ background: d.paid ? C.teal : C.coral }} className="w-2 h-2 rounded-full shrink-0" />
                <span className="flex-1 font-semibold truncate">{d.name}{d.auto ? " · auto from credit card" : ""}</span>
                <span style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{fmtTHB(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Same data as the "Debts" page — add/edit/mark paid on the Debts tab</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Monthly saving & investing goal</p>
        <div className="flex flex-col gap-3">
          <AllocationRow label="Savings" color={C.teal} icon={PiggyBank} alloc={savingsPlan.saving}
            onChange={(alloc) => setSavingsPlan((p) => ({ ...p, saving: alloc }))} amount={savingAmt} />
          <AllocationRow label="Investment" color={C.blue} icon={TrendingUp} alloc={savingsPlan.invest}
            onChange={(alloc) => setSavingsPlan((p) => ({ ...p, invest: alloc }))} amount={investAmt} />
        </div>
        <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: C.inkSoft }}>
          <CheckCircle2 size={13} color={C.teal} /> This amount syncs into the "Saving & Investing" page automatically every month
        </p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <button onClick={() => setShowSettings((s) => !s)} className="w-full flex items-center justify-between">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold flex items-center gap-2"><Settings size={16} />Set credit card cutoff/due dates</p>
          {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSettings && (
          <div className="flex flex-col gap-2.5 mt-3">
            {creditCards.map((card) => {
              const cs = cardSettings[card.name] || { cutoffDay: 25, dueDay: 5 };
              const CardIcon = resolveIcon(card.icon);
              return (
                <div key={card.name} style={{ background: C.bg }} className="rounded-2xl px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
                  <div style={{ background: card.color }} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"><CardIcon size={13} color="#fff" /></div>
                  <p className="text-sm font-bold w-20 shrink-0">{card.name}</p>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
                    Cutoff day
                    <input type="number" min="1" max="31" value={cs.cutoffDay}
                      onChange={(e) => setCardSettings((p) => ({ ...p, [card.name]: { ...cs, cutoffDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) } }))}
                      style={{ ...inputStyle, width: 55 }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
                    Due day
                    <input type="number" min="1" max="31" value={cs.dueDay}
                      onChange={(e) => setCardSettings((p) => ({ ...p, [card.name]: { ...cs, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) } }))}
                      style={{ ...inputStyle, width: 55 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Each card can have its own cutoff/due date. The system totals each card's real billing cycle and sets it as a debt due on the "Debts" tab automatically</p>
      </div>
    </div>
  );
}

function SummaryMini({ label, value, sub, isText }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
      <p className="opacity-90 font-semibold">{label}</p>
      <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-sm">{isText ? value : fmtTHB(value)}</p>
      {sub && <p className="opacity-80 text-[10px]">{sub}</p>}
    </div>
  );
}

function AllocationRow({ label, color, icon: Icon, alloc, onChange, amount }) {
  return (
    <div style={{ background: C.bg }} className="rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ background: color }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"><Icon size={15} color="#fff" /></div>
        <p className="text-sm font-bold flex-1">{label}</p>
        <p style={{ fontFamily: "'Prompt', sans-serif", color }} className="text-sm font-bold">{fmtTHB(amount)}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
          <button onClick={() => onChange({ ...alloc, mode: "percent" })} style={{ background: alloc.mode === "percent" ? color : "transparent", color: alloc.mode === "percent" ? "#fff" : C.inkSoft }} className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Percent size={11} />%</button>
          <button onClick={() => onChange({ ...alloc, mode: "fixed" })} style={{ background: alloc.mode === "fixed" ? color : "transparent", color: alloc.mode === "fixed" ? "#fff" : C.inkSoft }} className="px-2.5 py-1 rounded-full text-xs font-bold">฿</button>
        </div>
        <input type="number" min="0" value={alloc.value} onChange={(e) => onChange({ ...alloc, value: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, width: 100 }} />
      </div>
    </div>
  );
}

function PlanSection({ title, color, icon: Icon, items, setItems, overrides, setOverrides, ym, typePresets, total, extraNote }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState("");
  const listId = "presets-" + title.replace(/\s+/g, "");

  function add() {
    const amt = parseFloat(amount);
    if (!name.trim()) { setError("Please enter an item name first"); return; }
    if (!amt || amt <= 0) { setError("Enter an amount greater than 0"); return; }
    const collision = items.find((i) => i.auto && i.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (collision) { setError(`"${collision.name}" is already auto-synced — no need to add it again, just edit the existing item's amount`); return; }
    setError("");
    const item = { id: uid(), name: name.trim(), type: type.trim() || "Other", amount: amt, recurring };
    if (!recurring) item.month = ym;
    setItems((prev) => [...prev, item]);
    setName(""); setType(""); setAmount("");
  }
  function remove(id) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function updateAmount(item, val) {
    const amt = parseFloat(val);
    if (isNaN(amt)) return;
    if (item.recurring) {
      setOverrides((prev) => ({ ...prev, [ym]: { ...(prev[ym] || {}), [item.id]: amt } }));
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, amount: amt } : i)));
    }
  }
  function resetOverride(item) {
    setOverrides((prev) => {
      if (!prev[ym] || !(item.id in prev[ym])) return prev;
      const next = { ...prev, [ym]: { ...prev[ym] } };
      delete next[ym][item.id];
      return next;
    });
  }

  return (
    <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold flex items-center gap-2"><Icon size={16} color={color} />{title}</p>
        <span style={{ fontFamily: "'Prompt', sans-serif", color }} className="text-sm font-bold">{fmtTHB(total)}</span>
      </div>
      {extraNote && <p className="text-xs font-semibold mb-3" style={{ color }}>{extraNote}</p>}

      {items.length === 0 ? <EmptyNote text="No items yet" /> : (
        <div className="flex flex-col gap-2 mb-3.5">
          {items.map((item) => {
            const eff = effectiveAmount(item, ym, overrides);
            const overridden = item.recurring && overrides?.[ym]?.[item.id] !== undefined;
            return (
              <div key={item.id} style={{ background: C.bg }} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate flex items-center gap-1.5">
                    {item.name}
                    {item.auto && <span style={{ background: C.brownSoft, color: C.brown }} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">Synced from Home Loan</span>}
                  </p>
                  <p className="text-[11px] flex items-center gap-1 flex-wrap" style={{ color: C.inkSoft }}>
                    <span>{item.type}</span><span>·</span><span>{item.recurring ? "Monthly" : `${monthLabel(item.month)} only`}</span>
                    {overridden && <span style={{ color }} className="font-bold">· edit this month only</span>}
                  </p>
                </div>
                <input type="number" min="0" defaultValue={eff} key={ym + item.id + eff}
                  onBlur={(e) => updateAmount(item, e.target.value)} style={{ ...inputStyle, width: 100 }} />
                {overridden && (
                  <button onClick={() => resetOverride(item)} title="Reset to default" style={{ color: C.inkSoft }} className="p-1"><RotateCcw size={13} /></button>
                )}
                {item.auto ? (
                  <span title="Manage this item on the 'Home Loan' tab" style={{ color: C.graySoft }} className="p-1"><Lock size={13} /></span>
                ) : (
                  <button onClick={() => remove(item.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={13} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-full sm:w-auto flex-1 min-w-[120px]">
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>Item name</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Name" style={inputStyle} />
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[120px]">
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>Type</label>
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" list={listId} style={inputStyle} />
          <datalist id={listId}>{typePresets.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div className="w-28">
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>Amount</label>
          <input type="number" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="0.00" style={inputStyle} />
        </div>
        <button onClick={() => setRecurring((r) => !r)} style={{ background: recurring ? color : C.graySoft, color: recurring ? "#fff" : C.inkSoft }} className="px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap">
          {recurring ? "Monthly" : "This month only"}
        </button>
        <button onClick={add} style={{ background: color, color: "#fff" }} className="p-2.5 rounded-full shrink-0"><Plus size={16} /></button>
      </div>
      {error && <p className="text-xs font-semibold mt-2" style={{ color: C.coral }}>{error}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Investment Plan (portfolio allocation + scheduled reminders)     */
/* ---------------------------------------------------------------- */
const MONTH_ABBR_TH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL_TH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function nextMonthlyDate(day) {
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
  if (d < todayOnly) d = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(day, 28));
  return toLocalDateStr(d);
}
function addMonthsToDate(dateStr, n) {
  const d = parseLocalDate(dateStr);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toLocalDateStr(target);
}
function nextCustomMonthDateFromToday(months, day) {
  const sorted = [...months].sort((a, b) => a - b);
  if (sorted.length === 0) return todayStr();
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const m of sorted) {
    const lastDay = new Date(now.getFullYear(), m, 0).getDate();
    const candidate = new Date(now.getFullYear(), m - 1, Math.min(day, lastDay));
    if (candidate >= todayOnly) return toLocalDateStr(candidate);
  }
  const m = sorted[0];
  const lastDay = new Date(now.getFullYear() + 1, m, 0).getDate();
  return toLocalDateStr(new Date(now.getFullYear() + 1, m - 1, Math.min(day, lastDay)));
}
function nextCustomMonthDate(dateStr, months) {
  const sorted = [...months].sort((a, b) => a - b);
  if (sorted.length === 0) return dateStr;
  const d = parseLocalDate(dateStr);
  const day = d.getDate();
  const curMonth = d.getMonth() + 1;
  let year = d.getFullYear();
  let nextMonth = sorted.find((m) => m > curMonth);
  if (nextMonth === undefined) { nextMonth = sorted[0]; year += 1; }
  const lastDay = new Date(year, nextMonth, 0).getDate();
  return toLocalDateStr(new Date(year, nextMonth - 1, Math.min(day, lastDay)));
}
function freqLabel(n) {
  return n === 1 ? "Monthly" : `Every ${n} months`;
}

function InvestmentPlanPanel({ investPlan, setInvestPlan, setSavings, savings, showToast, setDeletedInvestItemIds, expenseCategories, setExpenseCategories, banks = [], creditCards = [], setTransactions, transactions, holdings, setHoldings }) {
  const { totalPool, items } = investPlan;
  const [subView, setSubView] = useState("items");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("thb");
  const [value, setValue] = useState("");
  const [scheduleType, setScheduleType] = useState("monthly");
  const [scheduleMode, setScheduleMode] = useState("interval");
  const [date, setDate] = useState(todayStr());
  const [day, setDay] = useState(5);
  const [intervalMonths, setIntervalMonths] = useState(1);
  const [customMonths, setCustomMonths] = useState([]);
  const [time, setTime] = useState("09:00");

  function setTotalPool(v) { setInvestPlan((p) => ({ ...p, totalPool: parseFloat(v) || 0 })); }
  function toggleCustomMonth(m) {
    setCustomMonths((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b));
  }

  function addItem() {
    const val = parseFloat(value);
    if (!val || val <= 0 || !name.trim()) return;
    if (scheduleType === "monthly" && scheduleMode === "custom" && customMonths.length === 0) return;
    const itemDate = scheduleType !== "monthly" ? date
      : scheduleMode === "custom" ? nextCustomMonthDateFromToday(customMonths, day)
      : nextMonthlyDate(day);
    const item = {
      id: uid(), name: name.trim(), category: category.trim() || "Other",
      mode, value: val, date: itemDate, time, recurring: scheduleType === "monthly",
      scheduleMode: scheduleType === "monthly" ? scheduleMode : "interval",
      intervalMonths: scheduleType === "monthly" && scheduleMode === "interval" ? Math.max(1, Math.min(12, parseInt(intervalMonths) || 1)) : 1,
      months: scheduleType === "monthly" && scheduleMode === "custom" ? [...customMonths] : [],
      executed: false,
    };
    setInvestPlan((p) => ({ ...p, items: [...p.items, item] }));
    setName(""); setCategory(""); setValue("");
    showToast("Saved successfully ✓");
  }
  function removeItem(id) {
    setInvestPlan((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
    setDeletedInvestItemIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showToast("Deleted successfully ✓");
  }
  function updateItem(id, patch) {
    setInvestPlan((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }
  // Some months you just don't invest in a particular item — skip it
  // forward to the next cycle without creating any transaction/savings/
  // portfolio record, unlike marking it executed.
  function skipItem(item) {
    if (!item.recurring) return;
    const nextDate = item.scheduleMode === "custom" && item.months?.length
      ? nextCustomMonthDate(item.date, item.months)
      : addMonthsToDate(item.date, item.intervalMonths || 1);
    updateItem(item.id, { date: nextDate });
    showToast("Cycle skipped ✓");
  }
  function markExecuted(item, paymentInfo) {
    const ym = item.date.slice(0, 7);
    const amt = investItemAmount(item, totalPool, ym, investPlan.overrides);
    setSavings((prev) => [{ id: uid(), kind: "investment", name: item.name, amount: amt, date: item.date, target: null, note: item.category }, ...prev]);
    // Ensure the "Investment" category exists for accounts that predate
    // this feature, then log the actual expense transaction — same pattern
    // as marking a debt paid.
    if (!expenseCategories.some((c) => c.key === "investment")) {
      setExpenseCategories((prev) => [...prev, { key: "investment", label: "Investment", icon: "TrendingUp", color: "#4FB6E8", subcategories: [] }]);
    }
    setTransactions((prev) => [{
      id: uid(), type: "expense", category: "investment", subcategory: null,
      amount: amt, date: todayStr(),
      payment: paymentInfo.payment,
      bank: paymentInfo.payment === "transfer" ? paymentInfo.bank : null,
      card: paymentInfo.payment === "credit" ? paymentInfo.card : null,
      note: item.name,
    }, ...prev]);
    // Also roll this into Portfolio — same-named holding gets topped up
    // (both invested and current move together for the new money) rather
    // than creating a duplicate entry.
    setHoldings((prev) => {
      const idx = prev.findIndex((h) => h.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (idx === -1) {
        return [{ id: uid(), name: item.name, category: item.category || "Other", invested: amt, current: amt, date: item.date }, ...prev];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], invested: next[idx].invested + amt, current: next[idx].current + amt };
      return next;
    });
    if (item.recurring) {
      const nextDate = item.scheduleMode === "custom" && item.months?.length
        ? nextCustomMonthDate(item.date, item.months)
        : addMonthsToDate(item.date, item.intervalMonths || 1);
      updateItem(item.id, { date: nextDate, executed: false });
    } else {
      updateItem(item.id, { executed: true });
    }
    showToast("Investment saved ✓");
  }
  // Marking an item as invested needs a real payment channel (mirrors the
  // Debts page) so the auto-logged transaction is accurate — opens a picker
  // instead of assuming a channel. Investment additionally allows credit
  // card, unlike Debts where paying via credit doesn't make sense.
  const [pendingExecItem, setPendingExecItem] = useState(null);
  const [execPayMethod, setExecPayMethod] = useState(null);
  const [execPayBank, setExecPayBank] = useState(null);
  const [execPayCard, setExecPayCard] = useState(null);
  function startExecute(item) {
    if (item.executed) return;
    setPendingExecItem(item); setExecPayMethod(null); setExecPayBank(null); setExecPayCard(null);
  }
  function confirmExecute() {
    if (!execPayMethod) return;
    if (execPayMethod === "credit" && !execPayCard) return;
    markExecuted(pendingExecItem, { payment: execPayMethod, bank: execPayBank, card: execPayCard });
    setPendingExecItem(null);
  }

  const totalAllocated = items.reduce((a, i) => a + investItemAmount(i, totalPool), 0);
  const remaining = totalPool - totalAllocated;
  const pieData = items.filter((i) => investItemAmount(i, totalPool) > 0).map((i, idx) => ({ name: i.name, value: investItemAmount(i, totalPool), color: INVEST_PALETTE[idx % INVEST_PALETTE.length] }));

  return (
    <div className="flex flex-col gap-4">
      {pendingExecItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setPendingExecItem(null)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Select payment method</p>
              <button onClick={() => setPendingExecItem(null)} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
            </div>
            <p className="text-xs mb-4" style={{ color: C.inkSoft }}>{pendingExecItem.name} · {fmtTHB(investItemAmount(pendingExecItem, totalPool, pendingExecItem.date.slice(0, 7), investPlan.overrides))}</p>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <button onClick={() => { setExecPayMethod("cash"); setExecPayBank(null); setExecPayCard(null); }} style={{ background: execPayMethod === "cash" ? C.purple : C.graySoft, color: execPayMethod === "cash" ? "#fff" : C.inkSoft }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold">
                <Banknote size={18} />Cash
              </button>
              <button onClick={() => { setExecPayMethod("transfer"); setExecPayCard(null); }} style={{ background: execPayMethod === "transfer" ? C.purple : C.graySoft, color: execPayMethod === "transfer" ? "#fff" : C.inkSoft }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold">
                <Landmark size={18} />Transfer
              </button>
              <button onClick={() => { setExecPayMethod("credit"); setExecPayBank(null); }} style={{ background: execPayMethod === "credit" ? C.purple : C.graySoft, color: execPayMethod === "credit" ? "#fff" : C.inkSoft }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold">
                <CreditCard size={18} />Credit Card
              </button>
            </div>
            {execPayMethod === "transfer" && banks.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold mb-2" style={{ color: C.inkSoft }}>Select bank (optional)</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setExecPayBank(null)} style={{ background: !execPayBank ? C.purple : C.graySoft, color: !execPayBank ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">Unspecified</button>
                  {banks.map((b) => (
                    <button key={b.name} onClick={() => setExecPayBank(b.name)} style={{ background: execPayBank === b.name ? b.color : C.graySoft, color: execPayBank === b.name ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">{b.name}</button>
                  ))}
                </div>
              </div>
            )}
            {execPayMethod === "credit" && (
              <div className="mb-4">
                <p className="text-xs font-bold mb-2" style={{ color: C.inkSoft }}>Select card</p>
                {creditCards.length === 0 ? (
                  <p className="text-xs" style={{ color: C.inkSoft }}>No credit cards yet — add one on the Settings page</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {creditCards.map((c) => (
                      <button key={c.name} onClick={() => setExecPayCard(c.name)} style={{ background: execPayCard === c.name ? c.color : C.graySoft, color: execPayCard === c.name ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">{c.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={confirmExecute} disabled={!execPayMethod || (execPayMethod === "credit" && !execPayCard)} style={{ background: (execPayMethod && !(execPayMethod === "credit" && !execPayCard)) ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` : C.graySoft, color: (execPayMethod && !(execPayMethod === "credit" && !execPayCard)) ? "#fff" : C.inkSoft }} className="w-full py-2.5 rounded-full text-sm font-bold">
              Confirm Invested
            </button>
          </div>
        </div>
      )}
      <div className="flex rounded-full overflow-hidden p-1 w-fit" style={{ background: C.graySoft }}>
        <button onClick={() => setSubView("items")} style={{ background: subView === "items" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full shadow-sm">Items</button>
        <button onClick={() => setSubView("monthly")} style={{ background: subView === "monthly" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-1"><Calendar size={12} />Monthly Plan</button>
        <button onClick={() => setSubView("summary")} style={{ background: subView === "summary" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-1"><PieChartIcon size={12} />Summary</button>
      </div>

      {subView === "items" && (
      <>
      {pieData.length > 0 && (
        <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Portfolio allocation</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: "100%", maxWidth: 200, height: 190 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={78} paddingAngle={3} cornerRadius={6}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtTHB(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full flex flex-col gap-2">
              {pieData.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold"><span style={{ width: 10, height: 10, borderRadius: 10, background: e.color }} />{e.name}</span>
                  <span style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{fmtTHB(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Investment item</p>
        {items.length === 0 ? <EmptyNote text="No investment items yet — add your first one below" /> : (
          <div className="flex flex-col gap-2 mb-1">
            {items.map((item) => {
              const amt = investItemAmount(item, totalPool, item.date.slice(0, 7), investPlan.overrides);
              const st = investItemStatus(item);
              const chipColor = { hot: C.coral, warn: C.yellowDeep, done: C.teal, ok: C.gray }[st.level];
              const chipBg = { hot: C.coralSoft, warn: C.yellowSoft, done: C.tealSoft, ok: C.graySoft }[st.level];
              return (
                <div key={item.id} style={{ background: C.bg }} className="rounded-2xl px-3.5 py-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div style={{ background: C.purple }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={15} color="#fff" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ textDecoration: item.executed ? "line-through" : "none" }}>{item.name}</p>
                      <p className="text-[11px] flex items-center gap-1 flex-wrap" style={{ color: C.inkSoft }}>
                        <Tag size={10} /><span>{item.category}</span><span>·</span>
                        {item.recurring ? (
                          item.scheduleMode === "custom" ? (
                            <span className="flex items-center gap-1 flex-wrap">
                              <Repeat size={10} />Only {(item.months || []).map((m) => MONTH_ABBR_TH[m - 1]).join(", ")} on day {parseLocalDate(item.date).getDate()}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Repeat size={10} />Every
                              <input type="number" min="1" max="12" defaultValue={item.intervalMonths || 1} key={item.id + "-freq"}
                                onBlur={(e) => updateItem(item.id, { intervalMonths: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })}
                                style={{ width: 32, border: `1px solid ${C.graySoft}`, borderRadius: 6, padding: "0 2px", textAlign: "center", fontSize: 11 }} />
                              months on day {parseLocalDate(item.date).getDate()}
                            </span>
                          )
                        ) : <span>{thDate(item.date)}</span>}
                        <span>·</span><span className="flex items-center gap-0.5"><Clock size={10} />{item.time}</span>
                      </p>
                    </div>
                    <span style={{ background: chipBg, color: chipColor }} className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">{st.text}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-11">
                    <input type="number" min="0" defaultValue={item.value} key={item.id + item.mode}
                      onBlur={(e) => updateItem(item.id, { value: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, width: 100 }} />
                    <span style={{ fontFamily: "'Prompt', sans-serif", color: C.purple }} className="text-sm font-bold flex-1 text-right">{fmtTHB(amt)}</span>
                    {item.recurring && !item.executed && (
                      <button onClick={() => skipItem(item)} title="Skip this cycle (no investment this month)" style={{ color: C.inkSoft }} className="p-1"><SkipForward size={16} /></button>
                    )}
                    <button onClick={() => startExecute(item)} title="Mark as invested" style={{ color: item.executed ? C.teal : C.graySoft }}><CheckCircle2 size={20} /></button>
                    <button onClick={() => removeItem(item.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={13} /></button>
                  </div>
                  {item.recurring && item.scheduleMode === "custom" && (
                    <div className="flex gap-1 mt-2 ml-11 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                      {MONTH_ABBR_TH.map((label, i) => {
                        const m = i + 1;
                        const active = (item.months || []).includes(m);
                        return (
                          <button key={m} onClick={() => {
                            const nextMonths = active ? (item.months || []).filter((x) => x !== m) : [...(item.months || []), m].sort((a, b) => a - b);
                            if (nextMonths.length === 0) return;
                            updateItem(item.id, { months: nextMonths });
                          }} style={{ background: active ? C.purple : C.graySoft, color: active ? "#fff" : C.inkSoft }} className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">{label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: C.inkSoft }}><Info size={12} />Check the box once you've invested — the system logs it into the Saving-Investing page automatically. Monthly items advance to the next due date on their own</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Add new investment item</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Investment item name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SET50 fund" style={inputStyle} /></Field>
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type your own" list="invest-cat-presets" style={inputStyle} />
            <datalist id="invest-cat-presets">{INVEST_CATEGORY_PRESETS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="Investment amount (THB)">
          <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 2000" style={{ ...inputStyle, width: 160 }} />
        </Field>
        <div className="h-3" />
        <Field label="Investment schedule">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
              <button onClick={() => setScheduleType("monthly")} style={{ background: scheduleType === "monthly" ? C.purple : "transparent", color: scheduleType === "monthly" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"><Repeat size={11} />Recurring</button>
              <button onClick={() => setScheduleType("once")} style={{ background: scheduleType === "once" ? C.purple : "transparent", color: scheduleType === "once" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">One-time</button>
            </div>
            {scheduleType === "monthly" && (
              <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
                <button onClick={() => setScheduleMode("interval")} style={{ background: scheduleMode === "interval" ? C.purple : "transparent", color: scheduleMode === "interval" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">Every N months</button>
                <button onClick={() => setScheduleMode("custom")} style={{ background: scheduleMode === "custom" ? C.purple : "transparent", color: scheduleMode === "custom" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">Custom months</button>
              </div>
            )}
            {scheduleType === "monthly" ? (
              scheduleMode === "interval" ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}>
                  Day <input type="number" min="1" max="28" value={day} onChange={(e) => setDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 60 }} /> of every
                  <input type="number" min="1" max="12" value={intervalMonths} onChange={(e) => setIntervalMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 50 }} /> month(s)
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}>
                  Day <input type="number" min="1" max="28" value={day} onChange={(e) => setDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 60 }} /> of selected month
                </div>
              )
            ) : (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
            )}
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
          </div>
          {scheduleType === "monthly" && scheduleMode === "interval" && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1, 2, 3, 6, 12].map((n) => (
                <button key={n} onClick={() => setIntervalMonths(n)} style={{ background: intervalMonths === n ? C.purpleSoft : C.graySoft, color: intervalMonths === n ? C.purpleDeep : C.inkSoft }} className="px-2.5 py-1 rounded-full text-[11px] font-bold">{freqLabel(n)}</button>
              ))}
            </div>
          )}
          {scheduleType === "monthly" && scheduleMode === "custom" && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {MONTH_ABBR_TH.map((label, i) => {
                const m = i + 1;
                const active = customMonths.includes(m);
                return (
                  <button key={m} onClick={() => toggleCustomMonth(m)} style={{ background: active ? C.purple : C.graySoft, color: active ? "#fff" : C.inkSoft }} className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0">{label}</button>
                );
              })}
            </div>
          )}
        </Field>
        <button onClick={addItem} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> Add investment item</button>
      </div>
      </>
      )}

      {subView === "monthly" && (
        <InvestMonthlyPlanner investPlan={investPlan} setInvestPlan={setInvestPlan} />
      )}

      {subView === "summary" && (
        <InvestSummary transactions={transactions} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Investment monthly planner — pick which item invests how much,   */
/*  per specific month                                                */
/* ---------------------------------------------------------------- */
function isItemScheduledFor(item, targetYm) {
  if (!item.recurring) return item.date.slice(0, 7) === targetYm; // one-time: only its own month
  if (item.scheduleMode === "custom") {
    const [, tm] = targetYm.split("-").map(Number);
    return (item.months || []).includes(tm);
  }
  // Interval mode: item.date is one real occurrence in the sequence (it
  // advances every time the item is executed/skipped), so any target month
  // an exact multiple of intervalMonths away from it is also a real
  // occurrence — this holds regardless of which occurrence we compare
  // against, forward or backward.
  const n = item.intervalMonths || 1;
  const diff = monthsBetweenYm(item.date.slice(0, 7), targetYm);
  return ((diff % n) + n) % n === 0;
}
function InvestMonthlyPlanner({ investPlan, setInvestPlan }) {
  const { totalPool, items, overrides } = investPlan;
  const [ym, setYm] = useState(ymOf(new Date()));

  function setOverride(itemId, val) {
    const amt = parseFloat(val);
    if (isNaN(amt) || amt < 0) return;
    setInvestPlan((p) => ({ ...p, overrides: { ...(p.overrides || {}), [ym]: { ...((p.overrides || {})[ym] || {}), [itemId]: amt } } }));
  }
  function resetOverride(itemId) {
    setInvestPlan((p) => {
      const next = { ...(p.overrides || {}) };
      if (!next[ym] || !(itemId in next[ym])) return p;
      next[ym] = { ...next[ym] };
      delete next[ym][itemId];
      return { ...p, overrides: next };
    });
  }

  const rows = items.filter((item) => isItemScheduledFor(item, ym)).map((item) => ({ item, amt: investItemAmount(item, totalPool, ym, overrides), overridden: overrides?.[ym]?.[item.id] !== undefined }));
  const monthTotal = rows.reduce((a, r) => a + r.amt, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setYm((p) => addMonths(p, -1))} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">{monthLabel(ym)}</p>
        <button onClick={() => setYm((p) => addMonths(p, 1))} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">Total investment plan this month</p>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(monthTotal)}</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Set each item's amount for this month</p>
        {rows.length === 0 ? <EmptyNote text={items.length === 0 ? "No investment items yet — add one on the 'Items' tab first" : "No items scheduled for this month"} /> : (
          <div className="flex flex-col gap-2">
            {rows.map(({ item, amt, overridden }) => (
              <div key={item.id} style={{ background: C.bg }} className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl">
                <div style={{ background: C.purple }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={15} color="#fff" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-[11px] flex items-center gap-1" style={{ color: C.inkSoft }}>
                    <Tag size={10} />{item.category}{overridden && <span style={{ color: C.purple }} className="font-bold">· set this month only</span>}
                  </p>
                </div>
                <input type="number" min="0" defaultValue={amt} key={ym + item.id + amt}
                  onBlur={(e) => setOverride(item.id, e.target.value)} style={{ ...inputStyle, width: 100 }} />
                {overridden && (
                  <button onClick={() => resetOverride(item.id)} title="Reset to default" style={{ color: C.inkSoft }} className="p-1"><RotateCcw size={13} /></button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: C.inkSoft }}>Freely adjust each item's amount for this month only (some months you might skip one — just enter 0). This amount is used when you check "Invested" on the "Items" tab once this month is due</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Investment summary — actual invested amounts by month / by year  */
/* ---------------------------------------------------------------- */
function InvestSummary({ transactions }) {
  const [mode, setMode] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  // "Actual invested" should reflect real, confirmed transactions — not a
  // separately-tracked log that could drift out of sync (e.g. if someone
  // edits/deletes the underlying transaction later).
  const invested = useMemo(() => transactions.filter((t) => t.type === "expense" && t.category === "investment"), [transactions]);

  const monthlyData = useMemo(() => {
    const totals = Array(12).fill(0);
    invested.forEach((s) => {
      const [y, m] = s.date.split("-").map(Number);
      if (y === year) totals[m - 1] += Number(s.amount);
    });
    return totals.map((v, i) => ({ label: MONTH_ABBR_TH[i], value: v }));
  }, [invested, year]);
  const yearTotal = monthlyData.reduce((a, m) => a + m.value, 0);

  const yearlyData = useMemo(() => {
    const totals = {};
    invested.forEach((s) => { const y = s.date.slice(0, 4); totals[y] = (totals[y] || 0) + Number(s.amount); });
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).map(([y, v]) => ({ label: String(Number(y)), value: v }));
  }, [invested]);
  const allTimeTotal = yearlyData.reduce((a, y) => a + y.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full overflow-hidden p-1 w-fit" style={{ background: C.graySoft }}>
        <button onClick={() => setMode("monthly")} style={{ background: mode === "monthly" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full shadow-sm">Monthly</button>
        <button onClick={() => setMode("yearly")} style={{ background: mode === "yearly" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full">Yearly</button>
      </div>

      {mode === "monthly" ? (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setYear((y) => y - 1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Year {year}</p>
            <button onClick={() => setYear((y) => y + 1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
          </div>
          <div style={{ background: `linear-gradient(135deg, ${C.teal}, #22A184)` }} className="rounded-3xl p-5 text-white shadow-sm">
            <p className="text-xs font-semibold opacity-90 mb-1">Total actual investment this year</p>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(yearTotal)}</p>
          </div>
          <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Actual investment by month</p>
            {yearTotal === 0 ? <EmptyNote text="No actual investments this year" /> : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.graySoft} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip formatter={(v) => fmtTHB(v)} />
                    <Bar dataKey="value" fill={C.purple} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ background: `linear-gradient(135deg, ${C.blue}, #2E93C4)` }} className="rounded-3xl p-5 text-white shadow-sm">
            <p className="text-xs font-semibold opacity-90 mb-1">Total actual investment</p>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(allTimeTotal)}</p>
          </div>
          <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Actual investment by year</p>
            {yearlyData.length === 0 ? <EmptyNote text="No actual investments yet" /> : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.graySoft} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip formatter={(v) => fmtTHB(v)} />
                    <Bar dataKey="value" fill={C.blue} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
      <p className="text-[11px] px-1" style={{ color: C.inkSoft }}>This summary is calculated from items actually checked "Invested" (logged on the "Saving-Investing" page) — not just what was planned</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Current Portfolio Holdings — invested amount vs. current value   */
/* ---------------------------------------------------------------- */
function PortfolioHoldingsPanel({ holdings, setHoldings, setDeletedHoldingIds, showToast }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState(todayStr());

  function add() {
    const inv = parseFloat(invested);
    if (!inv || inv <= 0 || !name.trim()) return;
    const cur = current !== "" ? parseFloat(current) : inv;
    setHoldings((prev) => [{ id: uid(), name: name.trim(), category: category.trim() || "Other", invested: inv, current: cur, date }, ...prev]);
    setName(""); setCategory(""); setInvested(""); setCurrent("");
    showToast("Saved successfully ✓");
  }
  function remove(id) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
    setDeletedHoldingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    showToast("Deleted successfully ✓");
  }
  function updateCurrent(id, val) {
    const v = parseFloat(val);
    if (isNaN(v)) return;
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, current: v } : h)));
  }

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const totalCurrent = holdings.reduce((a, h) => a + h.current, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const gainColor = totalGain > 0 ? C.teal : totalGain < 0 ? C.coral : C.gray;

  const pieData = holdings.filter((h) => h.current > 0).map((h, idx) => ({ name: h.name, value: h.current, color: INVEST_PALETTE[idx % INVEST_PALETTE.length] }));

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: `linear-gradient(135deg, ${gainColor}, ${totalGain >= 0 ? "#22A184" : "#D6472C"})` }} className="rounded-3xl p-5 text-white shadow-sm">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <SummaryMini label="Total Invested" value={totalInvested} />
          <SummaryMini label="Profit/Loss" value={totalGain} />
          <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
            <p className="opacity-90 font-semibold">Return</p>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-sm flex items-center gap-1">
              {totalGain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {pieData.length > 0 && (
        <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Current value breakdown by item</p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: "100%", maxWidth: 200, height: 190 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={78} paddingAngle={3} cornerRadius={6}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtTHB(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full flex flex-col gap-2">
              {pieData.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold"><span style={{ width: 10, height: 10, borderRadius: 10, background: e.color }} />{e.name}</span>
                  <span style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">{fmtTHB(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Currently invested items</p>
        {holdings.length === 0 ? <EmptyNote text="No items yet — add an existing investment below" /> : (
          <div className="flex flex-col gap-2">
            {holdings.map((h) => {
              const gain = h.current - h.invested;
              const gainPct = h.invested > 0 ? (gain / h.invested) * 100 : 0;
              const color = gain > 0 ? C.teal : gain < 0 ? C.coral : C.gray;
              return (
                <div key={h.id} style={{ background: C.bg }} className="rounded-2xl px-3.5 py-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div style={{ background: C.purple }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Rocket size={15} color="#fff" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{h.name}</p>
                      <p className="text-[11px] flex items-center gap-1" style={{ color: C.inkSoft }}><Tag size={10} />{h.category}</p>
                    </div>
                    <span style={{ background: color === C.teal ? C.tealSoft : color === C.coral ? C.coralSoft : C.graySoft, color }} className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 shrink-0">
                      {gain !== 0 && (gain > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                      <span style={{ opacity: 0.7 }}>·</span>
                      {gain >= 0 ? "+" : ""}{fmtTHB(gain)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-11 text-xs flex-nowrap overflow-x-auto" style={{ color: C.inkSoft, scrollbarWidth: "none" }}>
                    <span className="whitespace-nowrap shrink-0">Invested: <b style={{ color: C.ink, fontFamily: "'Prompt', sans-serif" }}>{fmtTHB(h.invested)}</b></span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="whitespace-nowrap">Current value:</span>
                      <input type="number" min="0" defaultValue={h.current} key={h.id + h.current}
                        onBlur={(e) => updateCurrent(h.id, e.target.value)} style={{ ...inputStyle, width: 90, padding: "4px 8px" }} />
                    </span>
                    <button onClick={() => remove(h.id)} style={{ color: C.gray }} className="p-1 ml-auto shrink-0"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Add an existing investment</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="Item name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PTT stock" style={inputStyle} /></Field>
          <Field label="Category">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type your own" list="holding-cat-presets" style={inputStyle} />
            <datalist id="holding-cat-presets">{INVEST_CATEGORY_PRESETS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Investment (cost)"><input type="number" min="0" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="Current value (blank = same as cost)"><input type="number" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
        </div>
        <button onClick={add} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> Add item</button>
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Use this to log investments you already held before using the app, then update the "current value" periodically to track returns — separate from the totals on the "Saving-Investing" and "Investment Plan" tabs</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Home Loan Planning — amortization monitor & fix-cost sync        */
/* ---------------------------------------------------------------- */
function HomePlanningTab({ homeLoan, setHomeLoan, planOverrides, setPlanOverrides, planFixCostItems, setPlanFixCostItems, debts, showToast }) {
  const [editing, setEditing] = useState(!homeLoan.active);
  const [name, setName] = useState(homeLoan.name);
  const [principal, setPrincipal] = useState(homeLoan.principal || "");
  const [startMonth, setStartMonth] = useState(homeLoan.startMonth);
  const [payment, setPayment] = useState(homeLoan.payment || "");
  const [dueDay, setDueDay] = useState(homeLoan.dueDay || 5);
  const [initialRate, setInitialRate] = useState(homeLoan.rateChanges?.[0]?.rate ?? "");
  const [newRate, setNewRate] = useState("");
  const [newRateMonth, setNewRateMonth] = useState(ymOf(new Date()));
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [justSynced, setJustSynced] = useState(false);

  const schedule = useMemo(() => buildAmortizationSchedule(homeLoan, planOverrides), [homeLoan, planOverrides]);
  const currentYm = ymOf(new Date());
  // "Current" installment tracks the actual Debts entry, not the calendar —
  // its dueDate only advances once you mark it paid there, so if a month is
  // still outstanding in Debts, it stays the "current" one here too.
  const loanDebt = debts?.find((d) => d.id === HOME_LOAN_DEBT_ID);
  const unpaidSinceYm = loanDebt && !loanDebt.paid ? loanDebt.dueDate.slice(0, 7) : currentYm;
  const isOverdue = unpaidSinceYm < currentYm;
  const currentRowIndex = schedule.findIndex((r) => r.ym >= unpaidSinceYm);
  const paidOff = homeLoan.active && schedule.length > 0 && currentRowIndex === -1;
  const remainingInstallments = currentRowIndex === -1 ? 0 : schedule.length - currentRowIndex;
  const payoffYm = schedule.length ? schedule[schedule.length - 1].ym : null;
  const currentRemaining = paidOff ? 0 : currentRowIndex === -1 ? homeLoan.principal : currentRowIndex === 0 ? homeLoan.principal : schedule[currentRowIndex - 1].remaining;
  const interestPaidSoFar = schedule.filter((r) => r.ym < unpaidSinceYm).reduce((a, r) => a + r.interest, 0);
  const interestRemaining = schedule.filter((r) => r.ym >= unpaidSinceYm).reduce((a, r) => a + r.interest, 0);
  const currentRate = rateForMonth(homeLoan.rateChanges, unpaidSinceYm);
  const hitCap = homeLoan.active && schedule.length >= 600;
  const syncedInFixCost = planFixCostItems.some((i) => i.id === HOME_LOAN_FIXCOST_ID);

  function syncNow() {
    const itemName = homeLoan.name || "Home Loan";
    const item = {
      id: HOME_LOAN_FIXCOST_ID, name: itemName, type: "Rent/Home Loan",
      amount: homeLoan.payment, recurring: true, startMonth: homeLoan.startMonth, endMonth: payoffYm, auto: true,
    };
    setPlanFixCostItems((prev) => {
      let next = prev.filter((i) => i.id === HOME_LOAN_FIXCOST_ID || i.auto || i.name.trim().toLowerCase() !== itemName.trim().toLowerCase());
      const idx = next.findIndex((i) => i.id === HOME_LOAN_FIXCOST_ID);
      if (idx === -1) return [...next, item];
      next = [...next]; next[idx] = { ...next[idx], ...item };
      return next;
    });
    setJustSynced(true);
    setTimeout(() => setJustSynced(false), 2500);
  }

  function save() {
    const p = parseFloat(principal), pay = parseFloat(payment), rate = parseFloat(initialRate);
    if (!p || p <= 0 || !pay || pay <= 0 || isNaN(rate)) return;
    setHomeLoan((prev) => ({
      active: true, name: name.trim() || "Home Loan", principal: p, startMonth, payment: pay,
      dueDay: Math.min(31, Math.max(1, parseInt(dueDay) || 5)),
      rateChanges: prev.active && prev.rateChanges?.length ? prev.rateChanges : [{ ym: startMonth, rate }],
      paidMonths: prev.paidMonths || {},
    }));
    setEditing(false);
  }
  function resetLoan() {
    setHomeLoan({ active: false, name: "", principal: 0, startMonth: ymOf(new Date()), payment: 0, dueDay: 5, rateChanges: [], paidMonths: {} });
    setPlanOverrides((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((ym) => { if (next[ym]?.[HOME_LOAN_FIXCOST_ID] !== undefined) { next[ym] = { ...next[ym] }; delete next[ym][HOME_LOAN_FIXCOST_ID]; } });
      return next;
    });
    setEditing(true); setName(""); setPrincipal(""); setPayment(""); setInitialRate("");
  }
  function addRateChange() {
    const r = parseFloat(newRate);
    if (isNaN(r) || r < 0) return;
    setHomeLoan((p) => ({ ...p, rateChanges: [...(p.rateChanges || []), { ym: newRateMonth, rate: r }] }));
    setNewRate("");
    showToast("Saved successfully ✓");
  }
  function removeRateChange(idx) {
    setHomeLoan((p) => ({ ...p, rateChanges: p.rateChanges.filter((_, i) => i !== idx) }));
    showToast("Deleted successfully ✓");
  }
  function togglePaid(ym) {
    setHomeLoan((p) => {
      const next = { ...(p.paidMonths || {}) };
      if (next[ym]) delete next[ym]; else next[ym] = true;
      return { ...p, paidMonths: next };
    });
  }
  function updateActualPayment(ym, val) {
    const amt = parseFloat(val);
    if (isNaN(amt) || amt < 0) return;
    setPlanOverrides((prev) => ({ ...prev, [ym]: { ...(prev[ym] || {}), [HOME_LOAN_FIXCOST_ID]: amt } }));
  }

  if (!homeLoan.active || editing) {
    return (
      <div className="flex flex-col gap-4">
        <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3 flex items-center gap-2"><Home size={16} color={C.brown} />Set up home loan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Item name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Krungsri home loan" style={inputStyle} /></Field>
            <Field label="Starting principal (THB)"><input type="number" min="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
            <Field label="Month payments start"><input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} style={inputStyle} /></Field>
            <Field label="Monthly payment (THB)"><input type="number" min="0" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
            <Field label="Due date"><input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} style={inputStyle} /></Field>
            <Field label="Starting interest rate (% p.a.)"><input type="number" min="0" step="0.01" value={initialRate} onChange={(e) => setInitialRate(e.target.value)} placeholder="e.g. 6.5" style={inputStyle} /></Field>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} style={{ background: `linear-gradient(135deg, ${C.brown}, #A85F2C)`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> Save loan info</button>
            {homeLoan.active && <button onClick={() => setEditing(false)} style={{ background: C.graySoft, color: C.inkSoft }} className="px-4 py-2.5 rounded-full text-sm font-bold">Cancel</button>}
          </div>
          <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>The system calculates the payment schedule (interest/principal/remaining principal) and syncs the payment into the Fix Cost item on the "Monthly Plan" page automatically</p>
        </div>
      </div>
    );
  }

  const yearRows = schedule.filter((r) => r.ym.slice(0, 4) === String(viewYear));
  const minYear = schedule.length ? parseInt(schedule[0].ym.slice(0, 4)) : viewYear;
  const maxYear = schedule.length ? parseInt(schedule[schedule.length - 1].ym.slice(0, 4)) : viewYear;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg flex items-center gap-2"><Home size={18} color={C.brown} />{homeLoan.name}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><Settings size={14} /></button>
          <button onClick={resetLoan} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><Trash2 size={14} color={C.coral} /></button>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.brown}, #A85F2C)` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">{paidOff ? "Fully paid off 🎉" : "Principal remaining now"}</p>
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="text-3xl font-extrabold mb-3">{fmtTHB(currentRemaining)}</p>
        {isOverdue && (
          <div style={{ background: "rgba(255,255,255,0.22)" }} className="rounded-xl px-3 py-2 mb-3 text-xs font-bold flex items-center gap-1.5">
            <span>⚠️</span><span>Overdue since {monthLabel(unpaidSinceYm)} — not yet marked paid on the "Debts" page. This table will stay on this month until you mark it paid</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SummaryMini label="Installments left" value={remainingInstallments} sub="installment" isText />
          <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
            <p className="opacity-90 font-semibold">Expected payoff</p>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-sm">{payoffYm ? monthLabel(payoffYm) : "-"}</p>
          </div>
          <SummaryMini label="Interest paid so far (est.)" value={interestPaidSoFar} />
          <SummaryMini label="Interest remaining (est.)" value={interestRemaining} />
        </div>
      </div>

      {hitCap && (
        <div style={{ background: C.coralSoft, color: C.coral }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>The monthly payment may not cover all the interest — the system couldn't find a payoff date within 50 years. Try increasing the monthly payment</span>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">Interest rate</p>
        <div className="flex items-center gap-2 mb-3">
          <div style={{ background: C.brownSoft }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Percent size={15} color={C.brown} /></div>
          <p className="text-sm font-bold">Currently {currentRate}% p.a.</p>
        </div>
        {homeLoan.rateChanges?.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {[...homeLoan.rateChanges].sort((a, b) => a.ym.localeCompare(b.ym)).map((rc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}>
                <span className="flex-1">From {monthLabel(rc.ym)}</span>
                <span style={{ fontFamily: "'Prompt', sans-serif", color: C.ink }} className="font-bold">{rc.rate}%</span>
                <button onClick={() => removeRateChange(homeLoan.rateChanges.indexOf(rc))} style={{ color: C.gray }} className="p-1"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>New interest rate (%)</label>
            <input type="number" min="0" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="e.g. 7.2" style={{ ...inputStyle, width: 110 }} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>Effective from month</label>
            <input type="month" value={newRateMonth} onChange={(e) => setNewRateMonth(e.target.value)} style={{ ...inputStyle, width: 150 }} />
          </div>
          <button onClick={addRateChange} style={{ background: C.brown, color: "#fff" }} className="p-2.5 rounded-full"><Plus size={16} /></button>
        </div>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold">Payment schedule</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewYear((y) => y - 1)} style={{ background: C.graySoft, color: C.inkSoft }} className="p-1.5 rounded-full"><ChevronLeft size={14} /></button>
            <span style={{ fontFamily: "'Prompt', sans-serif" }} className="text-sm font-bold whitespace-nowrap">Year {viewYear}</span>
            <button onClick={() => setViewYear((y) => y + 1)} style={{ background: C.graySoft, color: C.inkSoft }} className="p-1.5 rounded-full"><ChevronRight size={14} /></button>
            <button onClick={() => setViewYear(new Date().getFullYear())} style={{ background: C.brownSoft, color: C.brown }} className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">This year</button>
          </div>
        </div>
        {yearRows.length === 0 ? (
          <EmptyNote text={viewYear < minYear ? "Payments haven't started this year" : viewYear > maxYear ? "Fully paid off before this year" : "No items this year"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.inkSoft }}>
                  <th className="text-center font-bold pb-2 pr-1">Paid</th>
                  <th className="text-left font-bold pb-2 pr-2">Month</th>
                  <th className="text-right font-bold pb-2 px-2">Actual Payment</th>
                  <th className="text-right font-bold pb-2 px-2">Interest</th>
                  <th className="text-right font-bold pb-2 px-2">Interest paid</th>
                  <th className="text-right font-bold pb-2 px-2">Principal reduced</th>
                  <th className="text-right font-bold pb-2 pl-2">Principal left</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((r) => {
                  const isCurrent = r.ym === currentYm;
                  const isPaid = !!homeLoan.paidMonths?.[r.ym];
                  return (
                    <tr key={r.ym} style={{ background: isCurrent ? C.brownSoft : "transparent", borderTop: `1px solid ${C.graySoft}` }}>
                      <td className="text-center py-2 pr-1">
                        <button onClick={() => togglePaid(r.ym)}><CheckCircle2 size={18} color={isPaid ? C.teal : C.graySoft} /></button>
                      </td>
                      <td className="py-2 pr-2 font-bold whitespace-nowrap">{monthLabel(r.ym)}{isCurrent ? " •" : ""}</td>
                      <td className="text-right px-2 whitespace-nowrap">
                        <input type="number" min="0" defaultValue={r.payment} key={r.ym + "-pay-" + r.payment}
                          onBlur={(e) => updateActualPayment(r.ym, e.target.value)}
                          style={{ ...inputStyle, width: 90, padding: "4px 8px", fontFamily: "'Prompt', sans-serif", textAlign: "right" }} />
                      </td>
                      <td className="text-right px-2 whitespace-nowrap">{r.rate}%</td>
                      <td className="text-right px-2 whitespace-nowrap" style={{ color: C.coral }}>{fmtTHB(r.interest)}</td>
                      <td className="text-right px-2 whitespace-nowrap" style={{ color: C.teal }}>{fmtTHB(r.principalPaid)}</td>
                      <td className="text-right pl-2 whitespace-nowrap font-bold">{fmtTHB(r.remaining)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: C.inkSoft }}>Check "Paid" to tick off months you've paid, and edit the "actual payment" directly in the table (e.g. an extra payment some month) — the whole table recalculates principal/interest instantly. This is also tied to the Fix Cost item on the "Monthly Plan" page</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Settings — user-editable categories, subcategories, credit cards */
/*  (per-account, since storage is already isolated per user)        */
/* ---------------------------------------------------------------- */
function SettingsPage({ expenseCategories, setExpenseCategories, creditCards, setCreditCards, cardSettings, setCardSettings, banks, setBanks, bankBalances, setBankBalances, transactions, debts, setTransactions, setDebts, setDeletedBankNames, setDeletedCardNames, setDeletedCategoryKeys, showToast, onClose }) {
  const [section, setSection] = useState("categories");
  const [expandedCat, setExpandedCat] = useState(null);
  const [form, setForm] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(creditCards[0]?.name || "");
  const [bankMergeTarget, setBankMergeTarget] = useState(banks[0]?.name || "");

  const orphanedCardNames = useMemo(() => {
    const validNames = new Set(creditCards.map((c) => c.name));
    const counts = new Map();
    transactions.forEach((t) => { if (t.card && !validNames.has(t.card)) counts.set(t.card, (counts.get(t.card) || 0) + 1); });
    debts.forEach((d) => { if (d.card && !validNames.has(d.card) && !counts.has(d.card)) counts.set(d.card, 0); });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [transactions, debts, creditCards]);
  const orphanedBankNames = useMemo(() => {
    const validNames = new Set(banks.map((b) => b.name));
    const counts = new Map();
    transactions.forEach((t) => { if (t.bank && !validNames.has(t.bank)) counts.set(t.bank, (counts.get(t.bank) || 0) + 1); });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [transactions, banks]);

  function openNewCategoryForm() {
    setForm({ mode: "newCat", name: "", icon: "Tag", color: CATEGORY_COLOR_PALETTE[expenseCategories.length % CATEGORY_COLOR_PALETTE.length] });
  }
  function openEditCategoryForm(cat) {
    setForm({ mode: "editCat", catKey: cat.key, name: cat.label, icon: cat.icon, color: cat.color });
  }
  function openNewSubForm(catKey) {
    const cat = expenseCategories.find((c) => c.key === catKey);
    setForm({ mode: "newSub", catKey, name: "", icon: "Tag", color: CATEGORY_COLOR_PALETTE[(cat.subcategories?.length || 0) % CATEGORY_COLOR_PALETTE.length] });
  }
  function openEditSubForm(catKey, sub) {
    setForm({ mode: "editSub", catKey, subKey: sub.key, name: sub.label, icon: sub.icon, color: sub.color });
  }
  function openNewCardForm() {
    setForm({ mode: "newCard", name: "", icon: "CreditCard", color: CATEGORY_COLOR_PALETTE[creditCards.length % CATEGORY_COLOR_PALETTE.length], cutoffDay: 25, dueDay: 5 });
  }
  function openEditCardForm(cd) {
    const cs = cardSettings[cd.name] || { cutoffDay: 25, dueDay: 5 };
    setForm({ mode: "editCard", oldName: cd.name, name: cd.name, icon: cd.icon, color: cd.color, cutoffDay: cs.cutoffDay, dueDay: cs.dueDay, mergeFrom: "" });
  }
  function openNewBankForm() {
    setForm({ mode: "newBank", name: "", icon: "Landmark", color: CATEGORY_COLOR_PALETTE[banks.length % CATEGORY_COLOR_PALETTE.length] });
  }
  function openEditBankForm(b) {
    setForm({ mode: "editBank", oldName: b.name, name: b.name, icon: b.icon, color: b.color, mergeFrom: "" });
  }
  function mergeStaleName(currentName, staleName) {
    const from = staleName.trim();
    if (!from || from === currentName) return;
    setTransactions((prev) => prev.map((t) => (t.card === from ? { ...t, card: currentName } : t)));
    const oldPrefix = "cc-" + from + "-";
    setDebts((prev) => {
      const renamedList = prev.map((d) => {
        if (d.card !== from) return d;
        const renamed = { ...d, card: currentName, name: d.name.split(from).join(currentName) };
        if (d.auto && d.id.startsWith(oldPrefix)) renamed.id = "cc-" + currentName + "-" + d.id.slice(oldPrefix.length);
        return renamed;
      });
      // Renaming can leave two auto entries representing the same real
      // card+due-date under different ids (e.g. one just resurrected from
      // another device's stale copy). Collapse those immediately instead
      // of waiting for the next transaction change to trigger cleanup.
      return dedupeAutoDebtsByCardDue(renamedList);
    });
    setCardSettings((prev) => { const next = { ...prev }; delete next[from]; return next; });
  }
  function mergeStaleBankName(currentName, staleName) {
    const from = staleName.trim();
    if (!from || from === currentName) return;
    // Reassign the transactions so their delta counts toward the current
    // bank going forward (computeBankBalance recomputes this automatically),
    // and fold the stale name's manually-set anchor into the current one.
    setTransactions((prev) => prev.map((t) => (t.bank === from ? { ...t, bank: currentName } : t)));
    setBankBalances((prev) => {
      const next = { ...prev };
      const oldAnchor = next[from] || 0;
      delete next[from];
      next[currentName] = (next[currentName] || 0) + oldAnchor;
      return next;
    });
  }
  function saveForm() {
    if (!form.name.trim()) return;
    if (form.mode === "newCat") {
      const key = "cat_" + uid();
      setExpenseCategories((prev) => [...prev, { key, label: form.name.trim(), icon: form.icon, color: form.color, subcategories: [] }]);
      showToast("Saved successfully ✓");
    } else if (form.mode === "editCat") {
      setExpenseCategories((prev) => prev.map((c) => (c.key === form.catKey ? { ...c, label: form.name.trim(), icon: form.icon, color: form.color } : c)));
    } else if (form.mode === "newSub") {
      const key = "sub_" + uid();
      setExpenseCategories((prev) => prev.map((c) => (c.key === form.catKey ? { ...c, subcategories: [...(c.subcategories || []), { key, label: form.name.trim(), icon: form.icon, color: form.color }] } : c)));
      showToast("Saved successfully ✓");
    } else if (form.mode === "editSub") {
      setExpenseCategories((prev) => prev.map((c) => (c.key === form.catKey ? { ...c, subcategories: (c.subcategories || []).map((s) => (s.key === form.subKey ? { ...s, label: form.name.trim(), icon: form.icon, color: form.color } : s)) } : c)));
    } else if (form.mode === "newCard") {
      const nm = form.name.trim();
      if (!creditCards.some((c) => c.name === nm)) {
        setCreditCards((prev) => [...prev, { name: nm, icon: form.icon, color: form.color }]);
        setCardSettings((prev) => ({ ...prev, [nm]: { cutoffDay: form.cutoffDay, dueDay: form.dueDay } }));
        setDeletedCardNames((prev) => prev.filter((n) => n !== nm));
        showToast("Saved successfully ✓");
      }
    } else if (form.mode === "editCard") {
      const nm = form.name.trim();
      if (nm === form.oldName || !creditCards.some((c) => c.name === nm)) {
        setCreditCards((prev) => prev.map((c) => (c.name === form.oldName ? { name: nm, icon: form.icon, color: form.color } : c)));
        setCardSettings((prev) => {
          const next = { ...prev };
          if (nm !== form.oldName && next[form.oldName]) delete next[form.oldName];
          next[nm] = { cutoffDay: form.cutoffDay, dueDay: form.dueDay };
          return next;
        });
        setDeletedCardNames((prev) => prev.filter((n) => n !== nm));
        if (nm !== form.oldName) {
          // Renaming a card only changed the card list — every transaction
          // and debt that already referenced the old name by that literal
          // string needs updating too, or the Debts page would keep
          // showing the old name / lose track of its statement cycle.
          mergeStaleName(nm, form.oldName);
        }
        if (form.mergeFrom && form.mergeFrom.trim()) {
          // Explicit cleanup: fold records still stuck under a name that
          // was renamed before this cascade fix existed.
          mergeStaleName(nm, form.mergeFrom);
        }
      }
    } else if (form.mode === "newBank") {
      const nm = form.name.trim();
      if (!banks.some((b) => b.name === nm)) {
        setBanks((prev) => [...prev, { name: nm, icon: form.icon, color: form.color }]);
        setDeletedBankNames((prev) => prev.filter((n) => n !== nm));
        showToast("Saved successfully ✓");
      }
    } else if (form.mode === "editBank") {
      const nm = form.name.trim();
      if (nm === form.oldName || !banks.some((b) => b.name === nm)) {
        setBanks((prev) => prev.map((b) => (b.name === form.oldName ? { name: nm, icon: form.icon, color: form.color } : b)));
        setDeletedBankNames((prev) => prev.filter((n) => n !== nm));
        if (nm !== form.oldName) mergeStaleBankName(nm, form.oldName);
        if (form.mergeFrom && form.mergeFrom.trim()) mergeStaleBankName(nm, form.mergeFrom);
      }
    }
    setForm(null);
  }
  function deleteCategory(key) {
    if (expenseCategories.length <= 1) return;
    setExpenseCategories((prev) => prev.filter((c) => c.key !== key));
    setDeletedCategoryKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    showToast("Deleted successfully ✓");
  }
  function deleteSub(catKey, subKey) {
    setExpenseCategories((prev) => prev.map((c) => (c.key === catKey ? { ...c, subcategories: (c.subcategories || []).filter((s) => s.key !== subKey) } : c)));
    showToast("Deleted successfully ✓");
  }
  function deleteBank(name) {
    setBanks((prev) => prev.filter((b) => b.name !== name));
    setBankBalances((prev) => { const next = { ...prev }; delete next[name]; return next; });
    setDeletedBankNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
    showToast("Deleted successfully ✓");
  }
  function deleteCard(name) {
    if (creditCards.length <= 1) return;
    setCreditCards((prev) => prev.filter((c) => c.name !== name));
    setCardSettings((prev) => { const next = { ...prev }; delete next[name]; return next; });
    setDeletedCardNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
    showToast("Deleted successfully ✓");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 24, padding: 24, maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold text-lg">Settings</p>
          <button onClick={onClose} style={{ color: C.inkSoft }} className="p-1"><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: C.inkSoft }}>These categories and credit cards belong only to your account — other users aren't affected</p>

        <div className="flex rounded-full overflow-hidden p-1 mb-4 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => setSection("categories")} style={{ background: section === "categories" ? C.purple : "transparent", color: section === "categories" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full">Category</button>
          <button onClick={() => setSection("cards")} style={{ background: section === "cards" ? C.purple : "transparent", color: section === "cards" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full">Credit Card</button>
          <button onClick={() => setSection("banks")} style={{ background: section === "banks" ? C.purple : "transparent", color: section === "banks" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full">Bank</button>
        </div>

        {section === "categories" && (
          <div className="flex flex-col gap-2">
            {expenseCategories.map((cat) => {
              const Icon = resolveIcon(cat.icon);
              const expanded = expandedCat === cat.key;
              return (
                <div key={cat.key} style={{ background: C.bg }} className="rounded-2xl p-3">
                  <div className="flex items-center gap-2.5">
                    <div style={{ background: cat.color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Icon size={16} color="#fff" /></div>
                    <span className="text-sm font-bold flex-1">{cat.label}</span>
                    <button onClick={() => setExpandedCat(expanded ? null : cat.key)} style={{ color: C.inkSoft }} className="p-1">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                    <button onClick={() => openEditCategoryForm(cat)} style={{ color: C.purple }} className="p-1"><Pencil size={14} /></button>
                    <button onClick={() => deleteCategory(cat.key)} style={{ color: expenseCategories.length <= 1 ? C.graySoft : C.gray }} className="p-1" disabled={expenseCategories.length <= 1}><Trash2 size={14} /></button>
                  </div>
                  {expanded && (
                    <div className="mt-2.5 pl-11 flex flex-col gap-1.5">
                      {(cat.subcategories || []).length === 0 && <p className="text-[11px]" style={{ color: C.inkSoft }}>No subcategories yet</p>}
                      {(cat.subcategories || []).map((sub) => {
                        const SIcon = resolveIcon(sub.icon);
                        return (
                          <div key={sub.key} className="flex items-center gap-2 text-xs">
                            <div style={{ background: sub.color }} className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"><SIcon size={12} color="#fff" /></div>
                            <span className="flex-1 font-semibold">{sub.label}</span>
                            <button onClick={() => openEditSubForm(cat.key, sub)} style={{ color: C.purple }} className="p-0.5"><Pencil size={12} /></button>
                            <button onClick={() => deleteSub(cat.key, sub.key)} style={{ color: C.gray }} className="p-0.5"><Trash2 size={12} /></button>
                          </div>
                        );
                      })}
                      <button onClick={() => openNewSubForm(cat.key)} style={{ color: C.purple }} className="text-xs font-bold flex items-center gap-1 mt-1"><Plus size={12} />Add subcategory</button>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={openNewCategoryForm} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold"><Plus size={15} />Add category</button>
          </div>
        )}

        {section === "cards" && (
          <div className="flex flex-col gap-2">
            {orphanedCardNames.length > 0 && (
              <div style={{ background: C.yellowSoft }} className="rounded-2xl p-3 mb-1">
                <p className="text-xs font-bold mb-1" style={{ color: "#7A5B00" }}>Found a card name that doesn't match current cards</p>
                <p className="text-[11px] mb-2.5" style={{ color: "#7A5B00" }}>Possibly from renaming this card before, causing duplicates — you can merge it into the current one</p>
                {orphanedCardNames.map((o) => (
                  <div key={o.name} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <span className="text-xs font-bold flex-1 truncate">"{o.name}"{o.count > 0 ? ` (${o.count} items)` : ""}</span>
                    <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 11 }}>
                      {creditCards.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <button onClick={() => mergeStaleName(mergeTarget, o.name)} style={{ background: C.purple, color: "#fff" }} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap">Merge</button>
                  </div>
                ))}
              </div>
            )}
            {creditCards.map((cd) => {
              const CardIcon = resolveIcon(cd.icon);
              const cs = cardSettings[cd.name] || { cutoffDay: 25, dueDay: 5 };
              return (
                <div key={cd.name} style={{ background: C.bg }} className="flex items-center gap-2.5 rounded-2xl p-3">
                  <div style={{ background: cd.color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><CardIcon size={15} color="#fff" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{cd.name}</p>
                    <p className="text-[11px]" style={{ color: C.inkSoft }}>Cutoff day {cs.cutoffDay} · Due day {cs.dueDay}</p>
                  </div>
                  <button onClick={() => openEditCardForm(cd)} style={{ color: C.purple }} className="p-1"><Pencil size={14} /></button>
                  <button onClick={() => deleteCard(cd.name)} style={{ color: creditCards.length <= 1 ? C.graySoft : C.gray }} className="p-1" disabled={creditCards.length <= 1}><Trash2 size={14} /></button>
                </div>
              );
            })}
            <button onClick={openNewCardForm} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold"><Plus size={15} />Add credit card</button>
            <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>Pick an icon+color as a stand-in symbol (not the bank's real logo). Set each card's cutoff/due date when adding or editing it</p>
          </div>
        )}
        {section === "banks" && (
          <div className="flex flex-col gap-2">
            {orphanedBankNames.length > 0 && (
              <div style={{ background: C.yellowSoft }} className="rounded-2xl p-3 mb-1">
                <p className="text-xs font-bold mb-1" style={{ color: "#7A5B00" }}>Found a bank name that doesn't match current banks</p>
                <p className="text-[11px] mb-2.5" style={{ color: "#7A5B00" }}>Possibly from renaming this bank before — you can merge it into the current one</p>
                {orphanedBankNames.map((o) => (
                  <div key={o.name} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <span className="text-xs font-bold flex-1 truncate">"{o.name}"{o.count > 0 ? ` (${o.count} items)` : ""}</span>
                    <select value={bankMergeTarget} onChange={(e) => setBankMergeTarget(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 11 }}>
                      {banks.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                    <button onClick={() => mergeStaleBankName(bankMergeTarget, o.name)} style={{ background: C.purple, color: "#fff" }} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap">Merge</button>
                  </div>
                ))}
              </div>
            )}
            {banks.length === 0 && <EmptyNote text="No banks yet — add one to start tracking balances and selecting it for transfers" />}
            {banks.map((b) => {
              const BankIcon = resolveIcon(b.icon);
              const balance = computeBankBalance(transactions, bankBalances, b.name);
              return (
                <div key={b.name} style={{ background: C.bg }} className="flex items-center gap-2.5 rounded-2xl p-3">
                  <div style={{ background: b.color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><BankIcon size={15} color="#fff" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{b.name}</p>
                    <p className="text-[11px]" style={{ color: C.inkSoft }}>Balance {fmtTHB(balance)}</p>
                  </div>
                  <button onClick={() => openEditBankForm(b)} style={{ color: C.purple }} className="p-1"><Pencil size={14} /></button>
                  <button onClick={() => deleteBank(b.name)} style={{ color: C.gray }} className="p-1"><Trash2 size={14} /></button>
                </div>
              );
            })}
            <button onClick={openNewBankForm} style={{ background: C.purpleSoft, color: C.purple }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-bold"><Plus size={15} />Add bank</button>
            <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>Set the starting balance on the "Saving & Investing" page — new transfer items after this will add/subtract automatically. Old items from before the bank was added won't be counted retroactively</p>
          </div>
        )}
      </div>

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(38,38,56,0.55)", zIndex: 410, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setForm(null)}>
          <div style={{ background: C.card, borderRadius: 24, padding: 20, maxWidth: 340, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontFamily: "'Prompt', sans-serif" }} className="font-bold mb-3">{form.mode.startsWith("new") ? "Add item" : "Edit item"}</p>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" style={{ ...inputStyle, marginBottom: 14 }} autoFocus />
            <p className="text-xs font-bold mb-1.5" style={{ color: C.inkSoft }}>Icon</p>
            <div className="grid grid-cols-6 gap-2 mb-4 max-h-32 overflow-y-auto">
              {ICON_NAMES.map((name) => {
                const IconComp = ICON_LIBRARY[name];
                const active = form.icon === name;
                return (
                  <button key={name} onClick={() => setForm({ ...form, icon: name })} style={{ background: active ? form.color : C.graySoft }} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                    <IconComp size={15} color={active ? "#fff" : C.inkSoft} />
                  </button>
                );
              })}
            </div>
            <p className="text-xs font-bold mb-1.5" style={{ color: C.inkSoft }}>Color</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORY_COLOR_PALETTE.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} style={{ background: c, width: 26, height: 26, borderRadius: 26, border: form.color === c ? `3px solid ${C.ink}` : "3px solid transparent" }} />
              ))}
            </div>
            {(form.mode === "newCard" || form.mode === "editCard") && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-xs font-bold mb-1.5" style={{ color: C.inkSoft }}>Cutoff day</p>
                  <input type="number" min="1" max="31" value={form.cutoffDay} onChange={(e) => setForm({ ...form, cutoffDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} style={inputStyle} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1.5" style={{ color: C.inkSoft }}>Due date</p>
                  <input type="number" min="1" max="31" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} style={inputStyle} />
                </div>
              </div>
            )}
            {form.mode === "editCard" && (
              <details className="mb-5">
                <summary className="text-xs font-bold cursor-pointer" style={{ color: C.inkSoft }}>Advanced: merge old items stuck under another card name</summary>
                <p className="text-[11px] mt-1.5 mb-2" style={{ color: C.inkSoft }}>If you've renamed this card before and still see duplicates on the Debts page under the old name, type the old name here to merge them</p>
                <input value={form.mergeFrom} onChange={(e) => setForm({ ...form, mergeFrom: e.target.value })} placeholder="Old name to merge in" style={inputStyle} />
              </details>
            )}
            {form.mode === "editBank" && (
              <details className="mb-5">
                <summary className="text-xs font-bold cursor-pointer" style={{ color: C.inkSoft }}>Advanced: merge old items stuck under another bank name</summary>
                <p className="text-[11px] mt-1.5 mb-2" style={{ color: C.inkSoft }}>If you've renamed this bank before, type the old name here to merge balances/items together</p>
                <input value={form.mergeFrom} onChange={(e) => setForm({ ...form, mergeFrom: e.target.value })} placeholder="Old name to merge in" style={inputStyle} />
              </details>
            )}
            <div className="flex gap-2">
              <button onClick={() => setForm(null)} style={{ background: C.graySoft, color: C.inkSoft }} className="flex-1 py-2.5 rounded-full text-sm font-bold">Cancel</button>
              <button onClick={saveForm} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex-1 py-2.5 rounded-full text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
