import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generatePlan, FormInputs, PlanData, ShoppingListItem, categorizeItem, MealType, PlanDebugInfo } from "@/data/mockData";
import { getShowDebugTools } from "@/hooks/use-dev-settings";

const PlanDebugPanel = import.meta.env.DEV
  ? lazy(() => import("@/components/PlanDebugPanel"))
  : null;

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChefHat, DollarSign, ShoppingCart, Clock, ChevronRight, Package, ArrowRight, ArrowLeft, PiggyBank, Check, Sun, Coffee, UtensilsCrossed, Cookie, Wallet, RefreshCw, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const HAVE_STORAGE_KEY = "savr-have-items";
const WEEKLY_PLAN_KEY = "weeklyPlan";
const COOKED_MEALS_KEY = "savr-cooked-meals";

// Countable produce that's awkward when measured in cups. If a recipe says
// "1.8 cup cucumber", users would rather see "2 cucumbers" on a shopping list.
const COUNTABLE_PRODUCE = new Set([
  "cucumber", "cucumbers",
  "bell pepper", "bell peppers", "pepper", "peppers",
  "onion", "onions", "shallot", "shallots",
  "tomato", "tomatoes",
  "avocado", "avocados",
  "lemon", "lemons", "lime", "limes", "orange", "oranges",
  "apple", "apples", "pear", "pears", "banana", "bananas",
  "carrot", "carrots", "potato", "potatoes", "sweet potato", "sweet potatoes",
  "zucchini", "zucchinis", "eggplant", "eggplants",
  "jalapeno", "jalapenos", "jalapeño", "jalapeños",
  "corn", "ear of corn", "ears of corn",
]);
const CUP_UNITS = new Set(["cup", "cups"]);

// Vulgar-fraction renderer. Snaps to common cookbook fractions (1/8 grid)
// and falls back to one-decimal if a quantity doesn't fit cleanly.
const FRACTION_GLYPHS: Record<string, string> = {
  "1/8": "⅛", "1/4": "¼", "1/3": "⅓", "3/8": "⅜",
  "1/2": "½", "5/8": "⅝", "2/3": "⅔", "3/4": "¾", "7/8": "⅞",
};
const SNAP_FRACTIONS: { value: number; label: string }[] = [
  { value: 0,     label: "" },
  { value: 1/8,   label: "1/8" },
  { value: 1/4,   label: "1/4" },
  { value: 1/3,   label: "1/3" },
  { value: 3/8,   label: "3/8" },
  { value: 1/2,   label: "1/2" },
  { value: 5/8,   label: "5/8" },
  { value: 2/3,   label: "2/3" },
  { value: 3/4,   label: "3/4" },
  { value: 7/8,   label: "7/8" },
  { value: 1,     label: "" }, // rolls into the whole part
];
function formatQty(qty: number): string {
  if (!isFinite(qty) || qty <= 0) return "0";
  const whole = Math.floor(qty);
  const frac = qty - whole;
  // Snap to nearest common fraction
  let best = SNAP_FRACTIONS[0];
  let bestDist = Infinity;
  for (const f of SNAP_FRACTIONS) {
    const d = Math.abs(f.value - frac);
    if (d < bestDist) { bestDist = d; best = f; }
  }
  // If snapping is far off (>0.06 ≈ ~1/16), fall back to one decimal place
  if (bestDist > 0.06) {
    return qty % 1 === 0 ? `${qty}` : qty.toFixed(1);
  }
  // Snapped to 1 → roll into whole
  if (best.value === 1) {
    return `${whole + 1}`;
  }
  // Snapped to 0
  if (best.value === 0) {
    return whole > 0 ? `${whole}` : "0";
  }
  const glyph = FRACTION_GLYPHS[best.label] || best.label;
  return whole > 0 ? `${whole}${glyph}` : glyph;
}

