import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generatePlan, FormInputs, PlanData, ShoppingListItem, categorizeItem } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, DollarSign, Recycle, ShoppingCart, Clock, ChevronRight, Package, ArrowRight, ArrowLeft, PiggyBank } from "lucide-react";

const HAVE_STORAGE_KEY = "savr-have-items";
const WEEKLY_PLAN_KEY = "weeklyPlan";

// Parse "3 tbsp olive oil" → { qty: 3, unit: "tbsp", base: "olive oil" }
const QTY_UNIT_RE = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(cups?|cans?|tbsp|tsp|oz|bunch(?:es)?|cloves?|large|small|medium|inch|blocks?|slices?|lbs?)\b\s*/i;

interface ParsedItem {
  qty: number;
  unit: string;
  base: string;
  originalName: string;
  cost: number;
}

function parseIngredient(item: ShoppingListItem): ParsedItem {
  const match = item.name.match(QTY_UNIT_RE);
  if (match) {
    let qty = 0;
    const raw = match[1];
    if (raw.includes("/")) {
      const [num, den] = raw.split("/");
      qty = parseInt(num) / parseInt(den);
    } else {
      qty = parseFloat(raw);
    }
    const unit = match[2].toLowerCase().replace(/s$/, "");
    const base = item.name.slice(match[0].length).replace(/^\s*,?\s*/, "").trim();
    return { qty, unit, base: base.toLowerCase(), originalName: item.name, cost: item.cost };
  }
  return { qty: 1, unit: "", base: item.name.toLowerCase(), originalName: item.name, cost: item.cost };
}

interface ConsolidatedItem {
  displayName: string;
  cost: number;
  originalName: string; // key for have/need operations
}

