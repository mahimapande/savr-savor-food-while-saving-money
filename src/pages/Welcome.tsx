import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wallet, Leaf, Globe2, Package } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();
  const start = () => navigate("/start");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">
            Savr
          </span>
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8">
            <UtensilsCrossed className="h-7 w-7" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-snug">
            Plan your week of meals with less stress
          </h1>

          <p className="mt-5 text-base text-muted-foreground leading-relaxed">
            Savr helps you create a weekly meal plan based on your budget, dietary needs,
            cuisines, and pantry items.
          </p>

          <div className="mt-10 w-full rounded-2xl border bg-card p-5 text-left shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Next, you'll share
            </p>
            <ul className="space-y-3 text-sm text-foreground">
              <li className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Weekly budget
              </li>
              <li className="flex items-center gap-3">
                <Leaf className="h-4 w-4 text-muted-foreground" />
                Dietary needs and allergies
              </li>
              <li className="flex items-center gap-3">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                Cuisines you want this week
              </li>
              <li className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                Pantry items on hand
              </li>
            </ul>
          </div>

          <Button onClick={start} size="lg" className="mt-8 w-full h-12 text-base">
            Start planning
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Welcome;