function parseShoppingItem(item: ShoppingListItem) {
  // Some upstream paths (notably the LLM) occasionally return a `unit` that is
  // actually the ingredient noun itself, e.g. { qty: 6, unit: "eggs",
  // normalizedName: "eggs" } or { qty: 2, unit: "bananas", normalizedName:
  // "banana" }. Rendering that naively produces "6 eggs eggs". Treat any unit
  // that matches (or is a simple plural of) the base name as "no unit".
  const rawUnit = (item.unit || "").toLowerCase().trim();
  // Defensive: some upstream parses leave a leading filler ("of milk",
  // "a tomato") on normalizedName. Strip it here so display never produces
  // strings like "2 gallons of of milk".
  const base = (item.normalizedName || "")
    .toLowerCase()
    .trim()
    .replace(/^(?:of|a|an|the)\s+/i, "")
    .trim();
  const baseSingular = base.endsWith("s") ? base.slice(0, -1) : base;
  const unitSingular = rawUnit.endsWith("s") ? rawUnit.slice(0, -1) : rawUnit;
  const unitIsBaseNoun =
    rawUnit !== "" && (rawUnit === base || unitSingular === baseSingular);
  // Generic placeholder units that aren't meaningful to users (e.g. "1 unit
  // garlic", "2 units onion"). Treat them the same as "each" — drop the word.
  // Size descriptors like "large", "medium", "small" are not real units either
  // (e.g. "3 large eggs" should not become "3 larges of eggs").
  const GENERIC_UNITS = new Set([
    "each", "unit", "units", "piece", "pieces", "item", "items", "whole", "count",
    "large", "medium", "small", "extra large", "xl", "jumbo",
  ]);
  const normalizedUnit =
    GENERIC_UNITS.has(rawUnit) || unitIsBaseNoun ? "" : item.unit;

  // Awkward "1.8 cup cucumber" → "2 cucumbers". For known countable produce
  // sold as whole pieces, round up and drop the cup unit so the shopping list
  // is intuitive.
  let qty = item.qty;
  let unit = normalizedUnit;
  const baseLower = base;
  if (
    CUP_UNITS.has(rawUnit) &&
    (COUNTABLE_PRODUCE.has(baseLower) || COUNTABLE_PRODUCE.has(baseSingular))
  ) {
    qty = Math.max(1, Math.ceil(item.qty));
    unit = "";
  }

  return {
    qty,
    unit,
    base,
    originalName: item.name,
    cost: item.cost,
  };
}

// Pluralize ingredient nouns when shown after a measurement unit (cup, oz, tbsp).
// "berry" → "berries", "tomato" → "tomatoes", "leaf" → "leaves". Skips true mass
// nouns (rice, flour, milk, etc.) and words that already look plural.
const MASS_NOUNS = new Set([
  "rice", "flour", "sugar", "salt", "pepper", "oil", "butter", "milk", "yogurt",
  "cheese", "honey", "syrup", "sauce", "broth", "stock", "water", "vinegar",
  "quinoa", "couscous", "oatmeal", "granola", "cereal", "pasta",
  "spinach", "kale", "lettuce", "arugula", "cabbage", "cilantro", "parsley",
  "basil", "mint", "dill", "thyme", "rosemary", "garlic", "ginger", "tahini",
  "hummus", "tofu", "tempeh", "salmon", "tuna", "chicken", "beef", "pork",
  "bread", "cinnamon", "paprika", "cumin", "turmeric",
]);
function pluralizeIngredient(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  const lastLower = last.toLowerCase();
  // Only treat as mass noun when the FULL phrase is a mass noun. A bare head
  // like "pepper" is mass, but "bell pepper" is countable and should pluralize.
  if (MASS_NOUNS.has(lower)) return trimmed;
  if (parts.length === 1 && MASS_NOUNS.has(lastLower)) return trimmed;
  if (lastLower.endsWith("s")) return trimmed;
  let plural: string;
  if (/[^aeiou]y$/i.test(last)) {
    plural = last.slice(0, -1) + "ies";
  } else if (/(x|z|ch|sh)$/i.test(last)) {
    plural = last + "es";
  } else if (/[^aeiou]o$/i.test(last)) {
    plural = last + "es";
  } else if (/fe?$/i.test(last)) {
    plural = last.replace(/fe?$/i, "ves");
  } else {
    plural = last + "s";
  }
  parts[parts.length - 1] = plural;
  return parts.join(" ");
}

