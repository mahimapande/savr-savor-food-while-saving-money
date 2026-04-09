import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { generatePlan, FormInputs } from "@/data/mockData";
import { UtensilsCrossed, Plus, X } from "lucide-react";

const CUISINES = ["Italian", "Thai", "American"];
const PANTRY_DEFAULTS = [
  { name: "Eggs", placeholder: "e.g. 6 large eggs" },
  { name: "Milk", placeholder: "e.g. 1 gallon milk" },
  { name: "Butter", placeholder: "e.g. 1 stick butter" },
];
const WEEKLY_PLAN_KEY = "weeklyPlan";
const HAVE_STORAGE_KEY = "savr-have-items";

const Index = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [mealCounts, setMealCounts] = useState({ breakfast: 0, lunch: 0, dinner: 5, snack: 0 });
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [customCuisine, setCustomCuisine] = useState("");
  // pantryChecked tracks which items are toggled on; pantryAmounts stores the user-typed quantity string
  const [pantryChecked, setPantryChecked] = useState<Set<string>>(new Set());
  const [pantryAmounts, setPantryAmounts] = useState<Record<string, string>>({});
  const [customPantry, setCustomPantry] = useState("");
  const [preference, setPreference] = useState("balanced");

  const toggleCuisine = (c: string) => {
    setCuisines((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : prev.length < 3 ? [...prev, c] : prev
    );
  };

  const addCustomCuisine = () => {
    if (customCuisine.trim() && !cuisines.includes(customCuisine.trim())) {
      setCuisines((prev) => (prev.length < 3 ? [...prev, customCuisine.trim()] : prev));
      setCustomCuisine("");
    }
  };

  const togglePantry = (name: string) => {
    setPantryChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateAmount = (name: string, value: string) => {
    setPantryAmounts((prev) => ({ ...prev, [name]: value }));
  };

  const addCustomPantry = () => {
    const trimmed = customPantry.trim();
    if (!trimmed) return;
    // Store the full string directly (e.g. "3 tomatoes") — no separate amount needed
    const alreadyExists = [...pantryChecked].some((p) => p.toLowerCase() === trimmed.toLowerCase())
      || PANTRY_DEFAULTS.some((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      setPantryChecked((prev) => new Set(prev).add(trimmed));
      // Put the full string into amounts so buildPantryItems uses it as-is
      setPantryAmounts((prev) => ({ ...prev, [trimmed]: trimmed }));
      setCustomPantry("");
    }
  };

  // Build the final pantryItems array from checked items + their amounts
  const buildPantryItems = (): string[] => {
    const defaults = PANTRY_DEFAULTS.map((d) => d.name.toLowerCase());
    return [...pantryChecked].map((name) => {
      const amount = (pantryAmounts[name] || "").trim();
      if (!amount) return name;
      // For default items (Eggs, Milk, Butter), combine amount + name (e.g. "6 eggs")
      if (defaults.includes(name.toLowerCase())) {
        return `${amount} ${name.toLowerCase()}`;
      }
      // For custom items, the amount IS the full string already
      return amount;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalMeals = mealCounts.breakfast + mealCounts.lunch + mealCounts.dinner + mealCounts.snack;
    const inputs: FormInputs = {
      budget,
      meals: String(totalMeals),
      dietary,
      cuisines,
      pantryItems: buildPantryItems(),
      preference,
      mealCounts,
    };

    localStorage.clear();
    const generated = generatePlan(inputs);
    localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(generated));
    localStorage.setItem("formInputs", JSON.stringify(inputs));
    localStorage.setItem(
      HAVE_STORAGE_KEY,
      JSON.stringify(generated.pantryItems.map((item) => item.name))
    );

    navigate("/plan", {
      state: inputs,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-savr-green-light px-4 py-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span className="font-serif text-xl text-primary">Savr</span>
          </div>
          <h1 className="font-serif text-2xl text-foreground">
            Savor food while saving money
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget">Weekly budget</Label>
            <Input
              id="budget"
              type="number"
              placeholder="$ e.g. 60"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          {/* Meals */}
          <div className="space-y-2">
            <Label htmlFor="meals">Number of meals</Label>
            <Input
              id="meals"
              type="number"
              placeholder="e.g. 5"
              value={meals}
              onChange={(e) => setMeals(e.target.value)}
            />
          </div>

          {/* Dietary */}
          <div className="space-y-3">
            <Label>Dietary needs (select all that apply)</Label>
            <div className="flex flex-wrap gap-2">
              {["Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free"].map((d) => (
                <Badge
                  key={d}
                  variant={dietary.includes(d) ? "default" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors"
                  onClick={() =>
                    setDietary((prev) =>
                      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                    )
                  }
                >
                  {d}
                </Badge>
              ))}
            </div>
          </div>

          {/* Cuisines */}
          <div className="space-y-3">
            <Label>Cuisine of choice (select 2–3)</Label>
            <div className="flex flex-wrap gap-2">
              {[...CUISINES, ...cuisines.filter((c) => !CUISINES.includes(c))].map((c) => (
                <Badge
                  key={c}
                  variant={cuisines.includes(c) ? "default" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors"
                  onClick={() => toggleCuisine(c)}
                >
                  {c}
                  {cuisines.includes(c) && !CUISINES.includes(c) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add cuisine"
                value={customCuisine}
                onChange={(e) => setCustomCuisine(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCuisine())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addCustomCuisine}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pantry */}
          <div className="space-y-3">
            <Label>Pantry items on hand</Label>
            <div className="space-y-3">
              {PANTRY_DEFAULTS.map((item) => (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`pantry-${item.name}`}
                      checked={pantryChecked.has(item.name)}
                      onCheckedChange={() => togglePantry(item.name)}
                    />
                    <Label htmlFor={`pantry-${item.name}`} className="font-normal">
                      {item.name}
                    </Label>
                  </div>
                  {pantryChecked.has(item.name) && (
                    <Input
                      placeholder={item.placeholder}
                      value={pantryAmounts[item.name] || ""}
                      onChange={(e) => updateAmount(item.name, e.target.value)}
                      className="ml-6 max-w-xs text-sm h-8"
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Custom items shown as removable badges */}
            {[...pantryChecked].filter((name) => !PANTRY_DEFAULTS.some((d) => d.name === name)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...pantryChecked]
                  .filter((name) => !PANTRY_DEFAULTS.some((d) => d.name === name))
                  .map((name) => (
                    <Badge
                      key={name}
                      variant="default"
                      className="cursor-pointer select-none px-3 py-1.5 text-sm"
                      onClick={() => {
                        setPantryChecked((prev) => {
                          const next = new Set(prev);
                          next.delete(name);
                          return next;
                        });
                        setPantryAmounts((prev) => {
                          const next = { ...prev };
                          delete next[name];
                          return next;
                        });
                      }}
                    >
                      {name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="e.g. 3 tomatoes, 1 cup rice"
                value={customPantry}
                onChange={(e) => setCustomPantry(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomPantry())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={addCustomPantry}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preference */}
          <div className="space-y-3">
            <Label>Preference</Label>
            <RadioGroup value={preference} onValueChange={setPreference} className="space-y-2">
              {[
                { value: "savings", label: "Reuse / maximize savings" },
                { value: "balanced", label: "Balanced" },
                { value: "variety", label: "Maximize variety" },
              ].map((opt) => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full text-base py-6">
            Generate plan
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Index;
