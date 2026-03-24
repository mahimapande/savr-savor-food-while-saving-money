import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generatePlan, FormInputs, ShoppingListItem } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, DollarSign, Recycle, ShoppingCart, Clock, ChevronRight, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const STORAGE_KEY = "savr-have-items";

const Plan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const formInputs = location.state as FormInputs | undefined;
  const plan = useMemo(() => {
    const generated = generatePlan(formInputs);
    sessionStorage.setItem("savr-plan", JSON.stringify(generated));
    return generated;
  }, [formInputs]);

  // "I have this" items persisted in localStorage
  const [haveItems, setHaveItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Checked-off items (visual strikethrough only, item stays visible)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...haveItems]));
  }, [haveItems]);

  const markHaveItem = useCallback((itemName: string) => {
    setHaveItems((prev) => {
      const next = new Set(prev);
      next.add(itemName);
      return next;
    });
  }, []);

  const toggleItem = (item: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  // Filter out "I have this" items and recalculate
  const sections = useMemo(() => {
    const filterItems = (items: ShoppingListItem[]) =>
      items.filter((item) => !haveItems.has(item.name));

    return [
      { label: "Produce", items: filterItems(plan.shoppingList.produce) },
      { label: "Dairy", items: filterItems(plan.shoppingList.dairy) },
      { label: "Plant-based", items: filterItems(plan.shoppingList.plantBased) },
      { label: "Dry Goods / Pantry", items: filterItems(plan.shoppingList.dryGoods) },
      { label: "Spices & Condiments", items: filterItems(plan.shoppingList.spicesCondiments) },
    ].filter((s) => s.items.length > 0);
  }, [plan.shoppingList, haveItems]);

  const visibleItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const totalCount = visibleItems.length;
  const totalCost = useMemo(
    () => visibleItems.reduce((sum, item) => sum + item.cost, 0),
    [visibleItems]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6">
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
            <span className="text-lg font-semibold text-foreground">{plan.metrics.costRange}</span>
            <span className="text-xs text-muted-foreground">estimated</span>
          </Card>
          <Card className="flex flex-row sm:flex-col items-center gap-2 sm:gap-1 p-3 sm:text-center bg-savr-badge border-0">
            <Recycle className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">{plan.metrics.reuseScore.split("%")[0]}%</span>
            <span className="text-xs text-muted-foreground">reuse score</span>
          </Card>
        </div>

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

        {/* Shopping List */}
        <Card className="p-4 max-h-[60vh] overflow-hidden flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              Shopping list ({totalCount} items)
            </h2>
            <Badge variant="secondary" className="ml-auto">
              Est. ${Math.round(totalCost)}
            </Badge>
          </div>
          <div className="overflow-y-auto flex-1 -mr-2 pr-2">
            {sections.map((section) => (
              <div key={section.label} className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  {section.label}
                </p>
                <ul className="space-y-1 text-sm text-foreground">
                  {section.items.map((item) => (
                    <li key={item.name} className="flex items-center gap-2 group">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 min-w-0">
                        <Checkbox
                          checked={checkedItems.has(item.name)}
                          onCheckedChange={() => toggleItem(item.name)}
                          className="shrink-0"
                        />
                        <span className={`truncate ${checkedItems.has(item.name) ? "line-through text-muted-foreground" : ""}`}>
                          {item.name}
                        </span>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 transition-opacity"
                        onClick={() => markHaveItem(item.name)}
                        title="I have this"
                      >
                        <X className="h-3 w-3 mr-0.5" />
                        Have it
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                You have everything you need! 🎉
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Plan;