// Inverse of pluralizeIngredient — singularize the head noun for qty <= 1
// displays so we get "1 ice cube" instead of "1 ice cubes". Mass nouns and
// invariant plurals are left alone.
const SINGULAR_OVERRIDES: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  mangoes: "mango",
  avocadoes: "avocado",
  avocados: "avocado",
  leaves: "leaf",
  loaves: "loaf",
  knives: "knife",
  feet: "foot",
  teeth: "tooth",
  geese: "goose",
  mice: "mouse",
  people: "person",
  children: "child",
};
function singularizeIngredient(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const last = parts[parts.length - 1];
  const lastLower = last.toLowerCase();
  if (MASS_NOUNS.has(lower)) return trimmed;
  if (parts.length === 1 && MASS_NOUNS.has(lastLower)) return trimmed;
  let singular = last;
  if (SINGULAR_OVERRIDES[lastLower]) {
    singular = SINGULAR_OVERRIDES[lastLower];
  } else if (lastLower.endsWith("ies") && lastLower.length > 3) {
    singular = last.slice(0, -3) + "y";
  } else if (
    lastLower.endsWith("ses") ||
    lastLower.endsWith("xes") ||
    lastLower.endsWith("zes") ||
    lastLower.endsWith("ches") ||
    lastLower.endsWith("shes")
  ) {
    singular = last.slice(0, -2);
  } else if (
    lastLower.endsWith("s") &&
    !lastLower.endsWith("ss") &&
    !lastLower.endsWith("us") &&
    lastLower.length > 3
  ) {
    singular = last.slice(0, -1);
  }
  parts[parts.length - 1] = singular;
  return parts.join(" ");
}

// Pluralize measurement units. Handles common English rules:
// pinch → pinches, dash → dashes, cup → cups, tbsp/tsp stay (abbrev), oz stays.
const INVARIANT_UNITS = new Set(["tsp", "tbsp", "oz", "lb", "ml", "g", "kg", "l"]);
function pluralizeUnit(unit: string): string {
  const u = unit.trim();
  const lower = u.toLowerCase();
  if (!u || INVARIANT_UNITS.has(lower)) return u;
  if (lower.endsWith("s") || lower.endsWith("es")) return u;
  if (/(ch|sh|s|x|z)$/.test(lower)) return u + "es";
  return u + "s";
}

// Mass nouns for proteins that are vague on their own ("1 salmon" is unclear —
// is it a whole fish, a fillet, a portion?). When the shopping list ends up
// with one of these without a real measurement unit, default to a sensible
// portion descriptor so the list is actionable.
const PORTION_UNIT_DEFAULTS: Record<string, string> = {
  salmon: "fillet",
  tuna: "fillet",
  cod: "fillet",
  tilapia: "fillet",
  halibut: "fillet",
  trout: "fillet",
  chicken: "breast",
  "chicken breast": "breast",
  beef: "lb",
  pork: "lb",
};

interface ConsolidatedItem {
  displayName: string;
  cost: number;
  originalNames: string[]; // all original item names in this group
}

