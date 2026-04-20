import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FormInputs } from "@/data/mockData";
import { generatePlanFromAI } from "@/services/planService";
import { UtensilsCrossed, Plus, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CUISINES = ["Italian", "Thai", "American"];
const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Soy",
  "Sesame",
  "Fish",
  "Shellfish",
  "Wheat/Gluten",
];
const PANTRY_DEFAULTS = [
  { name: "Eggs", placeholder: "e.g. 6 large eggs" },
  { name: "Milk", placeholder: "e.g. 1 gallon milk" },
  { name: "Butter", placeholder: "e.g. 1 stick butter" },
];
const WEEKLY_PLAN_KEY = "weeklyPlan";
const HAVE_STORAGE_KEY = "savr-have-items";
const FORM_INPUTS_KEY = "formInputs";

// A pantry value must start with a number (integer or decimal, optional fraction).
// Examples accepted: "6", "6 eggs", "1.5 cups rice", "1/2 lb pasta".
const QTY_PATTERN = /^\s*(\d+(\.\d+)?|\d+\/\d+)(\s|$)/;
const hasQuantity = (s: string): boolean => QTY_PATTERN.test(s);

// Suggest a likely unit for known bare ingredient nouns (best-effort hint only).
const UNIT_HINTS: Record<string, string> = {
  eggs: "large", egg: "large",
  milk: "gallon", butter: "stick", bread: "loaf",
  rice: "cup", pasta: "lb", flour: "cup", sugar: "cup",
  oil: "tbsp", "olive oil": "tbsp",
  cheese: "oz", yogurt: "cup",
  onion: "each", onions: "each", tomato: "each", tomatoes: "each",
  garlic: "clove", potato: "each", potatoes: "each",
  carrot: "each", carrots: "each", lemon: "each", lemons: "each",
  avocado: "each", avocados: "each", banana: "each", bananas: "each",
};
const unitHintFor = (name: string): string | null => {
  const key = name.trim().toLowerCase();
  if (UNIT_HINTS[key]) return UNIT_HINTS[key];
  // Try last word (e.g. "fresh basil" → "basil")
  const last = key.split(/\s+/).pop() || "";
  return UNIT_HINTS[last] || null;
};

