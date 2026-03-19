import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { generatePlan } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, DollarSign, Recycle, ShoppingCart, Clock, ChevronRight } from "lucide-react";

const Plan = () => {
  const navigate = useNavigate();
  const plan = useMemo(() => generatePlan(), []);

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
            <span className="text-lg font-semibold text-foreground">82%</span>
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
              onClick={() => navigate(`/recipe/${meal.id}`)}
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
              Shopping list ({plan.shoppingList.totalItems} items)
            </h2>
            <Badge variant="secondary" className="ml-auto">
              Est. {plan.shoppingList.estimatedCost}
            </Badge>
          </div>
          <div className="overflow-y-auto flex-1 -mr-2 pr-2">
            {(
              [
                { label: "Produce", items: plan.shoppingList.produce },
                { label: "Pantry", items: plan.shoppingList.pantry },
                { label: "Dairy", items: plan.shoppingList.dairy },
              ] as const
            ).map((section) => (
              <div key={section.label} className="mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  {section.label}
                </p>
                <ul className="space-y-0.5 text-sm text-foreground">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Plan;