function consolidateItems(items: ShoppingListItem[]): ConsolidatedItem[] {
  // Inline helper kept here since it's only used in display.
  const groups = new Map<string, { qty: number; unit: string; base: string; cost: number; originalNames: string[] }>();

  for (const item of items) {
    const parsed = parseShoppingItem(item);
    const key = `${parsed.base}||${parsed.unit}`;
    const existing = groups.get(key);
    if (existing && parsed.unit !== "") {
      existing.qty += parsed.qty;
      existing.cost += item.cost;
      if (!existing.originalNames.includes(item.name)) {
        existing.originalNames.push(item.name);
      }
    } else if (!existing) {
      groups.set(key, { qty: parsed.qty, unit: parsed.unit, base: parsed.base, cost: item.cost, originalNames: [item.name] });
    } else {
      const altKey = `${parsed.base}||${parsed.unit}||${item.name}`;
      groups.set(altKey, { qty: parsed.qty, unit: parsed.unit, base: parsed.base, cost: item.cost, originalNames: [item.name] });
    }
  }

  return [...groups.values()].map((g) => {
    const qtyStr = formatQty(g.qty);
    let displayName: string;
    const baseLower = (g.base || "").toLowerCase();
    const portionDefault = !g.unit ? PORTION_UNIT_DEFAULTS[baseLower] : undefined;
    if (g.unit) {
      // Real unit (cups, oz, tbsp, sticks, etc.) — pluralize sticks for >1
      let unit = g.unit;
      if (unit === "stick" && g.qty > 1) unit = "sticks";
      // Pluralize the unit itself when qty > 1 (cup → cups, pinch → pinches).
      if (g.qty > 1) unit = pluralizeUnit(unit);
      // Pluralize collective/countable nouns measured in cups/oz, e.g.
      // "1 cup berry" → "1 cup of berries", "2 cup tomato" → "2 cups of tomatoes".
      displayName = `${qtyStr} ${unit} of ${pluralizeIngredient(g.base)}`;
    } else if (portionDefault) {
      // Vague protein mass noun without a real unit — add a portion descriptor
      // so "1 salmon" becomes "1 fillet of salmon", "2 chicken" → "2 breasts of chicken".
      const unit = g.qty > 1 ? pluralizeUnit(portionDefault) : portionDefault;
      displayName = `${qtyStr} ${unit} of ${g.base}`;
    } else {
      // No real unit (originally "each", a size descriptor like "large", or
      // converted-from-cups produce). Pluralize the base noun when qty > 1
      // so we get "2 wraps", "3 eggs", "2 cucumbers" — but skip mass nouns.
      let base = g.base;
      if (g.qty > 1) base = pluralizeIngredient(base);
      displayName = `${qtyStr} ${base}`;
    }
    return {
      displayName,
      cost: g.cost,
      originalNames: g.originalNames,
    };
  }).filter((c) => {
    // Hide placeholder items where the AI returned no ingredient name
    // (sanitizeIngredient falls back to "unknown ingredient"). These would
    // otherwise render as "1 unknown" in the shopping list.
    const lower = c.displayName.toLowerCase();
    return !/\bunknown(\s+ingredient)?s?\b/.test(lower);
  });
}

interface CategorizedSections {
  label: string;
  items: ShoppingListItem[];
}

function buildSections(items: ShoppingListItem[]): CategorizedSections[] {
  const groups: Record<string, ShoppingListItem[]> = {
    produce: [],
    dairy: [],
    plantBased: [],
    dryGoods: [],
    spicesCondiments: [],
  };
  for (const item of items) {
    const cat = categorizeItem(item.name);
    groups[cat].push(item);
  }
  const labelMap: Record<string, string> = {
    produce: "Produce",
    dairy: "Dairy",
    plantBased: "Plant-based",
    dryGoods: "Dry goods",
    spicesCondiments: "Spices & Condiments",
  };
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => ({ label: labelMap[key], items }));
}

