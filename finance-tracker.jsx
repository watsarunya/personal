import { useState, useEffect, useRef, useMemo } from "react";
import {
  Utensils, Coffee, Car, Sparkles, Home, Cat, Dumbbell, MoreHorizontal,
  Plus, Trash2, Bell, AlertTriangle, Calendar, Wallet, PiggyBank,
  TrendingUp, TrendingDown, CreditCard, Banknote, ArrowLeftRight,
  CheckCircle2, ChevronLeft, ChevronRight, Flame, Star, Landmark,
  Lock, Award, ShieldCheck, Rocket, PartyPopper, ChevronRight as ChevronR,
  ClipboardList, Settings, RotateCcw, Percent, ChevronDown, ChevronUp, Info, X,
  Clock, Repeat, Tag, PieChart as PieChartIcon, Store, Bike, Package, Pencil
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

/* ---------------------------------------------------------------- */
/*  Design tokens — playful, colorful "quiz app" energy              */
/* ---------------------------------------------------------------- */
const C = {
  bg: "#F4F4FC",
  card: "#FFFFFF",
  ink: "#262638",
  inkSoft: "#8C8CA8",
  purple: "#7B7FE8",
  purpleDeep: "#5C60D6",
  purpleSoft: "#E9E9FB",
  yellow: "#FFC93C",
  yellowDeep: "#F5AF00",
  yellowSoft: "#FFF3D6",
  coral: "#FF7A59",
  coralSoft: "#FFE3DA",
  teal: "#2FC59B",
  tealSoft: "#DAF7EE",
  blue: "#4FB6E8",
  blueSoft: "#DEF2FC",
  pink: "#F76BAB",
  pinkSoft: "#FDE3EF",
  gray: "#B7BACB",
  graySoft: "#EDEDF4",
  brown: "#C97B3E",
  brownSoft: "#F6E4D2",
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&display=swap');
`;

const CAT_COLOR = {
  food: C.coral, drink: C.blue, car: C.purple, beauty: C.pink,
  home: C.yellowDeep, cat: "#9B7BF0", exercise: C.teal, others: C.gray,
  seven11: C.brown, grab: "#1DB954", lineman: "#5B6BC0", creditcard: "#6B4EA6",
  salary: C.teal, extra: C.blue, other_income: C.gray,
};
const CAT_SOFT = {
  food: C.coralSoft, drink: C.blueSoft, car: C.purpleSoft, beauty: C.pinkSoft,
  home: C.yellowSoft, cat: "#EEE6FF", exercise: C.tealSoft, others: C.graySoft,
  seven11: C.brownSoft, grab: "#DBF5E5", lineman: "#E5E7F7", creditcard: "#EAE3F5",
  salary: C.tealSoft, extra: C.blueSoft, other_income: C.graySoft,
};

const EXPENSE_CATEGORIES = [
  { key: "food", label: "อาหาร", icon: Utensils },
  { key: "drink", label: "เครื่องดื่ม", icon: Coffee },
  { key: "car", label: "รถยนต์", icon: Car },
  { key: "beauty", label: "ความงาม", icon: Sparkles },
  { key: "home", label: "บ้าน", icon: Home },
  { key: "cat", label: "แมว", icon: Cat },
  { key: "exercise", label: "ออกกำลังกาย", icon: Dumbbell },
  { key: "seven11", label: "7-Eleven", icon: Store },
  { key: "grab", label: "Grab", icon: Bike },
  { key: "lineman", label: "Lineman", icon: Package },
  { key: "creditcard", label: "Credit Card", icon: CreditCard },
  { key: "others", label: "อื่นๆ", icon: MoreHorizontal },
];
const INCOME_CATEGORIES = [
  { key: "salary", label: "เงินเดือน", icon: Landmark },
  { key: "extra", label: "รายได้เสริม", icon: TrendingUp },
  { key: "other_income", label: "อื่นๆ", icon: MoreHorizontal },
];
const CREDIT_CARDS = ["SCB", "JCB", "Shopee", "Krungsri", "Kbank", "Premier", "Prefered"];

const TAB_COLOR = {
  overview: C.purple, transactions: C.coral, savings: C.teal,
  debts: C.yellowDeep, budgets: C.blue, plan: C.pink, homeLoan: C.brown,
};

const INCOME_TYPE_PRESETS = ["เงินเดือนหลัก", "รายได้เสริม", "โบนัส", "ธุรกิจส่วนตัว", "อื่นๆ"];
const FIXCOST_TYPE_PRESETS = ["ค่าเช่า/ผ่อนบ้าน", "ค่าน้ำ-ไฟ-เน็ต", "ประกัน", "ผ่อนรถ", "สมาชิก/สับสคริปชัน", "ค่าเทอม", "อื่นๆ"];
const INVEST_CATEGORY_PRESETS = ["หุ้น", "กองทุนรวม", "ทองคำ", "คริปโทเคอร์เรนซี", "พันธบัตร/ตราสารหนี้", "ประกันสะสมทรัพย์", "อสังหาริมทรัพย์", "อื่นๆ"];
const INVEST_PALETTE = [C.purple, C.teal, C.blue, C.coral, C.pink, C.yellowDeep, "#9B7BF0", C.gray];

function investItemAmount(item, totalPool, ym, overrides) {
  if (ym && overrides?.[ym]?.[item.id] !== undefined) return overrides[ym][item.id];
  return item.mode === "percent" ? (Number(totalPool) || 0) * (Number(item.value) || 0) / 100 : (Number(item.value) || 0);
}
function investItemStatus(item) {
  if (item.executed) return { level: "done", text: "ลงทุนแล้ว" };
  const diff = daysUntil(item.date);
  const nowTime = new Date().toTimeString().slice(0, 5);
  if (diff < 0) return { level: "hot", text: `เลยกำหนด ${Math.abs(diff)} วัน` };
  if (diff === 0) return item.time && nowTime < item.time ? { level: "warn", text: `วันนี้ เวลา ${item.time}` } : { level: "hot", text: "ถึงเวลาแล้ว" };
  if (diff <= 2) return { level: "warn", text: `อีก ${diff} วัน` };
  return { level: "ok", text: `อีก ${diff} วัน` };
}

function pad2(n) { return String(n).padStart(2, "0"); }
function toLocalDateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseLocalDate(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function ymOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1); }
function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}
function addMonths(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return ymOf(d);
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
  return "฿" + v.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function todayStr() { return toLocalDateStr(new Date()); }
function thDate(d) {
  try { return parseLocalDate(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }); }
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

/* ---------------------------------------------------------------- */

export default function FinanceTracker() {
  const [tab, setTab] = useState("overview");
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
  const [cardSettings, setCardSettings] = useState(
    Object.fromEntries(CREDIT_CARDS.map((c) => [c, { cutoffDay: 25, dueDay: 5 }]))
  );
  const [investPlan, setInvestPlan] = useState({ totalPool: 0, items: [], overrides: {} });
  const [holdings, setHoldings] = useState([]);
  const [homeLoan, setHomeLoan] = useState({
    active: false, name: "", principal: 0, startMonth: ymOf(new Date()),
    payment: 0, dueDay: 5, rateChanges: [], paidMonths: {},
  });
  const [dismissedAlerts, setDismissedAlerts] = useState({});
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          setTransactions(data.transactions || []);
          setSavings(data.savings || []);
          setDebts(data.debts || []);
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
          if (data.investPlan) setInvestPlan((p) => ({ ...p, ...data.investPlan, overrides: data.investPlan.overrides || {} }));
          setHoldings(data.holdings || []);
          if (data.homeLoan) setHomeLoan((prev) => ({ ...prev, ...data.homeLoan }));
          if (data.dismissedAlerts) setDismissedAlerts(data.dismissedAlerts);
        }
      } catch (e) { /* fresh start */ }
      finally { loadedRef.current = true; setReady(true); }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({
          transactions, savings, debts, budgets,
          planIncomeItems, planFixCostItems, planOverrides, savingsPlan, cardSettings, investPlan, holdings, homeLoan, dismissedAlerts,
        }));
      } catch (e) { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [transactions, savings, debts, budgets, planIncomeItems, planFixCostItems, planOverrides, savingsPlan, cardSettings, investPlan, holdings, homeLoan, dismissedAlerts]);

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
      const itemName = homeLoan.name || "ผ่อนบ้าน";
      const item = {
        id: HOME_LOAN_FIXCOST_ID, name: itemName, type: "ค่าเช่า/ผ่อนบ้าน",
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

  // Sync credit-card spending into debt obligations automatically, grouped by
  // each card's own statement cycle (cutoff day) rather than calendar month.
  useEffect(() => {
    if (!loadedRef.current) return;
    setDebts((prev) => {
      const totals = {};
      transactions.forEach((t) => {
        if (t.type === "expense" && t.payment === "credit" && t.card) {
          const cutoffDay = cardSettings[t.card]?.cutoffDay ?? 25;
          const [y, m, day] = t.date.split("-").map(Number);
          const txnYm = `${y}-${pad2(m)}`;
          const statementYm = day <= cutoffDay ? txnYm : addMonths(txnYm, 1);
          const key = t.card + "|" + statementYm;
          totals[key] = (totals[key] || 0) + Number(t.amount);
        }
      });
      let changed = false;
      let next = [...prev];
      Object.entries(totals).forEach(([key, amt]) => {
        const [card, statementYm] = key.split("|");
        const id = "cc-" + card + "-" + statementYm;
        const dueYm = addMonths(statementYm, 1);
        const [dy, dm] = dueYm.split("-").map(Number);
        const dueDay = Math.min(cardSettings[card]?.dueDay ?? 5, 28);
        const dueDateStr = toLocalDateStr(new Date(dy, dm - 1, dueDay));
        const label = `บัตรเครดิต ${card} (รอบตัดยอด ${monthLabel(statementYm)})`;
        const idx = next.findIndex((d) => d.id === id);
        if (idx === -1) {
          next.push({ id, name: label, amount: amt, dueDate: dueDateStr, recurring: false, paid: false, auto: true, card });
          changed = true;
        } else if (!next[idx].paid && (next[idx].amount !== amt || next[idx].dueDate !== dueDateStr)) {
          next[idx] = { ...next[idx], amount: amt, dueDate: dueDateStr, name: label };
          changed = true;
        }
      });
      next = next.filter((d) => {
        if (!d.auto) return true;
        const statementYm = d.id.slice(("cc-" + d.card + "-").length);
        if (!(d.card + "|" + statementYm in totals) && !d.paid) { changed = true; return false; }
        return true;
      });
      return changed ? next : prev;
    });
  }, [transactions, cardSettings]);

  const streak = useMemo(() => computeStreak(transactions), [transactions]);
  const points = transactions.length * 5 + savings.length * 15 + debts.filter((d) => d.paid).length * 10;

  const monthKey = ymOf(new Date());
  const monthSpend = useMemo(() => {
    const m = {};
    transactions.forEach((t) => { if (t.type === "expense" && t.date.slice(0, 7) === monthKey) m[t.category] = (m[t.category] || 0) + Number(t.amount); });
    return m;
  }, [transactions, monthKey]);
  const totalBudget = Object.values(budgets).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalSpentBudgeted = Object.entries(budgets).reduce((a, [k]) => a + (monthSpend[k] || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpentBudgeted / totalBudget) * 100)) : null;

  const alerts = useMemo(() => {
    const list = [];
    Object.entries(budgets).forEach(([cat, limit]) => {
      if (!limit) return;
      const spent = monthSpend[cat] || 0;
      if (spent >= limit) {
        const meta = catMeta(EXPENSE_CATEGORIES, cat);
        list.push({ id: "b-" + cat, level: "hot", text: `ใช้จ่ายหมวด "${meta.label}" ครบตามงบที่ตั้งไว้แล้ว (${fmtTHB(spent)} / ${fmtTHB(limit)})` });
      } else if (spent >= limit * 0.8) {
        const meta = catMeta(EXPENSE_CATEGORIES, cat);
        list.push({ id: "b-" + cat, level: "warn", text: `หมวด "${meta.label}" ใกล้เต็มงบแล้ว (${fmtTHB(spent)} / ${fmtTHB(limit)})` });
      }
    });
    debts.forEach((d) => {
      if (d.paid) return;
      const diff = daysUntil(d.dueDate);
      if (diff < 0) list.push({ id: "d-" + d.id, level: "hot", text: `เลยกำหนดชำระ "${d.name}" มาแล้ว ${Math.abs(diff)} วัน (${fmtTHB(d.amount)})` });
      else if (diff <= 3) list.push({ id: "d-" + d.id, level: "warn", text: `ใกล้ถึงกำหนดชำระ "${d.name}" อีก ${diff} วัน (${fmtTHB(d.amount)})` });
    });
    const planIncomeThisMonth = itemsForMonth(planIncomeItems, monthKey).reduce((a, i) => a + effectiveAmount(i, monthKey, planOverrides), 0);
    const planFixCostThisMonth = itemsForMonth(planFixCostItems, monthKey).reduce((a, i) => a + effectiveAmount(i, monthKey, planOverrides), 0);
    if (planIncomeThisMonth > 0 && planFixCostThisMonth / planIncomeThisMonth > 0.5) {
      const pct = Math.round((planFixCostThisMonth / planIncomeThisMonth) * 100);
      list.push({ id: "fixcost-high", level: "hot", text: `Fix Cost เดือนนี้รวม ${fmtTHB(planFixCostThisMonth)} คิดเป็น ${pct}% ของรายรับ เกินครึ่งหนึ่งของรายได้แล้ว` });
    }
    investPlan.items.forEach((item) => {
      if (item.executed) return;
      const st = investItemStatus(item);
      const amt = investItemAmount(item, investPlan.totalPool);
      if (st.level === "hot") list.push({ id: "inv-" + item.id, level: "hot", text: `ถึงกำหนดลงทุน "${item.name}" แล้ว (${fmtTHB(amt)}) — ${st.text}` });
      else if (st.level === "warn") list.push({ id: "inv-" + item.id, level: "warn", text: `ใกล้ถึงกำหนดลงทุน "${item.name}" ${st.text} (${fmtTHB(amt)})` });
    });
    return list;
  }, [budgets, monthSpend, debts, planIncomeItems, planFixCostItems, planOverrides, monthKey, investPlan]);

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => !dismissedAlerts[a.id + "|" + a.text]),
    [alerts, dismissedAlerts]
  );
  function dismissAlert(a) {
    setDismissedAlerts((prev) => ({ ...prev, [a.id + "|" + a.text]: true }));
  }

  const badges = useMemo(() => {
    const totalSaving = savings.filter((s) => s.kind === "saving").reduce((a, s) => a + s.amount, 0);
    const totalInvest = savings.filter((s) => s.kind === "investment").reduce((a, s) => a + s.amount, 0);
    const anyOverBudget = Object.entries(budgets).some(([k, limit]) => limit && (monthSpend[k] || 0) >= limit);
    return [
      { key: "starter", label: "นักบันทึกมือใหม่", icon: Star, color: C.yellowDeep, unlocked: transactions.length >= 1 },
      { key: "streak7", label: "ขยัน 7 วันติด", icon: Flame, color: C.coral, unlocked: streak >= 7 },
      { key: "saver", label: "นักออมมือทอง", icon: PiggyBank, color: C.teal, unlocked: totalSaving >= 1000 },
      { key: "investor", label: "นักลงทุนตัวจริง", icon: Rocket, color: C.purple, unlocked: totalInvest >= 1000 },
      { key: "debtfree", label: "จัดการหนี้เก่ง", icon: ShieldCheck, color: C.blue, unlocked: debts.length > 0 && debts.some((d) => d.paid) },
      { key: "budgetpro", label: "งบประมาณมือโปร", icon: Award, color: C.pink, unlocked: Object.keys(budgets).length > 0 && !anyOverBudget },
    ];
  }, [transactions, savings, debts, budgets, monthSpend, streak]);

  if (!ready) {
    return (
      <div style={{ background: C.bg, minHeight: 480, fontFamily: "'Nunito', sans-serif" }} className="w-full flex items-center justify-center p-10">
        <style>{FONT_IMPORT}</style>
        <p style={{ color: C.inkSoft }}>กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, fontFamily: "'Nunito', sans-serif", color: C.ink }} className="w-full min-h-full pb-6">
      <style>{FONT_IMPORT}</style>
      <Header streak={streak} points={points} alertCount={visibleAlerts.length} budgetPct={budgetPct} />
      <TabPills tab={tab} setTab={setTab} alertCount={visibleAlerts.length} />
      <main className="px-4 md:px-6 max-w-2xl mx-auto flex flex-col gap-4 mt-4">
        {tab === "overview" && (
          <Overview transactions={transactions} alerts={visibleAlerts} onDismissAlert={dismissAlert} badges={badges} setTab={setTab} />
        )}
        {tab === "transactions" && (
          <TransactionsTab transactions={transactions} setTransactions={setTransactions} />
        )}
        {tab === "savings" && (
          <SavingsTab savings={savings} setSavings={setSavings} investPlan={investPlan} setInvestPlan={setInvestPlan} holdings={holdings} setHoldings={setHoldings} />
        )}
        {tab === "debts" && (
          <DebtsTab debts={debts} setDebts={setDebts} />
        )}
        {tab === "budgets" && (
          <BudgetsTab budgets={budgets} setBudgets={setBudgets} monthSpend={monthSpend} />
        )}
        {tab === "plan" && (
          <MonthlyPlanTab
            planIncomeItems={planIncomeItems} setPlanIncomeItems={setPlanIncomeItems}
            planFixCostItems={planFixCostItems} setPlanFixCostItems={setPlanFixCostItems}
            planOverrides={planOverrides} setPlanOverrides={setPlanOverrides}
            savingsPlan={savingsPlan} setSavingsPlan={setSavingsPlan}
            cardSettings={cardSettings} setCardSettings={setCardSettings}
            debts={debts} transactions={transactions} setSavings={setSavings}
          />
        )}
        {tab === "homeLoan" && (
          <HomePlanningTab homeLoan={homeLoan} setHomeLoan={setHomeLoan} planOverrides={planOverrides} setPlanOverrides={setPlanOverrides} />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Header({ streak, points, alertCount, budgetPct }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, borderRadius: "0 0 28px 28px" }} className="px-5 pt-6 pb-5 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ background: C.yellow }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Wallet size={20} color={C.purpleDeep} strokeWidth={2.3} />
          </div>
          <div>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-lg font-bold leading-tight">สวัสดี 👋</p>
            <p style={{ color: "#DCDCFB" }} className="text-xs leading-tight">มาบันทึกเงินกันวันนี้ไหม?</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div style={{ background: "rgba(255,255,255,0.18)" }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full">
              <Flame size={14} color={C.yellow} fill={C.yellow} />
              <span className="text-xs font-bold">{streak}</span>
            </div>
          )}
          <div style={{ background: "rgba(255,255,255,0.18)" }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full">
            <Star size={14} color={C.yellow} fill={C.yellow} />
            <span className="text-xs font-bold">{points}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.18)", position: "relative" }} className="p-1.5 rounded-full">
            <Bell size={16} />
            {alertCount > 0 && <span style={{ background: C.coral, width: 8, height: 8, top: 2, right: 2 }} className="absolute rounded-full" />}
          </div>
        </div>
      </div>
      {budgetPct !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1" style={{ color: "#DCDCFB" }}>
            <span>งบประมาณเดือนนี้</span><span className="font-bold">{budgetPct}%</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.25)", height: 8, borderRadius: 8 }}>
            <div style={{ width: `${budgetPct}%`, background: C.yellow, height: 8, borderRadius: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TabPills({ tab, setTab, alertCount }) {
  const items = [
    { key: "overview", label: "ภาพรวม", icon: Wallet },
    { key: "transactions", label: "รายรับ-จ่าย", icon: ArrowLeftRight },
    { key: "savings", label: "ออม & ลงทุน", icon: PiggyBank },
    { key: "debts", label: "หนี้สิน", icon: Bell, badge: alertCount },
    { key: "budgets", label: "งบประมาณ", icon: TrendingDown },
    { key: "plan", label: "แผนรายเดือน", icon: ClipboardList },
    { key: "homeLoan", label: "ผ่อนบ้าน", icon: Home },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 md:px-6 max-w-2xl mx-auto mt-4 pb-1" style={{ scrollbarWidth: "none" }}>
      {items.map((it) => {
        const active = tab === it.key;
        const Icon = it.icon;
        const color = TAB_COLOR[it.key];
        return (
          <button key={it.key} onClick={() => setTab(it.key)}
            style={{ background: active ? color : C.card, color: active ? "#fff" : C.inkSoft, border: active ? "none" : `1px solid ${C.graySoft}` }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap shrink-0 shadow-sm relative">
            <Icon size={14} />{it.label}
            {!!it.badge && (
              <span style={{ background: C.coral, color: "#fff" }} className="absolute -top-1.5 -right-1.5 text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Overview({ transactions, alerts, onDismissAlert, badges, setTab }) {
  const [period, setPeriod] = useState("month");
  const [ref, setRef] = useState(new Date());

  const hasToday = transactions.some((t) => t.date === todayStr());

  const range = useMemo(() => {
    const d = new Date(ref);
    if (period === "day") { const key = toLocalDateStr(d); return { match: (t) => t.date === key, label: thDate(key) }; }
    if (period === "year") { const y = d.getFullYear(); return { match: (t) => parseLocalDate(t.date).getFullYear() === y, label: `ปี ${y + 543}` }; }
    const y = d.getFullYear(), m = d.getMonth();
    return { match: (t) => { const dt = parseLocalDate(t.date); return dt.getFullYear() === y && dt.getMonth() === m; }, label: d.toLocaleDateString("th-TH", { month: "long", year: "numeric" }) };
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
    filtered.filter((t) => t.type === "expense" && t.payment !== "credit").forEach((t) => { m[t.category] = (m[t.category] || 0) + Number(t.amount); });
    return Object.entries(m).map(([k, v]) => ({ name: catMeta(EXPENSE_CATEGORIES, k).label, value: v, avgPerDay: v / daysInPeriod, color: CAT_COLOR[k] })).sort((a, b) => b.value - a.value);
  }, [filtered, daysInPeriod]);

  function shift(delta) {
    const d = new Date(ref);
    if (period === "day") d.setDate(d.getDate() + delta);
    if (period === "month") d.setMonth(d.getMonth() + delta);
    if (period === "year") d.setFullYear(d.getFullYear() + delta);
    setRef(d);
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setTab("transactions")} style={{ background: hasToday ? `linear-gradient(135deg, ${C.teal}, #22A184)` : `linear-gradient(135deg, ${C.yellow}, ${C.yellowDeep})` }} className="w-full text-left rounded-3xl p-5 flex items-center justify-between shadow-sm">
        <div>
          <p style={{ fontFamily: "'Baloo 2', sans-serif", color: hasToday ? "#fff" : C.purpleDeep }} className="text-lg font-bold mb-1">
            {hasToday ? "เยี่ยม! วันนี้บันทึกแล้ว 🎉" : "ยังไม่ได้บันทึกวันนี้เลยนะ"}
          </p>
          <p className="text-sm" style={{ color: hasToday ? "#E4FBF3" : "#7A5B00" }}>
            {hasToday ? "แตะเพื่อเพิ่มรายการอีก" : "แตะเพื่อบันทึกรายรับ-รายจ่ายวันนี้"}
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.35)" }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0">
          {hasToday ? <PartyPopper size={20} color="#fff" /> : <Plus size={20} color={C.purpleDeep} />}
        </div>
      </button>

      {alerts.length > 0 && <AlertBanner alerts={alerts} onDismiss={onDismissAlert} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-full overflow-hidden p-1" style={{ background: C.card, border: `1px solid ${C.graySoft}` }}>
          {[["day", "วัน"], ["month", "เดือน"], ["year", "ปี"]].map(([k, label]) => (
            <button key={k} onClick={() => setPeriod(k)} style={{ background: period === k ? C.purple : "transparent", color: period === k ? "#fff" : C.inkSoft }} className="px-3.5 py-1.5 text-sm font-bold rounded-full">{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
          <button onClick={() => shift(-1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-1.5 rounded-full"><ChevronLeft size={14} /></button>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", color: C.ink }} className="font-bold">{range.label}</span>
          <button onClick={() => shift(1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-1.5 rounded-full"><ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="รายรับ" value={income} icon={TrendingUp} color={C.teal} />
        <StatCard label="รายจ่าย" value={expense} icon={TrendingDown} color={C.coral} />
        <StatCard label="คงเหลือ" value={income - expense} icon={Wallet} color={C.purple} />
      </div>

      {creditExpense > 0 && (
        <div style={{ background: C.purpleSoft, color: C.purpleDeep }} className="rounded-2xl px-4 py-3 text-xs font-semibold flex items-start gap-2">
          <CreditCard size={14} className="shrink-0 mt-0.5" />
          <span>ใช้จ่ายผ่านบัตรเครดิตช่วงนี้ {fmtTHB(creditExpense)} — ไม่นับเป็นรายจ่ายเดือนนี้ แต่จะกลายเป็นหนี้ที่ต้องชำระในเดือนถัดไปแทน (ดูได้ที่แท็บ "หนี้สิน")</span>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">สัดส่วนรายจ่ายตามหมวดหมู่</p>
          {expense > 0 && <span className="text-xs font-bold" style={{ color: C.inkSoft }}>เฉลี่ยรวม {fmtTHB(expense / daysInPeriod)}/วัน</span>}
        </div>
        {byCat.length > 0 && <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>คำนวณจาก {daysInPeriod} วันในช่วงนี้</p>}
        {byCat.length === 0 ? <EmptyNote text="ยังไม่มีรายจ่ายในช่วงนี้" /> : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div style={{ width: "100%", maxWidth: 200, height: 190 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={44} outerRadius={78} paddingAngle={3} cornerRadius={6}>
                    {byCat.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtTHB(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 w-full flex flex-col gap-2.5">
              {byCat.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold"><span style={{ width: 10, height: 10, borderRadius: 10, background: e.color }} />{e.name}</span>
                  <div className="text-right">
                    <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold leading-tight">{fmtTHB(e.value)}</p>
                    <p className="text-[10px] leading-tight" style={{ color: C.inkSoft }}>เฉลี่ย {fmtTHB(e.avgPerDay)}/วัน</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">ป้ายรางวัลของฉัน</p>
          <span className="text-xs font-bold" style={{ color: C.inkSoft }}>{badges.filter((b) => b.unlocked).length}/{badges.length}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.key} className="flex flex-col items-center gap-1.5 text-center">
                <div style={{ background: b.unlocked ? b.color : C.graySoft }} className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm">
                  {b.unlocked ? <Icon size={20} color="#fff" /> : <Lock size={16} color={C.gray} />}
                </div>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: b.unlocked ? C.ink : C.gray }}>{b.label}</p>
              </div>
            );
          })}
        </div>
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
        <p style={{ fontFamily: "'Baloo 2', sans-serif", color }} className="text-sm font-bold truncate">{fmtTHB(value)}</p>
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

/* ---------------------------------------------------------------- */
function TransactionsTab({ transactions, setTransactions }) {
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].key);
  const [payment, setPayment] = useState("cash");
  const [card, setCard] = useState(CREDIT_CARDS[0]);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function switchType(t) { setType(t); setCategory(t === "expense" ? EXPENSE_CATEGORIES[0].key : INCOME_CATEGORIES[0].key); }
  function resetForm() {
    setEditingId(null); setType("expense"); setAmount(""); setCategory(EXPENSE_CATEGORIES[0].key);
    setPayment("cash"); setCard(CREDIT_CARDS[0]); setDate(todayStr()); setNote("");
  }
  function startEdit(t) {
    setEditingId(t.id); setType(t.type); setAmount(String(t.amount)); setCategory(t.category);
    setPayment(t.payment); setCard(t.card || CREDIT_CARDS[0]); setDate(t.date); setNote(t.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    if (editingId) {
      setTransactions((prev) => prev.map((t) => t.id === editingId
        ? { ...t, type, amount: amt, category, date, payment, card: payment === "credit" ? card : null, note: note.trim() }
        : t));
    } else {
      setTransactions((prev) => [{ id: uid(), type, amount: amt, category, date, payment, card: payment === "credit" ? card : null, note: note.trim() }, ...prev]);
    }
    resetForm();
  }
  function remove(id) { setTransactions((prev) => prev.filter((t) => t.id !== id)); if (editingId === id) resetForm(); }

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const visible = filter === "all" ? sorted : sorted.filter((t) => t.type === filter);

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: C.card, border: editingId ? `2px solid ${C.purple}` : "none" }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">{editingId ? "แก้ไขรายการ" : "บันทึกรายการใหม่"}</p>
          {editingId && <span style={{ background: C.purpleSoft, color: C.purpleDeep }} className="text-[11px] font-bold px-2.5 py-1 rounded-full">กำลังแก้ไข</span>}
        </div>

        <div className="flex rounded-full overflow-hidden p-1 mb-3.5 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => switchType("expense")} style={{ background: type === "expense" ? C.coral : "transparent", color: type === "expense" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><TrendingDown size={14} />รายจ่าย</button>
          <button onClick={() => switchType("income")} style={{ background: type === "income" ? C.teal : "transparent", color: type === "income" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><TrendingUp size={14} />รายรับ</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
          <Field label="จำนวนเงิน (บาท)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
        </div>

        <Field label="หมวดหมู่">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const Icon = c.icon; const active = category === c.key; const color = CAT_COLOR[c.key];
              return (
                <button key={c.key} onClick={() => setCategory(c.key)} style={{ background: active ? color : CAT_SOFT[c.key], color: active ? "#fff" : color }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold">
                  <Icon size={13} />{c.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="h-3" />
        <Field label="ช่องทางการชำระเงิน">
          <div className="flex flex-wrap gap-2 items-center">
            {[["cash", "เงินสด", Banknote, C.yellowDeep], ["transfer", "โอนเงิน", ArrowLeftRight, C.blue], ["credit", "บัตรเครดิต", CreditCard, C.purple]].map(([k, label, Icon, color]) => (
              <button key={k} onClick={() => setPayment(k)} style={{ background: payment === k ? color : C.graySoft, color: payment === k ? "#fff" : C.inkSoft }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"><Icon size={13} />{label}</button>
            ))}
            {payment === "credit" && (
              <select value={card} onChange={(e) => setCard(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                {CREDIT_CARDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </Field>

        <div className="h-3" />
        <Field label="โน้ต (ไม่บังคับ)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ข้าวเที่ยงกับเพื่อน" style={inputStyle} /></Field>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={save} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm">
            {editingId ? <><CheckCircle2 size={16} /> บันทึกการแก้ไข</> : <><Plus size={16} /> บันทึกรายการ</>}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ background: C.graySoft, color: C.inkSoft }} className="px-4 py-2.5 rounded-full text-sm font-bold">ยกเลิก</button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">รายการทั้งหมด</p>
          <div className="flex rounded-full overflow-hidden p-1" style={{ background: C.graySoft }}>
            {[["all", "ทั้งหมด"], ["income", "รายรับ"], ["expense", "รายจ่าย"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ background: filter === k ? C.card : "transparent" }} className="px-3 py-1 text-xs font-bold rounded-full">{l}</button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? <EmptyNote text="ยังไม่มีรายการ — เริ่มบันทึกรายการแรกของคุณด้านบน" /> : (
          <div className="flex flex-col gap-2">
            {visible.map((t) => {
              const meta = catMeta(t.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES, t.category);
              const Icon = meta.icon; const color = CAT_COLOR[t.category];
              return (
                <div key={t.id} style={{ background: C.card, border: editingId === t.id ? `2px solid ${C.purple}` : "none" }} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl shadow-sm">
                  <div style={{ background: color }} className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
                    <Icon size={16} color="#fff" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{meta.label}{t.note ? ` · ${t.note}` : ""}</p>
                    <p className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: C.inkSoft }}>
                      <span>{thDate(t.date)}</span><span>·</span>
                      <span>{t.payment === "cash" ? "เงินสด" : t.payment === "transfer" ? "โอนเงิน" : `บัตร (${t.card})`}</span>
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Baloo 2', sans-serif", color: t.type === "expense" ? C.coral : C.teal }} className="text-sm font-bold whitespace-nowrap">
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
  padding: "8px 12px", fontSize: 14, color: C.ink, width: "100%", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
};

/* ---------------------------------------------------------------- */
function SavingsTab({ savings, setSavings, investPlan, setInvestPlan, holdings, setHoldings }) {
  const [subTab, setSubTab] = useState("log");
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
  }
  function remove(id) { setSavings((prev) => prev.filter((s) => s.id !== id)); }

  const totalSaving = savings.filter((s) => s.kind === "saving").reduce((a, s) => a + s.amount, 0);
  const totalInvest = savings.filter((s) => s.kind === "investment").reduce((a, s) => a + s.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div style={{ background: `linear-gradient(135deg, ${C.teal}, #22A184)` }} className="rounded-2xl p-4 text-white shadow-sm">
          <PiggyBank size={20} className="mb-2" />
          <p className="text-xs font-semibold opacity-90">เงินออมสะสม</p>
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-lg font-bold">{fmtTHB(totalSaving)}</p>
        </div>
        <div style={{ background: `linear-gradient(135deg, ${C.blue}, #2E93C4)` }} className="rounded-2xl p-4 text-white shadow-sm">
          <TrendingUp size={20} className="mb-2" />
          <p className="text-xs font-semibold opacity-90">เงินลงทุนสะสม</p>
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-lg font-bold">{fmtTHB(totalInvest)}</p>
        </div>
      </div>

      <div className="flex rounded-full overflow-hidden p-1 w-fit" style={{ background: C.graySoft }}>
        <button onClick={() => setSubTab("log")} style={{ background: subTab === "log" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full shadow-sm">รายการออม-ลงทุน</button>
        <button onClick={() => setSubTab("plan")} style={{ background: subTab === "plan" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><PieChartIcon size={13} />แผนพอร์ตการลงทุน</button>
        <button onClick={() => setSubTab("holdings")} style={{ background: subTab === "holdings" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><Rocket size={13} />พอร์ตปัจจุบัน</button>
      </div>

      {subTab === "log" && (
      <>
      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">เพิ่มรายการออม / ลงทุน</p>
        <div className="flex rounded-full overflow-hidden p-1 mb-3.5 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => setKind("saving")} style={{ background: kind === "saving" ? C.teal : "transparent", color: kind === "saving" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><PiggyBank size={14} />เงินออม</button>
          <button onClick={() => setKind("investment")} style={{ background: kind === "investment" ? C.blue : "transparent", color: kind === "investment" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><TrendingUp size={14} />เงินลงทุน</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="ชื่อรายการ"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กองทุนสำรองเลี้ยงชีพ" style={inputStyle} /></Field>
          <Field label="จำนวนเงิน (บาท)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="เป้าหมาย (ไม่บังคับ)"><input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
        </div>
        <button onClick={add} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> เพิ่มรายการ</button>
      </div>

      <div>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-2.5">รายการทั้งหมด</p>
        {savings.length === 0 ? <EmptyNote text="ยังไม่มีรายการออมหรือลงทุน" /> : (
          <div className="flex flex-col gap-2">
            {savings.map((s) => {
              const pct = s.target ? Math.min(100, Math.round((s.amount / s.target) * 100)) : null;
              const color = s.kind === "saving" ? C.teal : C.blue;
              return (
                <div key={s.id} style={{ background: C.card }} className="px-3.5 py-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div style={{ background: color }} className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
                      {s.kind === "saving" ? <PiggyBank size={16} color="#fff" /> : <TrendingUp size={16} color="#fff" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{s.name}</p>
                      <p className="text-xs" style={{ color: C.inkSoft }}>{thDate(s.date)}</p>
                    </div>
                    <p style={{ fontFamily: "'Baloo 2', sans-serif", color }} className="text-sm font-bold">{fmtTHB(s.amount)}</p>
                    <button onClick={() => remove(s.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={14} /></button>
                  </div>
                  {pct !== null && (
                    <div className="mt-2 ml-[52px]">
                      <div style={{ background: C.graySoft, height: 7, borderRadius: 6 }}><div style={{ width: `${pct}%`, background: color, height: 7, borderRadius: 6 }} /></div>
                      <p className="text-[11px] mt-1 font-semibold" style={{ color: C.inkSoft }}>{pct}% ของเป้าหมาย {fmtTHB(s.target)}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {subTab === "plan" && (
        <InvestmentPlanPanel investPlan={investPlan} setInvestPlan={setInvestPlan} setSavings={setSavings} savings={savings} />
      )}

      {subTab === "holdings" && (
        <PortfolioHoldingsPanel holdings={holdings} setHoldings={setHoldings} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function DebtsTab({ debts, setDebts }) {
  const [debtType, setDebtType] = useState("other");
  const [selectedCard, setSelectedCard] = useState(CREDIT_CARDS[0]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayStr());
  const [recurring, setRecurring] = useState(false);

  function add() {
    const amt = parseFloat(amount);
    const finalName = debtType === "credit" ? `บัตรเครดิต ${selectedCard}` : name.trim();
    if (!amt || amt <= 0 || !finalName) return;
    const item = { id: uid(), name: finalName, amount: amt, dueDate, recurring, paid: false };
    if (debtType === "credit") item.card = selectedCard;
    setDebts((prev) => [item, ...prev]);
    setName(""); setAmount("");
  }
  function remove(id) { setDebts((prev) => prev.filter((d) => d.id !== id)); }
  function togglePaid(id) {
    setDebts((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const nowPaid = !d.paid;
      if (nowPaid && d.recurring) {
        const next = parseLocalDate(d.dueDate); next.setMonth(next.getMonth() + 1);
        return { ...d, paid: false, dueDate: toLocalDateStr(next) };
      }
      return { ...d, paid: nowPaid };
    }));
  }

  const sorted = [...debts].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">เพิ่มรายการหนี้สิน / กำหนดชำระ</p>
        <div className="flex rounded-full overflow-hidden p-1 mb-3.5 w-fit" style={{ background: C.graySoft }}>
          <button onClick={() => setDebtType("other")} style={{ background: debtType === "other" ? C.purple : "transparent", color: debtType === "other" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full">หนี้ทั่วไป</button>
          <button onClick={() => setDebtType("credit")} style={{ background: debtType === "credit" ? C.purple : "transparent", color: debtType === "credit" ? "#fff" : C.inkSoft }} className="px-4 py-1.5 text-sm font-bold rounded-full flex items-center gap-1.5"><CreditCard size={14} />บัตรเครดิต</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="ชื่อรายการ">
            {debtType === "credit" ? (
              <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} style={inputStyle}>
                {CREDIT_CARDS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ผ่อนมือถือ" style={inputStyle} />
            )}
          </Field>
          <Field label="จำนวนเงิน (บาท)"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="วันครบกำหนด"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} /></Field>
          <Field label="รูปแบบ">
            <button onClick={() => setRecurring((r) => !r)} style={{ background: recurring ? C.purple : C.graySoft, color: recurring ? "#fff" : C.inkSoft }} className="px-3.5 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 w-fit"><Calendar size={13} /> {recurring ? "ชำระทุกเดือน" : "ครั้งเดียว"}</button>
          </Field>
        </div>
        <button onClick={add} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> เพิ่มรายการ</button>
        {debtType === "credit" && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>วันตัดรอบ/ครบกำหนดอัตโนมัติของแต่ละบัตรตั้งได้ที่หน้า "แผนรายเดือน" — รายการนี้ไว้สำหรับกำหนดยอด/วันครบกำหนดแบบระบุเอง</p>}
      </div>

      <div>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-2.5">รายการหนี้สินทั้งหมด</p>
        {sorted.length === 0 ? <EmptyNote text="ยังไม่มีรายการหนี้สินหรือกำหนดชำระ" /> : (
          <div className="flex flex-col gap-2">
            {sorted.map((d) => {
              const diff = daysUntil(d.dueDate);
              let chipBg = C.graySoft, chipColor = C.inkSoft, statusText = `อีก ${diff} วัน`;
              if (d.paid) { chipBg = C.tealSoft; chipColor = C.teal; statusText = "ชำระแล้ว"; }
              else if (diff < 0) { chipBg = C.coralSoft; chipColor = C.coral; statusText = `เลย ${Math.abs(diff)} วัน`; }
              else if (diff <= 3) { chipBg = C.yellowSoft; chipColor = C.yellowDeep; statusText = diff === 0 ? "วันนี้" : `อีก ${diff} วัน`; }
              return (
                <div key={d.id} style={{ background: C.card }} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl shadow-sm">
                  <button onClick={() => togglePaid(d.id)} style={{ color: d.paid ? C.teal : C.graySoft }}><CheckCircle2 size={22} /></button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1.5" style={{ textDecoration: d.paid ? "line-through" : "none" }}>
                      {d.card && <CreditCard size={12} color={C.purple} className="shrink-0" />}
                      {d.name}{d.recurring ? " (รายเดือน)" : ""}{d.auto ? " · อัตโนมัติ" : ""}
                    </p>
                    <p className="text-xs" style={{ color: C.inkSoft }}>ครบกำหนด {thDate(d.dueDate)}</p>
                  </div>
                  <span style={{ background: chipBg, color: chipColor }} className="text-[11px] font-bold whitespace-nowrap px-2.5 py-1 rounded-full">{statusText}</span>
                  <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-sm font-bold whitespace-nowrap">{fmtTHB(d.amount)}</p>
                  <button onClick={() => remove(d.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function BudgetsTab({ budgets, setBudgets, monthSpend }) {
  function setLimit(cat, val) { setBudgets((prev) => ({ ...prev, [cat]: val === "" ? undefined : parseFloat(val) })); }

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: C.blueSoft, color: "#1E5A7C" }} className="rounded-2xl px-4 py-3 text-sm font-semibold">
        ตั้งวงเงินงบประมาณรายเดือนต่อหมวดหมู่ ระบบจะแจ้งเตือนเมื่อใช้จ่ายใกล้หรือครบตามวงเงินที่ตั้งไว้
      </div>
      <div className="flex flex-col gap-2">
        {EXPENSE_CATEGORIES.map((c) => {
          const Icon = c.icon;
          const limit = budgets[c.key];
          const spent = monthSpend[c.key] || 0;
          const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const color = CAT_COLOR[c.key];
          const barColor = pct >= 100 ? C.coral : pct >= 80 ? C.yellowDeep : color;
          return (
            <div key={c.key} style={{ background: C.card }} className="rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div style={{ background: color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Icon size={15} color="#fff" /></div>
                <p className="text-sm font-bold flex-1">{c.label}</p>
                <input type="number" min="0" placeholder="ไม่กำหนด" defaultValue={limit ?? ""} onBlur={(e) => setLimit(c.key, e.target.value)} style={{ ...inputStyle, width: 110 }} />
              </div>
              {limit ? (
                <div>
                  <div style={{ background: C.graySoft, height: 8, borderRadius: 6 }}><div style={{ width: `${pct}%`, background: barColor, height: 8, borderRadius: 6 }} /></div>
                  <p className="text-[11px] mt-1 font-semibold" style={{ color: C.inkSoft }}>{fmtTHB(spent)} จาก {fmtTHB(limit)} ({pct}%)</p>
                </div>
              ) : (
                <p className="text-[11px] font-semibold" style={{ color: C.inkSoft }}>ใช้จ่ายเดือนนี้ {fmtTHB(spent)} — ยังไม่ได้ตั้งวงเงิน</p>
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

  // auto-sync savings/invest targets into the Savings & Investment tab for this month
  useEffect(() => {
    setSavings((prev) => {
      let next = [...prev];
      let changed = false;
      [
        ["plan-saving-" + ym, "saving", savingAmt, `เงินออมตามแผน (${monthLabel(ym)})`],
        ["plan-invest-" + ym, "investment", investAmt, `เงินลงทุนตามแผน (${monthLabel(ym)})`],
      ].forEach(([id, kind, amt, name]) => {
        const idx = next.findIndex((s) => s.id === id);
        if (amt > 0) {
          if (idx === -1) { next.push({ id, kind, name, amount: amt, date: ym + "-01", target: null, auto: true }); changed = true; }
          else if (next[idx].amount !== amt) { next[idx] = { ...next[idx], amount: amt }; changed = true; }
        } else if (idx !== -1) { next.splice(idx, 1); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [savingAmt, investAmt, ym, setSavings]);

  function shiftMonth(delta) { setYm((prev) => addMonths(prev, delta)); }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-lg">{monthLabel(ym)}</p>
        <button onClick={() => shiftMonth(1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.pink}, #D6478E)` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">คงเหลือใช้ได้ตอนนี้ (หลังหักรายจ่ายที่บันทึกจริง)</p>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold mb-3">{fmtTHB(remainingNow)}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SummaryMini label="รายรับตามแผน" value={totalIncome} />
          <SummaryMini label="Fix cost" value={totalFixCost} sub={`${fixPct}% ของรายรับ`} />
          <SummaryMini label="หนี้ครบกำหนดเดือนนี้" value={totalDebt} />
          <SummaryMini label="ออม+ลงทุน" value={savingAmt + investAmt} />
        </div>
      </div>

      {totalCredit > 0 && (
        <div style={{ background: C.yellowSoft, color: "#7A5B00" }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>ใช้จ่ายผ่านบัตรเครดิตเดือนนี้รวม {fmtTHB(totalCredit)} — ระบบจะตั้งเป็นรายการหนี้ที่ต้องจ่ายในเดือนหน้าให้อัตโนมัติ ({Object.entries(actualCreditByCard).map(([c, v]) => `${c} ${fmtTHB(v)}`).join(", ")})</span>
        </div>
      )}

      {extraIncomeLogged > 0 && (
        <p className="text-xs px-1" style={{ color: C.inkSoft }}>* มีรายรับพิเศษที่บันทึกไว้ในหน้ารายรับ-รายจ่ายเดือนนี้อีก {fmtTHB(extraIncomeLogged)} (ไม่รวมในแผนนี้)</p>
      )}

      {totalIncome > 0 && fixPct > 50 && (
        <div style={{ background: C.coral, color: "#fff" }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2 shadow-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Fix Cost เดือนนี้รวม {fmtTHB(totalFixCost)} คิดเป็น {fixPct}% ของรายรับ — เกินครึ่งหนึ่งของรายได้แล้ว ลองพิจารณาลดรายจ่ายประจำหรือเพิ่มรายรับ</span>
        </div>
      )}

      <PlanSection
        title="รายรับที่วางแผน" color={C.teal} icon={TrendingUp}
        items={incomeItems} setItems={setPlanIncomeItems}
        overrides={planOverrides} setOverrides={setPlanOverrides} ym={ym}
        typePresets={INCOME_TYPE_PRESETS} total={totalIncome}
      />

      <PlanSection
        title="รายการ Fix Cost" color={C.coral} icon={ClipboardList}
        items={fixItems} setItems={setPlanFixCostItems}
        overrides={planOverrides} setOverrides={setPlanOverrides} ym={ym}
        typePresets={FIXCOST_TYPE_PRESETS} total={totalFixCost}
        extraNote={totalIncome > 0 ? `คิดเป็น ${fixPct}% ของรายรับเดือนนี้` : null}
      />

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold flex items-center gap-2"><Bell size={16} color={C.yellowDeep} />หนี้ที่ต้องชำระเดือนนี้</p>
          <span style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-sm font-bold">{fmtTHB(totalDebt)}</span>
        </div>
        {debtsThisMonth.length === 0 ? <EmptyNote text="ไม่มีรายการหนี้ครบกำหนดเดือนนี้" /> : (
          <div className="flex flex-col gap-2">
            {debtsThisMonth.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 text-sm">
                <span style={{ background: d.paid ? C.teal : C.coral }} className="w-2 h-2 rounded-full shrink-0" />
                <span className="flex-1 font-semibold truncate">{d.name}{d.auto ? " · อัตโนมัติจากบัตรเครดิต" : ""}</span>
                <span style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">{fmtTHB(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>ข้อมูลชุดเดียวกับหน้า "หนี้สิน" — จัดการเพิ่ม/แก้ไข/มาร์คจ่ายแล้วได้ที่แท็บหนี้สิน</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">เป้าหมายออม & ลงทุนต่อเดือน</p>
        <div className="flex flex-col gap-3">
          <AllocationRow label="เงินออม" color={C.teal} icon={PiggyBank} alloc={savingsPlan.saving}
            onChange={(alloc) => setSavingsPlan((p) => ({ ...p, saving: alloc }))} amount={savingAmt} />
          <AllocationRow label="เงินลงทุน" color={C.blue} icon={TrendingUp} alloc={savingsPlan.invest}
            onChange={(alloc) => setSavingsPlan((p) => ({ ...p, invest: alloc }))} amount={investAmt} />
        </div>
        <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: C.inkSoft }}>
          <CheckCircle2 size={13} color={C.teal} /> ระบบซิงก์ยอดนี้เข้าหน้า "ออม & ลงทุน" ให้อัตโนมัติทุกเดือน
        </p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <button onClick={() => setShowSettings((s) => !s)} className="w-full flex items-center justify-between">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold flex items-center gap-2"><Settings size={16} />ตั้งค่าวันตัดรอบ/ครบกำหนดบัตรเครดิต</p>
          {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSettings && (
          <div className="flex flex-col gap-2.5 mt-3">
            {CREDIT_CARDS.map((card) => {
              const cs = cardSettings[card] || { cutoffDay: 25, dueDay: 5 };
              return (
                <div key={card} style={{ background: C.bg }} className="rounded-2xl px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
                  <p className="text-sm font-bold w-20 shrink-0">{card}</p>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
                    วันตัดรอบ
                    <input type="number" min="1" max="31" value={cs.cutoffDay}
                      onChange={(e) => setCardSettings((p) => ({ ...p, [card]: { ...cs, cutoffDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) } }))}
                      style={{ ...inputStyle, width: 55 }} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}>
                    วันครบกำหนดชำระ
                    <input type="number" min="1" max="31" value={cs.dueDay}
                      onChange={(e) => setCardSettings((p) => ({ ...p, [card]: { ...cs, dueDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) } }))}
                      style={{ ...inputStyle, width: 55 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>แต่ละบัตรตัดรอบและครบกำหนดชำระคนละวันได้ ระบบจะรวมยอดตามรอบบิลจริงของบัตรนั้นๆ แล้วตั้งเป็นหนี้ที่ต้องจ่ายให้อัตโนมัติที่แท็บ "หนี้สิน"</p>
      </div>
    </div>
  );
}

function SummaryMini({ label, value, sub, isText }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
      <p className="opacity-90 font-semibold">{label}</p>
      <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-sm">{isText ? value : fmtTHB(value)}</p>
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
        <p style={{ fontFamily: "'Baloo 2', sans-serif", color }} className="text-sm font-bold">{fmtTHB(amount)}</p>
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
    if (!name.trim()) { setError("กรอกชื่อรายการก่อนนะครับ"); return; }
    if (!amt || amt <= 0) { setError("กรอกจำนวนเงินให้มากกว่า 0"); return; }
    const collision = items.find((i) => i.auto && i.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (collision) { setError(`มีรายการ "${collision.name}" ที่ซิงก์อัตโนมัติอยู่แล้ว ไม่ต้องเพิ่มซ้ำ — แก้ไขยอดของรายการเดิมได้เลย`); return; }
    setError("");
    const item = { id: uid(), name: name.trim(), type: type.trim() || "อื่นๆ", amount: amt, recurring };
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
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold flex items-center gap-2"><Icon size={16} color={color} />{title}</p>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", color }} className="text-sm font-bold">{fmtTHB(total)}</span>
      </div>
      {extraNote && <p className="text-xs font-semibold mb-3" style={{ color }}>{extraNote}</p>}

      {items.length === 0 ? <EmptyNote text="ยังไม่มีรายการ" /> : (
        <div className="flex flex-col gap-2 mb-3.5">
          {items.map((item) => {
            const eff = effectiveAmount(item, ym, overrides);
            const overridden = item.recurring && overrides?.[ym]?.[item.id] !== undefined;
            return (
              <div key={item.id} style={{ background: C.bg }} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate flex items-center gap-1.5">
                    {item.name}
                    {item.auto && <span style={{ background: C.brownSoft, color: C.brown }} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">ซิงก์จากผ่อนบ้าน</span>}
                  </p>
                  <p className="text-[11px] flex items-center gap-1 flex-wrap" style={{ color: C.inkSoft }}>
                    <span>{item.type}</span><span>·</span><span>{item.recurring ? "ทุกเดือน" : `เฉพาะ ${monthLabel(item.month)}`}</span>
                    {overridden && <span style={{ color }} className="font-bold">· แก้ไขเฉพาะเดือนนี้</span>}
                  </p>
                </div>
                <input type="number" min="0" defaultValue={eff} key={ym + item.id + eff}
                  onBlur={(e) => updateAmount(item, e.target.value)} style={{ ...inputStyle, width: 100 }} />
                {overridden && (
                  <button onClick={() => resetOverride(item)} title="รีเซ็ตเป็นค่าเริ่มต้น" style={{ color: C.inkSoft }} className="p-1"><RotateCcw size={13} /></button>
                )}
                {item.auto ? (
                  <span title="จัดการรายการนี้ได้ที่แท็บ 'ผ่อนบ้าน'" style={{ color: C.graySoft }} className="p-1"><Lock size={13} /></span>
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
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>ชื่อรายการ</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="ชื่อ" style={inputStyle} />
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[120px]">
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>ประเภท</label>
          <input value={type} onChange={(e) => setType(e.target.value)} placeholder="ประเภท" list={listId} style={inputStyle} />
          <datalist id={listId}>{typePresets.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div className="w-28">
          <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>จำนวนเงิน</label>
          <input type="number" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} placeholder="0.00" style={inputStyle} />
        </div>
        <button onClick={() => setRecurring((r) => !r)} style={{ background: recurring ? color : C.graySoft, color: recurring ? "#fff" : C.inkSoft }} className="px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap">
          {recurring ? "ทุกเดือน" : "เดือนนี้เดือนเดียว"}
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
function freqLabel(n) {
  return n === 1 ? "ทุกเดือน" : `ทุก ${n} เดือน`;
}

function InvestmentPlanPanel({ investPlan, setInvestPlan, setSavings, savings }) {
  const { totalPool, items } = investPlan;
  const [subView, setSubView] = useState("items");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("percent");
  const [value, setValue] = useState("");
  const [scheduleType, setScheduleType] = useState("monthly");
  const [date, setDate] = useState(todayStr());
  const [day, setDay] = useState(5);
  const [intervalMonths, setIntervalMonths] = useState(1);
  const [time, setTime] = useState("09:00");

  function setTotalPool(v) { setInvestPlan((p) => ({ ...p, totalPool: parseFloat(v) || 0 })); }

  function addItem() {
    const val = parseFloat(value);
    if (!val || val <= 0 || !name.trim()) return;
    const itemDate = scheduleType === "monthly" ? nextMonthlyDate(day) : date;
    const item = {
      id: uid(), name: name.trim(), category: category.trim() || "อื่นๆ",
      mode, value: val, date: itemDate, time, recurring: scheduleType === "monthly",
      intervalMonths: scheduleType === "monthly" ? Math.max(1, Math.min(12, parseInt(intervalMonths) || 1)) : 1,
      executed: false,
    };
    setInvestPlan((p) => ({ ...p, items: [...p.items, item] }));
    setName(""); setCategory(""); setValue("");
  }
  function removeItem(id) { setInvestPlan((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) })); }
  function updateItem(id, patch) {
    setInvestPlan((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }
  function markExecuted(item) {
    const ym = item.date.slice(0, 7);
    const amt = investItemAmount(item, totalPool, ym, investPlan.overrides);
    setSavings((prev) => [{ id: uid(), kind: "investment", name: item.name, amount: amt, date: item.date, target: null, note: item.category }, ...prev]);
    if (item.recurring) {
      updateItem(item.id, { date: addMonthsToDate(item.date, item.intervalMonths || 1), executed: false });
    } else {
      updateItem(item.id, { executed: true });
    }
  }

  const totalAllocated = items.reduce((a, i) => a + investItemAmount(i, totalPool), 0);
  const remaining = totalPool - totalAllocated;
  const pieData = items.filter((i) => investItemAmount(i, totalPool) > 0).map((i, idx) => ({ name: i.name, value: investItemAmount(i, totalPool), color: INVEST_PALETTE[idx % INVEST_PALETTE.length] }));

  return (
    <div className="flex flex-col gap-4">
      <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">ยอดเงินลงทุนทั้งหมด</p>
        <input type="number" min="0" value={totalPool || ""} onChange={(e) => setTotalPool(e.target.value)} placeholder="0.00"
          style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 12, padding: "8px 12px", color: "#fff", fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 22, width: "100%" }} />
        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <SummaryMini label="จัดสรรแล้ว" value={totalAllocated} />
          <SummaryMini label={remaining < 0 ? "เกินงบที่ตั้งไว้" : "ยังไม่ได้จัดสรร"} value={Math.abs(remaining)} />
        </div>
      </div>

      <div className="flex rounded-full overflow-hidden p-1 w-fit" style={{ background: C.graySoft }}>
        <button onClick={() => setSubView("items")} style={{ background: subView === "items" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full shadow-sm">รายการ</button>
        <button onClick={() => setSubView("monthly")} style={{ background: subView === "monthly" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-1"><Calendar size={12} />แผนรายเดือน</button>
        <button onClick={() => setSubView("summary")} style={{ background: subView === "summary" ? C.card : "transparent" }} className="px-3.5 py-1.5 text-xs font-bold rounded-full flex items-center gap-1"><PieChartIcon size={12} />สรุป</button>
      </div>

      {subView === "items" && (
      <>
      {pieData.length > 0 && (
        <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">สัดส่วนพอร์ตการลงทุน</p>
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
                  <span style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">{fmtTHB(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">รายการลงทุน</p>
        {items.length === 0 ? <EmptyNote text="ยังไม่มีรายการลงทุน — เพิ่มรายการแรกด้านล่าง" /> : (
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
                          <span className="flex items-center gap-1">
                            <Repeat size={10} />ทุก
                            <input type="number" min="1" max="12" defaultValue={item.intervalMonths || 1} key={item.id + "-freq"}
                              onBlur={(e) => updateItem(item.id, { intervalMonths: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })}
                              style={{ width: 32, border: `1px solid ${C.graySoft}`, borderRadius: 6, padding: "0 2px", textAlign: "center", fontSize: 11 }} />
                            เดือน วันที่ {parseLocalDate(item.date).getDate()}
                          </span>
                        ) : <span>{thDate(item.date)}</span>}
                        <span>·</span><span className="flex items-center gap-0.5"><Clock size={10} />{item.time}</span>
                      </p>
                    </div>
                    <span style={{ background: chipBg, color: chipColor }} className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">{st.text}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-11">
                    <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
                      <button onClick={() => updateItem(item.id, { mode: "percent" })} style={{ background: item.mode === "percent" ? C.purple : "transparent", color: item.mode === "percent" ? "#fff" : C.inkSoft }} className="px-2.5 py-1 rounded-full text-xs font-bold">%</button>
                      <button onClick={() => updateItem(item.id, { mode: "thb" })} style={{ background: item.mode === "thb" ? C.purple : "transparent", color: item.mode === "thb" ? "#fff" : C.inkSoft }} className="px-2.5 py-1 rounded-full text-xs font-bold">฿</button>
                    </div>
                    <input type="number" min="0" defaultValue={item.value} key={item.id + item.mode}
                      onBlur={(e) => updateItem(item.id, { value: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, width: 90 }} />
                    <span style={{ fontFamily: "'Baloo 2', sans-serif", color: C.purple }} className="text-sm font-bold flex-1 text-right">{fmtTHB(amt)}</span>
                    <button onClick={() => markExecuted(item)} title="ทำเครื่องหมายว่าลงทุนแล้ว" style={{ color: item.executed ? C.teal : C.graySoft }}><CheckCircle2 size={20} /></button>
                    <button onClick={() => removeItem(item.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: C.inkSoft }}><Info size={12} />กดติ๊กถูกเมื่อทำการลงทุนแล้ว ระบบจะบันทึกเข้าหน้ารายการออม-ลงทุนให้อัตโนมัติ ถ้าเป็นรายการรายเดือนจะเลื่อนกำหนดครั้งถัดไปให้เอง</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">เพิ่มรายการลงทุนใหม่</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="ชื่อรายการลงทุน"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กองทุน SET50" style={inputStyle} /></Field>
          <Field label="หมวดหมู่">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เลือกหรือพิมพ์เอง" list="invest-cat-presets" style={inputStyle} />
            <datalist id="invest-cat-presets">{INVEST_CATEGORY_PRESETS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="สัดส่วนเงินลงทุน">
          <div className="flex items-center gap-2">
            <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
              <button onClick={() => setMode("percent")} style={{ background: mode === "percent" ? C.purple : "transparent", color: mode === "percent" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"><Percent size={11} />เปอร์เซ็นต์</button>
              <button onClick={() => setMode("thb")} style={{ background: mode === "thb" ? C.purple : "transparent", color: mode === "thb" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">บาท (฿)</button>
            </div>
            <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "percent" ? "เช่น 20" : "เช่น 2000"} style={{ ...inputStyle, width: 120 }} />
          </div>
        </Field>
        <div className="h-3" />
        <Field label="กำหนดเวลาลงทุน">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full overflow-hidden p-0.5" style={{ background: C.graySoft }}>
              <button onClick={() => setScheduleType("monthly")} style={{ background: scheduleType === "monthly" ? C.purple : "transparent", color: scheduleType === "monthly" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"><Repeat size={11} />ตามรอบ</button>
              <button onClick={() => setScheduleType("once")} style={{ background: scheduleType === "once" ? C.purple : "transparent", color: scheduleType === "once" ? "#fff" : C.inkSoft }} className="px-3 py-1.5 rounded-full text-xs font-bold">ครั้งเดียว</button>
            </div>
            {scheduleType === "monthly" ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.inkSoft }}>
                วันที่ <input type="number" min="1" max="28" value={day} onChange={(e) => setDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 60 }} /> ของทุก
                <input type="number" min="1" max="12" value={intervalMonths} onChange={(e) => setIntervalMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 50 }} /> เดือน
              </div>
            ) : (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: 150 }} />
            )}
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, width: 110 }} />
          </div>
          {scheduleType === "monthly" && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[1, 2, 3, 6, 12].map((n) => (
                <button key={n} onClick={() => setIntervalMonths(n)} style={{ background: intervalMonths === n ? C.purpleSoft : C.graySoft, color: intervalMonths === n ? C.purpleDeep : C.inkSoft }} className="px-2.5 py-1 rounded-full text-[11px] font-bold">{freqLabel(n)}</button>
              ))}
            </div>
          )}
        </Field>
        <button onClick={addItem} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> เพิ่มรายการลงทุน</button>
      </div>
      </>
      )}

      {subView === "monthly" && (
        <InvestMonthlyPlanner investPlan={investPlan} setInvestPlan={setInvestPlan} />
      )}

      {subView === "summary" && (
        <InvestSummary savings={savings} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Investment monthly planner — pick which item invests how much,   */
/*  per specific month                                                */
/* ---------------------------------------------------------------- */
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

  const rows = items.map((item) => ({ item, amt: investItemAmount(item, totalPool, ym, overrides), overridden: overrides?.[ym]?.[item.id] !== undefined }));
  const monthTotal = rows.reduce((a, r) => a + r.amt, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setYm((p) => addMonths(p, -1))} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-lg">{monthLabel(ym)}</p>
        <button onClick={() => setYm((p) => addMonths(p, 1))} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">แผนลงทุนรวมเดือนนี้</p>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(monthTotal)}</p>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">กำหนดยอดแต่ละรายการสำหรับเดือนนี้</p>
        {rows.length === 0 ? <EmptyNote text="ยังไม่มีรายการลงทุน — ไปเพิ่มที่แท็บ 'รายการ' ก่อน" /> : (
          <div className="flex flex-col gap-2">
            {rows.map(({ item, amt, overridden }) => (
              <div key={item.id} style={{ background: C.bg }} className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl">
                <div style={{ background: C.purple }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={15} color="#fff" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-[11px] flex items-center gap-1" style={{ color: C.inkSoft }}>
                    <Tag size={10} />{item.category}{overridden && <span style={{ color: C.purple }} className="font-bold">· กำหนดเฉพาะเดือนนี้</span>}
                  </p>
                </div>
                <input type="number" min="0" defaultValue={amt} key={ym + item.id + amt}
                  onBlur={(e) => setOverride(item.id, e.target.value)} style={{ ...inputStyle, width: 100 }} />
                {overridden && (
                  <button onClick={() => resetOverride(item.id)} title="รีเซ็ตเป็นค่าเริ่มต้น" style={{ color: C.inkSoft }} className="p-1"><RotateCcw size={13} /></button>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: C.inkSoft }}>ปรับยอดของแต่ละรายการเฉพาะเดือนนี้ได้อิสระ (บางเดือนจะไม่ลงบางตัว ก็ใส่ 0 ได้) ยอดนี้จะถูกใช้ตอนกดติ๊กว่า "ลงทุนแล้ว" ที่แท็บ "รายการ" เมื่อถึงกำหนดของเดือนนี้</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Investment summary — actual invested amounts by month / by year  */
/* ---------------------------------------------------------------- */
function InvestSummary({ savings }) {
  const [mode, setMode] = useState("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const invested = useMemo(() => savings.filter((s) => s.kind === "investment"), [savings]);

  const monthlyData = useMemo(() => {
    const totals = Array(12).fill(0);
    invested.forEach((s) => {
      const [y, m] = s.date.split("-").map(Number);
      if (y === year) totals[m - 1] += Number(s.amount);
    });
    const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return totals.map((v, i) => ({ label: thMonths[i], value: v }));
  }, [invested, year]);
  const yearTotal = monthlyData.reduce((a, m) => a + m.value, 0);

  const yearlyData = useMemo(() => {
    const totals = {};
    invested.forEach((s) => { const y = s.date.slice(0, 4); totals[y] = (totals[y] || 0) + Number(s.amount); });
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).map(([y, v]) => ({ label: String(Number(y) + 543), value: v }));
  }, [invested]);
  const allTimeTotal = yearlyData.reduce((a, y) => a + y.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full overflow-hidden p-1 w-fit" style={{ background: C.graySoft }}>
        <button onClick={() => setMode("monthly")} style={{ background: mode === "monthly" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full shadow-sm">รายเดือน</button>
        <button onClick={() => setMode("yearly")} style={{ background: mode === "yearly" ? C.card : "transparent" }} className="px-4 py-1.5 text-sm font-bold rounded-full">รายปี</button>
      </div>

      {mode === "monthly" ? (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setYear((y) => y - 1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronLeft size={16} /></button>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-lg">ปี {year + 543}</p>
            <button onClick={() => setYear((y) => y + 1)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><ChevronRight size={16} /></button>
          </div>
          <div style={{ background: `linear-gradient(135deg, ${C.teal}, #22A184)` }} className="rounded-3xl p-5 text-white shadow-sm">
            <p className="text-xs font-semibold opacity-90 mb-1">รวมเงินลงทุนจริงปีนี้</p>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(yearTotal)}</p>
          </div>
          <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">ยอดลงทุนจริงแต่ละเดือน</p>
            {yearTotal === 0 ? <EmptyNote text="ยังไม่มีรายการลงทุนจริงในปีนี้" /> : (
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
            <p className="text-xs font-semibold opacity-90 mb-1">รวมเงินลงทุนจริงทั้งหมด</p>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold">{fmtTHB(allTimeTotal)}</p>
          </div>
          <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">ยอดลงทุนจริงแยกตามปี</p>
            {yearlyData.length === 0 ? <EmptyNote text="ยังไม่มีรายการลงทุนจริง" /> : (
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
      <p className="text-[11px] px-1" style={{ color: C.inkSoft }}>ยอดสรุปนี้คำนวณจากรายการที่กดติ๊ก "ลงทุนแล้ว" จริง (บันทึกอยู่ในหน้า "รายการออม-ลงทุน") ไม่ใช่ยอดที่วางแผนไว้เฉยๆ</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Current Portfolio Holdings — invested amount vs. current value   */
/* ---------------------------------------------------------------- */
function PortfolioHoldingsPanel({ holdings, setHoldings }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState(todayStr());

  function add() {
    const inv = parseFloat(invested);
    if (!inv || inv <= 0 || !name.trim()) return;
    const cur = current !== "" ? parseFloat(current) : inv;
    setHoldings((prev) => [{ id: uid(), name: name.trim(), category: category.trim() || "อื่นๆ", invested: inv, current: cur, date }, ...prev]);
    setName(""); setCategory(""); setInvested(""); setCurrent("");
  }
  function remove(id) { setHoldings((prev) => prev.filter((h) => h.id !== id)); }
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
        <p className="text-xs font-semibold opacity-90 mb-1">มูลค่าปัจจุบันของพอร์ต</p>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold mb-3">{fmtTHB(totalCurrent)}</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <SummaryMini label="เงินลงทุนทั้งหมด" value={totalInvested} />
          <SummaryMini label="กำไร/ขาดทุน" value={totalGain} />
          <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
            <p className="opacity-90 font-semibold">ผลตอบแทน</p>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-sm flex items-center gap-1">
              {totalGain >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {pieData.length > 0 && (
        <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">สัดส่วนมูลค่าปัจจุบันตามรายการ</p>
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
                  <span style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">{fmtTHB(e.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">รายการที่ลงทุนอยู่ตอนนี้</p>
        {holdings.length === 0 ? <EmptyNote text="ยังไม่มีรายการ — เพิ่มรายการลงทุนที่มีอยู่แล้วด้านล่าง" /> : (
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
                    <span style={{ background: color === C.teal ? C.tealSoft : color === C.coral ? C.coralSoft : C.graySoft, color }} className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                      {gain !== 0 && (gain > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-11 text-xs" style={{ color: C.inkSoft }}>
                    <span>ลงทุน: <b style={{ color: C.ink, fontFamily: "'Baloo 2', sans-serif" }}>{fmtTHB(h.invested)}</b></span>
                    <span className="flex items-center gap-1">มูลค่าปัจจุบัน:
                      <input type="number" min="0" defaultValue={h.current} key={h.id + h.current}
                        onBlur={(e) => updateCurrent(h.id, e.target.value)} style={{ ...inputStyle, width: 90, padding: "4px 8px" }} />
                    </span>
                    <span style={{ color }} className="font-bold ml-auto">{gain >= 0 ? "+" : ""}{fmtTHB(gain)}</span>
                    <button onClick={() => remove(h.id)} style={{ color: C.gray }} className="p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">เพิ่มรายการลงทุนที่มีอยู่แล้ว</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Field label="ชื่อรายการ"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น หุ้น PTT" style={inputStyle} /></Field>
          <Field label="หมวดหมู่">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="เลือกหรือพิมพ์เอง" list="holding-cat-presets" style={inputStyle} />
            <datalist id="holding-cat-presets">{INVEST_CATEGORY_PRESETS.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="เงินลงทุน (ต้นทุน)"><input type="number" min="0" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
          <Field label="มูลค่าปัจจุบัน (ไม่ระบุ = เท่าต้นทุน)"><input type="number" min="0" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
        </div>
        <button onClick={add} style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> เพิ่มรายการ</button>
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>ใช้สำหรับบันทึกรายการลงทุนที่มีอยู่แล้วก่อนเริ่มใช้แอป แล้วอัปเดต "มูลค่าปัจจุบัน" เป็นระยะเพื่อดูผลตอบแทน — แยกจากยอดในแท็บ "รายการออม-ลงทุน" และ "แผนพอร์ตการลงทุน"</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Home Loan Planning — amortization monitor & fix-cost sync        */
/* ---------------------------------------------------------------- */
function HomePlanningTab({ homeLoan, setHomeLoan, planOverrides, setPlanOverrides }) {
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

  const schedule = useMemo(() => buildAmortizationSchedule(homeLoan, planOverrides), [homeLoan, planOverrides]);
  const currentYm = ymOf(new Date());
  const currentRowIndex = schedule.findIndex((r) => r.ym >= currentYm);
  const paidOff = homeLoan.active && schedule.length > 0 && currentRowIndex === -1;
  const remainingInstallments = currentRowIndex === -1 ? 0 : schedule.length - currentRowIndex;
  const payoffYm = schedule.length ? schedule[schedule.length - 1].ym : null;
  const currentRemaining = paidOff ? 0 : currentRowIndex === -1 ? homeLoan.principal : currentRowIndex === 0 ? homeLoan.principal : schedule[currentRowIndex - 1].remaining;
  const interestPaidSoFar = schedule.filter((r) => r.ym < currentYm).reduce((a, r) => a + r.interest, 0);
  const interestRemaining = schedule.filter((r) => r.ym >= currentYm).reduce((a, r) => a + r.interest, 0);
  const currentRate = rateForMonth(homeLoan.rateChanges, currentYm);
  const hitCap = homeLoan.active && schedule.length >= 600;

  function save() {
    const p = parseFloat(principal), pay = parseFloat(payment), rate = parseFloat(initialRate);
    if (!p || p <= 0 || !pay || pay <= 0 || isNaN(rate)) return;
    setHomeLoan((prev) => ({
      active: true, name: name.trim() || "ผ่อนบ้าน", principal: p, startMonth, payment: pay,
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
  }
  function removeRateChange(idx) {
    setHomeLoan((p) => ({ ...p, rateChanges: p.rateChanges.filter((_, i) => i !== idx) }));
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
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3 flex items-center gap-2"><Home size={16} color={C.brown} />ตั้งค่าเงินกู้บ้าน</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="ชื่อรายการ"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สินเชื่อบ้าน ธ.กรุงศรี" style={inputStyle} /></Field>
            <Field label="เงินต้นเริ่มต้น (บาท)"><input type="number" min="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
            <Field label="เดือนที่เริ่มผ่อน"><input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} style={inputStyle} /></Field>
            <Field label="ยอดผ่อนต่อเดือน (บาท)"><input type="number" min="0" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" style={inputStyle} /></Field>
            <Field label="วันครบกำหนดชำระ"><input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} style={inputStyle} /></Field>
            <Field label="อัตราดอกเบี้ยเริ่มต้น (% ต่อปี)"><input type="number" min="0" step="0.01" value={initialRate} onChange={(e) => setInitialRate(e.target.value)} placeholder="เช่น 6.5" style={inputStyle} /></Field>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} style={{ background: `linear-gradient(135deg, ${C.brown}, #A85F2C)`, color: "#fff" }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm"><Plus size={16} /> บันทึกข้อมูลเงินกู้</button>
            {homeLoan.active && <button onClick={() => setEditing(false)} style={{ background: C.graySoft, color: C.inkSoft }} className="px-4 py-2.5 rounded-full text-sm font-bold">ยกเลิก</button>}
          </div>
          <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>ระบบจะคำนวณตารางผ่อนชำระ (ดอกเบี้ย/เงินต้น/เงินต้นคงเหลือ) และซิงก์ยอดผ่อนเข้ารายการ Fix Cost ในหน้า "แผนรายเดือน" ให้อัตโนมัติ</p>
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
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-lg flex items-center gap-2"><Home size={18} color={C.brown} />{homeLoan.name}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><Settings size={14} /></button>
          <button onClick={resetLoan} style={{ background: C.card, border: `1px solid ${C.graySoft}` }} className="p-2 rounded-full"><Trash2 size={14} color={C.coral} /></button>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${C.brown}, #A85F2C)` }} className="rounded-3xl p-5 text-white shadow-sm">
        <p className="text-xs font-semibold opacity-90 mb-1">{paidOff ? "ผ่อนหมดแล้ว 🎉" : "เงินต้นคงเหลือตอนนี้"}</p>
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-3xl font-extrabold mb-3">{fmtTHB(currentRemaining)}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SummaryMini label="งวดที่เหลือ" value={remainingInstallments} sub="งวด" isText />
          <div style={{ background: "rgba(255,255,255,0.18)" }} className="rounded-xl px-3 py-2">
            <p className="opacity-90 font-semibold">คาดว่าจะปิดยอด</p>
            <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold text-sm">{payoffYm ? monthLabel(payoffYm) : "-"}</p>
          </div>
          <SummaryMini label="ดอกเบี้ยจ่ายไปแล้ว (ประมาณ)" value={interestPaidSoFar} />
          <SummaryMini label="ดอกเบี้ยที่เหลือ (ประมาณ)" value={interestRemaining} />
        </div>
      </div>

      {hitCap && (
        <div style={{ background: C.coralSoft, color: C.coral }} className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>ยอดผ่อนต่อเดือนอาจไม่พอชำระดอกเบี้ยทั้งหมด ระบบคำนวณไม่พบวันปิดยอดภายใน 50 ปี ลองเพิ่มยอดผ่อนต่อเดือนดู</span>
        </div>
      )}

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold mb-3">อัตราดอกเบี้ย</p>
        <div className="flex items-center gap-2 mb-3">
          <div style={{ background: C.brownSoft }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"><Percent size={15} color={C.brown} /></div>
          <p className="text-sm font-bold">ปัจจุบัน {currentRate}% ต่อปี</p>
        </div>
        {homeLoan.rateChanges?.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {[...homeLoan.rateChanges].sort((a, b) => a.ym.localeCompare(b.ym)).map((rc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: C.inkSoft }}>
                <span className="flex-1">ตั้งแต่ {monthLabel(rc.ym)}</span>
                <span style={{ fontFamily: "'Baloo 2', sans-serif", color: C.ink }} className="font-bold">{rc.rate}%</span>
                <button onClick={() => removeRateChange(homeLoan.rateChanges.indexOf(rc))} style={{ color: C.gray }} className="p-1"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>อัตราดอกเบี้ยใหม่ (%)</label>
            <input type="number" min="0" step="0.01" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="เช่น 7.2" style={{ ...inputStyle, width: 110 }} />
          </div>
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: C.inkSoft }}>มีผลตั้งแต่เดือน</label>
            <input type="month" value={newRateMonth} onChange={(e) => setNewRateMonth(e.target.value)} style={{ ...inputStyle, width: 150 }} />
          </div>
          <button onClick={addRateChange} style={{ background: C.brown, color: "#fff" }} className="p-2.5 rounded-full"><Plus size={16} /></button>
        </div>
      </div>

      <div style={{ background: C.card }} className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontFamily: "'Baloo 2', sans-serif" }} className="font-bold">ตารางผ่อนชำระ</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewYear((y) => y - 1)} style={{ background: C.graySoft, color: C.inkSoft }} className="p-1.5 rounded-full"><ChevronLeft size={14} /></button>
            <span style={{ fontFamily: "'Baloo 2', sans-serif" }} className="text-sm font-bold whitespace-nowrap">ปี {viewYear + 543}</span>
            <button onClick={() => setViewYear((y) => y + 1)} style={{ background: C.graySoft, color: C.inkSoft }} className="p-1.5 rounded-full"><ChevronRight size={14} /></button>
            <button onClick={() => setViewYear(new Date().getFullYear())} style={{ background: C.brownSoft, color: C.brown }} className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap">ปีนี้</button>
          </div>
        </div>
        {yearRows.length === 0 ? (
          <EmptyNote text={viewYear < minYear ? "ยังไม่เริ่มผ่อนในปีนี้" : viewYear > maxYear ? "ผ่อนหมดก่อนถึงปีนี้แล้ว" : "ไม่มีรายการในปีนี้"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.inkSoft }}>
                  <th className="text-center font-bold pb-2 pr-1">จ่ายแล้ว</th>
                  <th className="text-left font-bold pb-2 pr-2">เดือน</th>
                  <th className="text-right font-bold pb-2 px-2">ยอดผ่อนจริง</th>
                  <th className="text-right font-bold pb-2 px-2">ดอกเบี้ย</th>
                  <th className="text-right font-bold pb-2 px-2">ดอกเบี้ยที่จ่าย</th>
                  <th className="text-right font-bold pb-2 px-2">เงินต้นที่ลด</th>
                  <th className="text-right font-bold pb-2 pl-2">เงินต้นเหลือ</th>
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
                          style={{ ...inputStyle, width: 90, padding: "4px 8px", fontFamily: "'Baloo 2', sans-serif", textAlign: "right" }} />
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
        <p className="text-[11px] mt-3" style={{ color: C.inkSoft }}>ติ๊กถูก "จ่ายแล้ว" เพื่อเช็คลิสต์เดือนที่ชำระ และแก้ "ยอดผ่อนจริง" ได้ตรงๆ ในตาราง (เช่นเดือนไหนโปะเพิ่ม) ตารางทั้งหมดจะคำนวณเงินต้น/ดอกเบี้ยใหม่ให้ทันที ค่านี้ผูกกับรายการ Fix Cost ในหน้า "แผนรายเดือน" ด้วย</p>
      </div>
    </div>
  );
}