const Index = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [mealCounts, setMealCounts] = useState({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
  const [mealDays, setMealDays] = useState<Record<string, string[]>>({
    breakfast: [],
    lunch: [],
    dinner: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    snack: [],
  });
  const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (mealType: string, day: string) => {
    setMealDays((prev) => {
      const current = prev[mealType] || [];
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
      return { ...prev, [mealType]: next };
    });
  };

  // Sync meal count with selected days
  const updateMealCount = (key: string, newCount: number) => {
    setMealCounts((prev) => ({ ...prev, [key]: newCount }));
    // Auto-select/deselect days to match count
    setMealDays((prev) => {
      const current = prev[key] || [];
      if (newCount > current.length) {
        // Add days from start of week that aren't selected yet
        const available = ALL_DAYS.filter((d) => !current.includes(d));
        const toAdd = available.slice(0, newCount - current.length);
        return { ...prev, [key]: [...current, ...toAdd].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)) };
      } else if (newCount < current.length) {
        // Remove days from the end
        return { ...prev, [key]: current.slice(0, newCount) };
      }
      return prev;
    });
  };
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [customCuisine, setCustomCuisine] = useState("");
  // pantryChecked tracks which items are toggled on; pantryAmounts stores the user-typed quantity string
  const [pantryChecked, setPantryChecked] = useState<Set<string>>(new Set());
  const [pantryAmounts, setPantryAmounts] = useState<Record<string, string>>({});
  const [customPantry, setCustomPantry] = useState("");
  const [customPantryError, setCustomPantryError] = useState<string | null>(null);
  const [restoredBareItems, setRestoredBareItems] = useState<string[]>([]);
  const [preference, setPreference] = useState("balanced");

  // On mount: if a prior formInputs is in localStorage, restore pantry items
  // and surface ones missing a quantity so the user can fix them before
  // regenerating.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_INPUTS_KEY);
      if (!raw) return;
      const prev = JSON.parse(raw) as Partial<FormInputs>;
      const items = Array.isArray(prev.pantryItems) ? prev.pantryItems : [];
      if (items.length === 0) return;

      const bare: string[] = [];
      const nextChecked = new Set<string>();
      const nextAmounts: Record<string, string> = {};

      for (const rawItem of items) {
        const s = String(rawItem).trim();
        if (!s) continue;
        const isDefault = PANTRY_DEFAULTS.find(
          (d) =>
            s.toLowerCase() === d.name.toLowerCase() ||
            s.toLowerCase().endsWith(" " + d.name.toLowerCase())
        );
        if (isDefault) {
          nextChecked.add(isDefault.name);
          const qtyPart =
            s.toLowerCase() === isDefault.name.toLowerCase()
              ? ""
              : s.slice(0, s.toLowerCase().lastIndexOf(isDefault.name.toLowerCase())).trim();
          nextAmounts[isDefault.name] = qtyPart;
          if (!hasQuantity(qtyPart)) bare.push(isDefault.name);
        } else {
          nextChecked.add(s);
          nextAmounts[s] = s;
          if (!hasQuantity(s)) bare.push(s);
        }
      }

      if (nextChecked.size > 0) {
        setPantryChecked(nextChecked);
        setPantryAmounts(nextAmounts);
        setRestoredBareItems(bare);
      }
    } catch { /* ignore */ }
  }, []);

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
    // Clear the "needs fixing" warning for this item once a quantity appears
    if (hasQuantity(value)) {
      setRestoredBareItems((prev) => prev.filter((n) => n !== name));
    }
  };

  const addCustomPantry = () => {
    const trimmed = customPantry.trim();
    if (!trimmed) return;
    if (!hasQuantity(trimmed)) {
      const lastWord = trimmed.split(/\s+/).pop() || trimmed;
      const hint = unitHintFor(trimmed) || unitHintFor(lastWord);
      setCustomPantryError(
        hint
          ? `Add a quantity (e.g. "2 ${hint} ${trimmed}").`
          : `Add a quantity (e.g. "2 ${trimmed}", "1 cup ${trimmed}").`
      );
      return;
    }
    const alreadyExists =
      [...pantryChecked].some((p) => p.toLowerCase() === trimmed.toLowerCase()) ||
      PANTRY_DEFAULTS.some((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      setPantryChecked((prev) => new Set(prev).add(trimmed));
      setPantryAmounts((prev) => ({ ...prev, [trimmed]: trimmed }));
      setCustomPantry("");
      setCustomPantryError(null);
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

  const [isGenerating, setIsGenerating] = useState(false);

  // Compute which checked pantry items are missing a quantity (used to block
  // submit and to render inline errors).
  const invalidPantryNames: string[] = [...pantryChecked].filter((name) => {
    const isDefault = PANTRY_DEFAULTS.some((d) => d.name === name);
    const value = isDefault ? (pantryAmounts[name] || "") : (pantryAmounts[name] || name);
    return !hasQuantity(value);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (invalidPantryNames.length > 0) {
      toast({
        title: "Add a quantity to each pantry item",
        description: `Missing quantity for: ${invalidPantryNames.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const totalMeals = mealCounts.breakfast + mealCounts.lunch + mealCounts.dinner + mealCounts.snack;
    const inputs: FormInputs = {
      budget,
      meals: String(totalMeals),
      dietary,
      allergies,
      cuisines,
      pantryItems: buildPantryItems(),
      preference,
      mealCounts,
      mealDays: mealDays as FormInputs["mealDays"],
    };

    setIsGenerating(true);
    localStorage.clear();
    localStorage.setItem("formInputs", JSON.stringify(inputs));

    try {
      const result = await generatePlanFromAI(inputs);

      // Schedule-coverage failure: show friendly error and STAY on the form so
      // the user can try again. Do not silently render a partial plan.
      if (result.scheduleCoverageFailed) {
        toast({
          title: "We had trouble filling all your slots",
          description: "Please try again — the planner couldn't fill every meal.",
          variant: "destructive",
        });
        return;
      }

      // Store without __debugInfo to avoid bloating localStorage
      const { __debugInfo, ...storable } = result.plan as any;
      localStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(storable));
      localStorage.setItem(
        HAVE_STORAGE_KEY,
        JSON.stringify(result.plan.pantryItems.map((item) => item.name))
      );

      if (result.source === "local" && result.error) {
        toast({
          title: "Using offline plan",
          description: `AI generation failed: ${result.error}. Showing a locally generated plan instead.`,
          variant: "destructive",
        });
      } else if (result.source === "ai") {
        toast({
          title: "Plan generated with AI ✨",
          description: "Your personalized meal plan is ready.",
        });
      }

      navigate("/plan", { state: { ...inputs, _planSource: result.source, _generatedPlan: result.plan } });
    } catch (err) {
      console.error("Plan generation failed:", err);
      toast({
        title: "Generation failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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

          {/* Meal Counts & Days */}
          <div className="space-y-3">
            <Label>Meals per week</Label>
            <div className="space-y-3">
              {([
                { key: "breakfast" as const, label: "Breakfasts" },
                { key: "lunch" as const, label: "Lunches" },
                { key: "dinner" as const, label: "Dinners" },
                { key: "snack" as const, label: "Snacks" },
              ]).map(({ key, label }) => (
                <div key={key} className="rounded-lg border border-border px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateMealCount(key, Math.max(0, mealCounts[key] - 1))}
                        disabled={mealCounts[key] === 0}
                      >
                        −
                      </Button>
                      <span className="w-5 text-center text-sm font-medium">{mealCounts[key]}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateMealCount(key, Math.min(7, mealCounts[key] + 1))}
                        disabled={mealCounts[key] === 7}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  {mealCounts[key] > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_DAYS.map((day) => (
                        <Badge
                          key={day}
                          variant={(mealDays[key] || []).includes(day) ? "default" : "outline"}
                          className="cursor-pointer select-none px-2 py-0.5 text-xs transition-colors"
                          onClick={() => {
                            const current = mealDays[key] || [];
                            if (current.includes(day)) {
                              // Deselect day and reduce count
                              toggleDay(key, day);
                              setMealCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
                            } else if (current.length < 7) {
                              // Select day and increase count
                              toggleDay(key, day);
                              setMealCounts((prev) => ({ ...prev, [key]: Math.min(7, prev[key] + 1) }));
                            }
                          }}
                        >
                          {day}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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

          {/* Allergies / ingredients to avoid */}
          <div className="space-y-3">
            <Label>Allergies / ingredients to avoid</Label>
            <p className="text-xs text-muted-foreground">
              Hard exclusions — these will never appear in your meals, shopping list, or pantry usage.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((a) => (
                <Badge
                  key={a}
                  variant={allergies.includes(a) ? "destructive" : "outline"}
                  className="cursor-pointer select-none px-3 py-1.5 text-sm transition-colors"
                  onClick={() =>
                    setAllergies((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                    )
                  }
                >
                  {a}
                </Badge>
              ))}
            </div>
            {allergies.filter((a) => !COMMON_ALLERGENS.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allergies
                  .filter((a) => !COMMON_ALLERGENS.includes(a))
                  .map((a) => (
                    <Badge
                      key={a}
                      variant="destructive"
                      className="cursor-pointer select-none px-3 py-1.5 text-sm"
                      onClick={() => setAllergies((prev) => prev.filter((x) => x !== a))}
                    >
                      {a}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add other ingredient to avoid (e.g. cilantro)"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = customAllergy.trim();
                    if (v && !allergies.some((a) => a.toLowerCase() === v.toLowerCase())) {
                      setAllergies((prev) => [...prev, v]);
                      setCustomAllergy("");
                    }
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const v = customAllergy.trim();
                  if (v && !allergies.some((a) => a.toLowerCase() === v.toLowerCase())) {
                    setAllergies((prev) => [...prev, v]);
                    setCustomAllergy("");
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

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

          <Button type="submit" className="w-full text-base py-6" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating your plan…
              </>
            ) : (
              "Generate plan"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Index;