const Plan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const formInputs = useMemo<FormInputs | undefined>(() => {
    if (location.state) {
      const { _planSource, _generatedPlan, ...inputs } = location.state as any;
      return inputs as FormInputs;
    }
    try {
      const saved = localStorage.getItem("formInputs");
      if (saved) return JSON.parse(saved) as FormInputs;
    } catch { /* ignore */ }
    return undefined;
  }, [location.state]);

  const plan = useMemo<PlanData>(() => {
    // If we arrived with a pre-generated plan from the AI service, use it
    if (location.state?._generatedPlan) {
      const generated = location.state._generatedPlan as PlanData;
      const { __debugInfo, ...storable } = generated as any;
      localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(storable));
      return generated;
    }

    // If we arrived with fresh form inputs (via location.state), generate locally as fallback
    if (location.state) {
      const generated = generatePlan(formInputs);
      const { __debugInfo, ...storable } = generated as any;
      localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(storable));
      return generated;
    }

    const stored = localStorage.getItem(WEEKLY_PLAN_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as PlanData;
      } catch {
        localStorage.removeItem(WEEKLY_PLAN_KEY);
      }
    }

    const generated = generatePlan(formInputs);
    const { __debugInfo, ...storable } = generated as any;
    localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(storable));
    return generated;
  }, [formInputs, location.state]);

  const debugInfo = useMemo<PlanDebugInfo | null>(() => {
    if (!import.meta.env.DEV) return null;
    return (plan as any).__debugInfo ?? null;
  }, [plan]);

  const showDebugPanel = import.meta.env.DEV && getShowDebugTools() && !!debugInfo;

  const [cookedMeals, setCookedMeals] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem(COOKED_MEALS_KEY);
      return new Set<string>(s ? JSON.parse(s) : []);
    } catch { return new Set(); }
  });

  // Re-read cooked state when returning from recipe page
  useEffect(() => {
    try {
      const s = localStorage.getItem(COOKED_MEALS_KEY);
      setCookedMeals(new Set<string>(s ? JSON.parse(s) : []));
    } catch {}
  }, [location]);

  // All items from the plan (shopping + initial pantry)
  const allItems = useMemo(() => {
    const shopItems = [
      ...plan.shoppingList.produce,
      ...plan.shoppingList.dairy,
      ...plan.shoppingList.plantBased,
      ...plan.shoppingList.dryGoods,
      ...plan.shoppingList.spicesCondiments,
    ];
    return [...shopItems, ...plan.pantryItems];
  }, [plan]);

  // "Have items" = items in pantry list, persisted in localStorage
  const [haveItems, setHaveItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(HAVE_STORAGE_KEY);
      if (saved) {
        return new Set<string>(JSON.parse(saved));
      }
    } catch { /* ignore */ }
    return new Set(plan.pantryItems.map((i) => i.name));
  });

  useEffect(() => {
    localStorage.setItem(HAVE_STORAGE_KEY, JSON.stringify([...haveItems]));
  }, [haveItems]);

  const moveToHave = useCallback((itemNames: string[]) => {
    setHaveItems((prev) => {
      const next = new Set(prev);
      itemNames.forEach((n) => next.add(n));
      return next;
    });
  }, []);

  const moveToShopping = useCallback((itemNames: string[]) => {
    setHaveItems((prev) => {
      const next = new Set(prev);
      itemNames.forEach((n) => next.delete(n));
      return next;
    });
  }, []);

  // Derive shopping and pantry lists
  const shoppingItems = useMemo(
    () => allItems.filter((item) => !haveItems.has(item.name)),
    [allItems, haveItems]
  );
  const pantryListItems = useMemo(
    () => allItems.filter((item) => haveItems.has(item.name)),
    [allItems, haveItems]
  );

  const shoppingSections = useMemo(() => buildSections(shoppingItems), [shoppingItems]);
  const pantrySections = useMemo(() => buildSections(pantryListItems), [pantryListItems]);

  const spendLow = useMemo(
    () => Math.floor(shoppingItems.reduce((sum, item) => sum + (item.costMin ?? item.cost * 0.9), 0)),
    [shoppingItems]
  );
  const spendHigh = useMemo(
    () => Math.ceil(shoppingItems.reduce((sum, item) => sum + (item.costMax ?? item.cost * 1.1), 0)),
    [shoppingItems]
  );
  const spendLikely = useMemo(
    () => Math.round(shoppingItems.reduce((sum, item) => sum + (item.costLikely ?? item.cost), 0)),
    [shoppingItems]
  );
  const shoppingCost = spendLikely; // for pantry savings display
  const pantrySavings = useMemo(
    () => pantryListItems.reduce((sum, item) => sum + (item.costLikely ?? item.cost), 0),
    [pantryListItems]
  );

  // Budget left calculation
  const budget = plan.metrics.budget || 60;
  const budgetLeftMin = budget - spendHigh;
  const budgetLeftMax = budget - spendLow;

  // Dynamic cost range
  const dynamicCostRange = `$${spendLow}–$${spendHigh}`;

  // Budget left display
  const isOverBudget = budgetLeftMax < 0;
  const budgetLeftDisplay = useMemo(() => {
    if (budgetLeftMin === budgetLeftMax) {
      return isOverBudget ? `$${Math.abs(budgetLeftMin)}` : `$${budgetLeftMin}`;
    }
    if (isOverBudget) {
      return `$${Math.abs(budgetLeftMax)}–$${Math.abs(budgetLeftMin)}`;
    }
    if (budgetLeftMin < 0) {
      return `$0–$${budgetLeftMax}`;
    }
    return `$${budgetLeftMin}–$${budgetLeftMax}`;
  }, [budgetLeftMin, budgetLeftMax, isOverBudget]);

  const ingredientReuse = plan.metrics.ingredientReusePercent ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 font-serif text-2xl text-foreground">Your Week</h1>
        <p className="mb-5 text-sm text-muted-foreground">Personalized meal plan</p>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center bg-savr-green-light border-0">
            <ChefHat className="h-4 w-4 text-primary/80" strokeWidth={1.75} />
            <span className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight text-foreground">
              {plan.metrics.totalMeals || "—"}
            </span>
            <span className="text-sm font-medium leading-[1.3] text-muted-foreground">meals planned</span>
          </Card>
          <Card className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center bg-savr-orange-light border-0">
            <DollarSign className="h-4 w-4 text-accent/80" strokeWidth={1.75} />
            <span className="text-[22px] sm:text-[26px] font-bold leading-[1.15] tracking-tight text-foreground">
              {shoppingCost > 0 ? dynamicCostRange : "—"}
            </span>
            <span className="text-sm font-medium leading-[1.3] text-muted-foreground">estimated spend</span>
          </Card>
          <Card className={`flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center border-0 ${isOverBudget ? "bg-destructive/10" : "bg-savr-green-light"}`}>
            {isOverBudget ? (
              <AlertTriangle className="h-4 w-4 text-destructive/80" strokeWidth={1.75} />
            ) : (
              <Wallet className="h-4 w-4 text-primary/80" strokeWidth={1.75} />
            )}
            <span className={`text-[22px] sm:text-[26px] font-bold leading-[1.15] tracking-tight ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
              {shoppingCost > 0 ? budgetLeftDisplay : "—"}
            </span>
            <span className={`text-sm font-medium leading-[1.3] ${isOverBudget ? "text-destructive/80" : "text-muted-foreground"}`}>
              {isOverBudget ? "over budget" : "budget left"}
            </span>
          </Card>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center bg-savr-badge border-0 cursor-help">
                  <RefreshCw className="h-4 w-4 text-primary/80" strokeWidth={1.75} />
                  <span className="text-[26px] sm:text-[30px] font-bold leading-[1.15] tracking-tight text-foreground">
                    {ingredientReuse}%
                  </span>
                  <span className="text-sm font-medium leading-[1.3] text-muted-foreground">shared ingredients</span>
                  <span className="text-xs leading-[1.3] text-foreground/60">helps reduce waste</span>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[220px] text-xs">
                  Meals were planned to reuse ingredients across the week, helping reduce extra purchases and waste.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Savings callout */}
        {pantrySavings > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-savr-green-light px-4 py-2.5">
            <PiggyBank className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              Saved ~${Math.round(pantrySavings)} by using pantry items
            </span>
          </div>
        )}

        {/* Dev-only debug panel (toggle lives in Settings) */}
        {PlanDebugPanel && showDebugPanel && (
          <div className="mb-6">
            <Suspense fallback={null}>
              <PlanDebugPanel debug={debugInfo!} />
            </Suspense>
          </div>
        )}

        {(() => {
          const typeLabels: Record<MealType, { label: string; icon: React.ReactNode }> = {
            breakfast: { label: "Breakfast", icon: <Coffee className="h-4 w-4" /> },
            lunch: { label: "Lunch", icon: <Sun className="h-4 w-4" /> },
            dinner: { label: "Dinner", icon: <UtensilsCrossed className="h-4 w-4" /> },
            snack: { label: "Snacks", icon: <Cookie className="h-4 w-4" /> },
          };
          const activeMealTypes = (["breakfast", "lunch", "dinner", "snack"] as MealType[]).filter(
            (t) => plan.meals.some((m) => m.mealType === t)
          );
          if (activeMealTypes.length === 0) return null;
          return (
            <Tabs defaultValue={activeMealTypes[0]} className="mb-6">
              <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${activeMealTypes.length}, 1fr)` }}>
                {activeMealTypes.map((type) => {
                  const { label, icon } = typeLabels[type];
                  const count = plan.meals.filter((m) => m.mealType === type).length;
                  return (
                    <TabsTrigger key={type} value={type} className="flex items-center gap-1.5 text-xs sm:text-sm">
                      {icon}
                      {label}
                      <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{count}</Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {activeMealTypes.map((type) => {
                const typeMeals = plan.meals.filter((m) => m.mealType === type);
                return (
                  <TabsContent key={type} value={type} className="space-y-2 mt-3">
                    {typeMeals.map((meal) => {
                      const isCooked = cookedMeals.has(meal.id);
                      return (
                        <Card
                          key={meal.id}
                          className={`flex cursor-pointer items-center gap-3 p-4 transition-shadow hover:shadow-md active:scale-[0.99] ${isCooked ? "opacity-75 bg-savr-green-light/50" : ""}`}
                          onClick={() => navigate(`/recipe/${meal.id}`, { state: formInputs })}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold text-sm ${isCooked ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {isCooked ? <Check className="h-5 w-5" /> : meal.day}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isCooked ? "text-muted-foreground line-through" : "text-foreground"}`}>{meal.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {isCooked ? "Cooked ✓" : meal.duration}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Card>
                      );
                    })}
                  </TabsContent>
                );
              })}
            </Tabs>
          );
        })()}

        {/* Two-column lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shopping List */}
          <Card className="p-4 max-h-[60vh] overflow-hidden flex flex-col border-accent/30 bg-savr-orange-light/40">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-foreground">
                Shopping list ({shoppingItems.length})
              </h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="ml-auto bg-accent/10 text-accent border-0 cursor-help">
                      Likely total: ${spendLikely}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Midpoint estimate. Full range: ${spendLow}–${spendHigh}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="overflow-y-auto flex-1 -mr-2 pr-2">
              {shoppingSections.map((section) => {
                const consolidated = consolidateItems(section.items);
                return (
                  <div key={section.label} className="mb-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      {section.label}
                    </p>
                    <ul className="space-y-1 text-sm text-foreground">
                      {consolidated.map((item) => (
                        <li key={item.displayName} className="flex items-center gap-2 group">
                          <span className="flex-1 truncate">{item.displayName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 shrink-0 transition-opacity hover:text-primary hover:bg-primary/10"
                            onClick={() => moveToHave(item.originalNames)}
                            title="I have this"
                          >
                            <ArrowRight className="h-3 w-3 mr-0.5" />
                            Have it
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {shoppingSections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You have everything you need! 🎉
                </p>
              )}
            </div>
          </Card>

          {/* Pantry List */}
          <Card className="p-4 max-h-[60vh] overflow-hidden flex flex-col border-primary/30 bg-savr-green-light/40">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">
                Pantry ({pantryListItems.length} items)
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 -mr-2 pr-2">
              {pantrySections.map((section) => {
                const consolidated = consolidateItems(section.items);
                return (
                  <div key={section.label} className="mb-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      {section.label}
                    </p>
                    <ul className="space-y-1 text-sm text-foreground">
                      {consolidated.map((item) => (
                        <li key={item.displayName} className="flex items-center gap-2 group">
                          <span className="flex-1 truncate">{item.displayName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 shrink-0 transition-opacity hover:text-accent hover:bg-accent/10"
                            onClick={() => moveToShopping(item.originalNames)}
                            title="Don't have this"
                          >
                            <ArrowLeft className="h-3 w-3 mr-0.5" />
                            Need it
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {pantrySections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pantry items yet
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Plan;
