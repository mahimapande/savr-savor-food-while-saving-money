import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Plus, X } from "lucide-react";

const CUISINES = ["Italian", "Thai", "American"];
const PANTRY_DEFAULTS = ["Eggs", "Milk", "Butter"];

const Index = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [meals, setMeals] = useState("");
  const [dietary, setDietary] = useState("");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [customCuisine, setCustomCuisine] = useState("");
  const [pantryItems, setPantryItems] = useState<string[]>([]);
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

  const togglePantry = (item: string) => {
    setPantryItems((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCustomPantry = () => {
    if (customPantry.trim() && !pantryItems.includes(customPantry.trim())) {
      setPantryItems((prev) => [...prev, customPantry.trim()]);
      setCustomPantry("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/plan", {
      state: { budget, meals, dietary, cuisines, pantryItems, preference },
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
          <div className="space-y-2">
            <Label htmlFor="dietary">Dietary needs</Label>
            <Input
              id="dietary"
              placeholder="e.g. vegetarian"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
            />
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
            <div className="space-y-2">
              {[...PANTRY_DEFAULTS, ...pantryItems.filter((i) => !PANTRY_DEFAULTS.includes(i))].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      id={`pantry-${item}`}
                      checked={pantryItems.includes(item)}
                      onCheckedChange={() => togglePantry(item)}
                    />
                    <Label htmlFor={`pantry-${item}`} className="font-normal">
                      {item}
                    </Label>
                  </div>
                )
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add items"
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
