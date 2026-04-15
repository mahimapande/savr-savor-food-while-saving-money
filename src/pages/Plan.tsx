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

function parseShoppingItem(item: ShoppingListItem) {
  return {
    qty: item.qty,
    unit: item.unit === "each" ? "" : item.unit,
    base: item.normalizedName,
    originalName: item.name,
    cost: item.cost,
  };
}

interface ConsolidatedItem {
  displayName: string;
  cost: number;
  originalNames: string[]; // all original item names in this group
}

function consolidateItems(items: ShoppingListItem[]): ConsolidatedItem[] {
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
    let displayName: string;
    if (g.unit) {
      displayName = `${g.qty % 1 === 0 ? g.qty : g.qty.toFixed(1)} ${g.unit} ${g.base}`;
    } else {
      displayName = g.originalNames[0];
    }
    return {
      displayName,
      cost: g.cost,
      originalNames: g.originalNames,
    };
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
    if (location.state) return location.state as FormInputs;
    try {
      const saved = localStorage.getItem("formInputs");
      if (saved) return JSON.parse(saved) as FormInputs;
    } catch { /* ignore */ }
    return undefined;
  }, [location.state]);

  const plan = useMemo<PlanData>(() => {
    // If we arrived with fresh form inputs (via location.state), always regenerate
    if (location.state) {
      const generated = generatePlan(formInputs);
      // Store without __debugInfo to avoid bloating localStorage
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
          <Card className="flex flex-col items-center gap-1 p-3 text-center bg-savr-green-light border-0">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">{plan.metrics.totalMeals || "—"}</span>
            <span className="text-xs text-muted-foreground">meals planned</span>
          </Card>
          <Card className="flex flex-col items-center gap-1 p-3 text-center bg-savr-orange-light border-0">
            <DollarSign className="h-5 w-5 text-accent" />
            <span className="text-lg font-semibold text-foreground">{shoppingCost > 0 ? dynamicCostRange : "—"}</span>
            <span className="text-xs text-muted-foreground">estimated spend</span>
          </Card>
          <Card className={`flex flex-col items-center gap-1 p-3 text-center border-0 ${isOverBudget ? "bg-destructive/10" : "bg-savr-green-light"}`}>
            {isOverBudget ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Wallet className="h-5 w-5 text-primary" />
            )}
            <span className={`text-lg font-semibold ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
              {shoppingCost > 0 ? budgetLeftDisplay : "—"}
            </span>
            <span className={`text-xs ${isOverBudget ? "text-destructive/80" : "text-muted-foreground"}`}>
              {isOverBudget ? "over budget" : "budget left"}
            </span>
          </Card>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="flex flex-col items-center gap-1 p-3 text-center bg-savr-badge border-0 cursor-help">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">{ingredientReuse}%</span>
                  <span className="text-xs text-muted-foreground">ingredient reuse</span>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Percent of ingredients used in more than one meal.</p>
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
