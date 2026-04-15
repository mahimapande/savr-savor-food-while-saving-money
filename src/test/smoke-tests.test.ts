import { describe, it, expect } from "vitest";
import { generatePlan } from "@/data/mockData";

function allShopItems(plan: ReturnType<typeof generatePlan>) {
  return [
    ...plan.shoppingList.produce,
    ...plan.shoppingList.dairy,
    ...plan.shoppingList.plantBased,
    ...plan.shoppingList.dryGoods,
    ...plan.shoppingList.spicesCondiments,
  ];
}

describe("Smoke Test 1: Empty pantry", () => {
  const plan = generatePlan({ budget: "50", meals: "3", dietary: [], cuisines: [], pantryItems: [], preference: "balanced", mealCounts: { breakfast: 0, lunch: 0, dinner: 3, snack: 0 } });
  const debug = (plan as any).__debugInfo;

  it("generates meals", () => expect(plan.meals.length).toBe(3));
  it("pantry is empty", () => expect(plan.pantryItems.length).toBe(0));
  it("shopping list has items", () => expect(allShopItems(plan).length).toBeGreaterThan(0));
  it("metrics valid", () => {
    expect(plan.metrics.totalMeals).toBe(3);
    expect(plan.metrics.costLow).toBeGreaterThan(0);
  });
  it("debug badges green", () => {
    expect(debug).toBeTruthy();
    expect(debug.validation.schemaValid).toBe(true);
    expect(debug.validation.pantryCapped).toBe(true);
    expect(debug.validation.metricsRecomputed).toBe(true);
  });
});

describe("Smoke Test 2: Exact pantry match", () => {
  const plan = generatePlan({ budget: "50", meals: "2", dietary: [], cuisines: [], pantryItems: ["4 eggs"], preference: "balanced", mealCounts: { breakfast: 2, lunch: 0, dinner: 0, snack: 0 } });
  const debug = (plan as any).__debugInfo;

  it("generates meals", () => expect(plan.meals.length).toBe(2));
  it("pantry eggs capped at 4", () => {
    const pe = plan.pantryItems.find(i => i.normalizedName === "egg" || i.normalizedName === "eggs");
    if (pe) expect(pe.qty).toBeLessThanOrEqual(4);
  });
  it("debug badges green", () => {
    expect(debug.validation.schemaValid).toBe(true);
    expect(debug.validation.pantryCapped).toBe(true);
    expect(debug.validation.metricsRecomputed).toBe(true);
  });
});

describe("Smoke Test 3: Over-limit pantry", () => {
  const plan = generatePlan({ budget: "50", meals: "5", dietary: [], cuisines: [], pantryItems: ["1 eggs"], preference: "balanced", mealCounts: { breakfast: 3, lunch: 0, dinner: 2, snack: 0 } });
  const debug = (plan as any).__debugInfo;
  const eggUsage = plan.meals.flatMap(m => m.ingredients)
    .filter(i => i.normalizedName === "egg" || i.normalizedName === "eggs")
    .reduce((s, i) => s + i.qty, 0);

  it("generates meals", () => expect(plan.meals.length).toBe(5));
  it("pantry eggs capped at 1", () => {
    const pe = plan.pantryItems.find(i => i.normalizedName === "egg" || i.normalizedName === "eggs");
    if (pe) expect(pe.qty).toBeLessThanOrEqual(1);
  });
  it("excess eggs in shopping if usage > 1", () => {
    if (eggUsage > 1) {
      const shopEgg = allShopItems(plan).find(i => i.normalizedName === "egg" || i.normalizedName === "eggs");
      expect(shopEgg).toBeTruthy();
      expect(shopEgg!.qty).toBe(eggUsage - 1);
    }
  });
  it("debug badges green", () => {
    expect(debug.validation.schemaValid).toBe(true);
    expect(debug.validation.pantryCapped).toBe(true);
    expect(debug.validation.metricsRecomputed).toBe(true);
  });
});

describe("Smoke Test 4: No pantry stock", () => {
  const plan = generatePlan({ budget: "50", meals: "2", dietary: [], cuisines: [], pantryItems: [], preference: "balanced", mealCounts: { breakfast: 0, lunch: 1, dinner: 1, snack: 0 } });
  const debug = (plan as any).__debugInfo;

  it("generates meals", () => expect(plan.meals.length).toBe(2));
  it("pantry empty", () => expect(plan.pantryItems.length).toBe(0));
  it("debug badges green", () => {
    expect(debug.validation.schemaValid).toBe(true);
    expect(debug.validation.pantryCapped).toBe(true);
    expect(debug.validation.metricsRecomputed).toBe(true);
  });
});

describe("Smoke Test 5: Very low budget ($10)", () => {
  const plan = generatePlan({ budget: "10", meals: "3", dietary: [], cuisines: [], pantryItems: ["12 eggs", "5 cups rice"], preference: "balanced", mealCounts: { breakfast: 1, lunch: 1, dinner: 1, snack: 0 } });
  const debug = (plan as any).__debugInfo;

  it("generates meals", () => expect(plan.meals.length).toBe(3));
  it("metrics are numbers", () => {
    expect(plan.metrics.costLow).not.toBeNaN();
    expect(plan.metrics.costHigh).not.toBeNaN();
    expect(plan.metrics.budget).toBe(10);
  });
  it("budget math works", () => {
    expect(plan.metrics.budget - plan.metrics.costHigh).not.toBeNaN();
  });
  it("debug badges green", () => {
    expect(debug.validation.schemaValid).toBe(true);
    expect(debug.validation.pantryCapped).toBe(true);
    expect(debug.validation.metricsRecomputed).toBe(true);
  });
});