function consolidateItems(items: ShoppingListItem[]): ConsolidatedItem[] {
  const groups = new Map<string, { qty: number; unit: string; base: string; cost: number; originalNames: string[] }>();

  for (const item of items) {
    const parsed = parseIngredient(item);
    const key = `${parsed.base}||${parsed.unit}`;
    const existing = groups.get(key);
    if (existing && parsed.unit !== "") {
      existing.qty += parsed.qty;
      existing.cost += item.cost;
      existing.originalNames.push(item.name);
    } else if (!existing) {
      groups.set(key, { qty: parsed.qty, unit: parsed.unit, base: parsed.base, cost: item.cost, originalNames: [item.name] });
    } else {
      // unit is empty and already exists - keep separate by using unique key
      const altKey = `${parsed.base}||${parsed.unit}||${item.name}`;
      groups.set(altKey, { qty: parsed.qty, unit: parsed.unit, base: parsed.base, cost: item.cost, originalNames: [item.name] });
    }
  }

  return [...groups.values()].map((g) => {
    let displayName: string;
    if (g.unit) {
      const unitDisplay = g.qty > 1 && !g.unit.endsWith("s") && g.unit !== "oz" ? g.unit : g.unit;
      displayName = `${g.qty % 1 === 0 ? g.qty : g.qty.toFixed(1)} ${unitDisplay} ${g.base}`;
    } else {
      displayName = g.originalNames[0];
    }
    return {
      displayName,
      cost: g.cost,
      originalName: g.originalNames[0], // primary key for interactions
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
  const formInputs = location.state as FormInputs | undefined;

  const plan = useMemo<PlanData>(() => {
    const stored = localStorage.getItem(WEEKLY_PLAN_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as PlanData;
      } catch {
        localStorage.removeItem(WEEKLY_PLAN_KEY);
      }
    }

    const generated = generatePlan(formInputs);
    localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(generated));
    return generated;
  }, [formInputs]);

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
      if (saved) return new Set(JSON.parse(saved));
    } catch { /* ignore */ }
    // Initialize from plan's pantry items (from Screen 1)
    return new Set(plan.pantryItems.map((i) => i.name));
  });

  useEffect(() => {
    localStorage.setItem(HAVE_STORAGE_KEY, JSON.stringify([...haveItems]));
  }, [haveItems]);

  const moveToHave = useCallback((itemName: string) => {
    setHaveItems((prev) => new Set(prev).add(itemName));
  }, []);

  const moveToShopping = useCallback((itemName: string) => {
    setHaveItems((prev) => {
      const next = new Set(prev);
      next.delete(itemName);
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

  const shoppingCost = useMemo(
    () => shoppingItems.reduce((sum, item) => sum + item.cost, 0),
    [shoppingItems]
  );
  const pantrySavings = useMemo(
    () => pantryListItems.reduce((sum, item) => sum + item.cost, 0),
    [pantryListItems]
  );

  // Update metrics cost based on current shopping list
  const dynamicCostRange = useMemo(() => {
    const low = Math.floor(shoppingCost * 0.9);
    const high = Math.ceil(shoppingCost * 1.1);
    return `$${low}–$${high}`;
  }, [shoppingCost]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 font-serif text-2xl text-foreground">Your Week</h1>
        <p className="mb-5 text-sm text-muted-foreground">Personalized meal plan</p>

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Card className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 p-3 sm:text-center bg-savr-green-light border-0">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">{plan.metrics.dinners}</span>
            <span className="text-xs text-muted-foreground">dinners planned</span>
          </Card>
          <Card className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 p-3 sm:text-center bg-savr-orange-light border-0">
            <DollarSign className="h-5 w-5 text-accent" />
            <span className="text-lg font-semibold text-foreground">{dynamicCostRange}</span>
            <span className="text-xs text-muted-foreground">estimated</span>
          </Card>
          <Card className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 p-3 sm:text-center bg-savr-badge border-0">
            <Recycle className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">{plan.metrics.reuseScore.split("%")[0]}%</span>
            <span className="text-xs text-muted-foreground">reuse score</span>
          </Card>
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

        {/* Meals */}
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          This week at a glance
        </h2>
        <div className="mb-6 space-y-2">
          {plan.meals.map((meal) => (
            <Card
              key={meal.id}
              className="flex cursor-pointer items-center gap-3 p-4 transition-shadow hover:shadow-md active:scale-[0.99]"
              onClick={() => navigate(`/recipe/${meal.id}`, { state: formInputs })}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary font-semibold text-sm text-secondary-foreground">
                {meal.day}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{meal.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {meal.duration}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          ))}
        </div>

        {/* Two-column lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shopping List */}
          <Card className="p-4 max-h-[60vh] overflow-hidden flex flex-col border-accent/30 bg-savr-orange-light/40">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-foreground">
                Shopping list ({shoppingItems.length})
              </h2>
              <Badge variant="secondary" className="ml-auto bg-accent/10 text-accent border-0">
                Est. ${Math.round(shoppingCost)}
              </Badge>
            </div>
            <div className="overflow-y-auto flex-1 -mr-2 pr-2">
              {shoppingSections.map((section) => (
                <div key={section.label} className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {section.label}
                  </p>
                  <ul className="space-y-1 text-sm text-foreground">
                    {section.items.map((item) => (
                      <li key={item.name} className="flex items-center gap-2 group">
                        <span className="flex-1 truncate">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 shrink-0 transition-opacity hover:text-primary hover:bg-primary/10"
                          onClick={() => moveToHave(item.name)}
                          title="I have this"
                        >
                          <ArrowRight className="h-3 w-3 mr-0.5" />
                          Have it
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
              {pantrySections.map((section) => (
                <div key={section.label} className="mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {section.label}
                  </p>
                  <ul className="space-y-1 text-sm text-foreground">
                    {section.items.map((item) => (
                      <li key={item.name} className="flex items-center gap-2 group">
                        <span className="flex-1 truncate">{item.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 shrink-0 transition-opacity hover:text-accent hover:bg-accent/10"
                          onClick={() => moveToShopping(item.name)}
                          title="Don't have this"
                        >
                          <ArrowLeft className="h-3 w-3 mr-0.5" />
                          Need it
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
