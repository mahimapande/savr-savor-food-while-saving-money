import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { generatePlan } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Check, Leaf, RefreshCw, DollarSign } from "lucide-react";

const Recipe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plan = useMemo(() => generatePlan(), []);
  const meal = plan.meals.find((m) => m.id === id);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [cooked, setCooked] = useState(false);

  if (!meal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Recipe not found</p>
      </div>
    );
  }

  const toggleIngredient = (i: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const badgeIcons = [Leaf, RefreshCw, DollarSign];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate("/plan")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to week
        </button>

        <h1 className="mb-2 font-serif text-2xl text-foreground">{meal.name}</h1>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          {meal.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Reuse badges */}
        <div className="mb-6 space-y-2">
          {meal.reuseBadges.map((badge, i) => {
            const Icon = badgeIcons[i % badgeIcons.length];
            return (
              <div
                key={badge}
                className="flex items-center gap-2 rounded-lg bg-savr-green-light px-3 py-2 text-sm text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {badge}
              </div>
            );
          })}
        </div>

        {/* Ingredients */}
        <Card className="mb-6 p-4">
          <h2 className="mb-3 font-semibold text-foreground">Ingredients</h2>
          <div className="space-y-2">
            {meal.ingredients.map((ing, i) => (
              <div key={i} className="flex items-start gap-2">
                <Checkbox
                  checked={checkedIngredients.has(i)}
                  onCheckedChange={() => toggleIngredient(i)}
                  className="mt-0.5"
                />
                <span
                  className={`text-sm ${
                    checkedIngredients.has(i) ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {ing.name}
                  {ing.pantry && (
                    <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">
                      pantry
                    </Badge>
                  )}
                  {ing.note && (
                    <span className="ml-1 text-xs text-muted-foreground">({ing.note})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Steps */}
        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-foreground">Steps</h2>
          <ol className="space-y-3">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="text-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/plan")}>
            Back to week
          </Button>
          <Button
            className="flex-1"
            variant={cooked ? "secondary" : "default"}
            onClick={() => setCooked(!cooked)}
          >
            {cooked ? (
              <>
                <Check className="mr-1 h-4 w-4" /> Cooked!
              </>
            ) : (
              "Mark as cooked"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Recipe;
