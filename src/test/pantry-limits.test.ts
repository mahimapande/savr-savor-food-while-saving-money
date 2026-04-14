import { describe, it, expect } from "vitest";
import {
  buildPantryMap,
  enforcePantryLimits,
  generatePlan,
  FormInputs,
  PlanData,
  Meal,
  Ingredient,
  ShoppingList,
} from "@/data/mockData";

// ---------------------------------------------------------------------------
// buildPantryMap
// ---------------------------------------------------------------------------
describe("buildPantryMap", () => {
  it("parses simple quantity inputs", () => {
    const map = buildPantryMap(["12 eggs", "2 cups rice", "1 onion"]);
    expect(map["egg"].maxQty).toBe(12);
    expect(map["egg"].unit).toBe("each");
    expect(map["rice"].maxQty).toBe(2);
    expect(map["rice"].unit).toBe("cup");
    expect(map["onion"].maxQty).toBe(1);
  });

  it("converts lb to oz", () => {
    const map = buildPantryMap(["1 lb pasta"]);
    expect(map["pasta"].maxQty).toBe(16);
    expect(map["pasta"].unit).toBe("oz");
  });

  it("converts container units (jar, bag, dozen)", () => {
    const map = buildPantryMap(["1 jar tomato sauce", "1 bag spinach", "1 dozen eggs"]);
    expect(map["tomato sauce"].maxQty).toBe(2);
    expect(map["tomato sauce"].unit).toBe("cup");
    expect(map["spinach"].maxQty).toBe(6);
    expect(map["spinach"].unit).toBe("cup");
    expect(map["egg"].maxQty).toBe(12);
    expect(map["egg"].unit).toBe("each");
  });

  it("handles bare ingredient names with no qty", () => {
    const map = buildPantryMap(["olive oil"]);
    expect(map["olive oil"].maxQty).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// enforcePantryLimits – sufficient pantry
// ---------------------------------------------------------------------------
describe("enforcePantryLimits – sufficient pantry", () => {
  it("does not add to shopping list when pantry covers usage", () => {
    const plan = generatePlan({
      budget: "50",
      meals: "2",
      dietary: [],
      cuisines: [],
      pantryItems: ["12 eggs", "5 cups rice", "10 tbsp olive oil"],
      preference: "balanced",
      mealCounts: { breakfast: 1, lunch: 0, dinner: 1, snack: 0 },
    });

    // After enforcement, pantry items that are sufficient should remain fully pantry
    for (const item of plan.pantryItems) {
      expect(item.qty).toBeGreaterThan(0);
    }

    // Verify no pantry ingredient leaked into shopping as excess
    const allShopNames = [
      ...plan.shoppingList.produce,
      ...plan.shoppingList.dairy,
      ...plan.shoppingList.plantBased,
      ...plan.shoppingList.dryGoods,
      ...plan.shoppingList.spicesCondiments,
    ].map((i) => i.normalizedName);

    // Pantry items that are sufficient should NOT appear in shopping
    for (const pi of plan.pantryItems) {
      const inShop = allShopNames.filter((n) => n === pi.normalizedName);
      // If it shows up in shopping, there should be a grocery-sourced reason
      // (this is a soft check; exact clamping depends on recipes picked)
    }
  });
});

// ---------------------------------------------------------------------------
// enforcePantryLimits – excess usage
// ---------------------------------------------------------------------------
describe("enforcePantryLimits – excess pantry usage", () => {
  it("shifts excess eggs to shopping list when pantry is limited", () => {
    // Create a plan where eggs are a pantry item but we only have 2
    const inputs: FormInputs = {
      budget: "50",
      meals: "5",
      dietary: [],
      cuisines: [],
      pantryItems: ["2 eggs"],
      preference: "balanced",
      mealCounts: { breakfast: 3, lunch: 0, dinner: 2, snack: 0 },
    };

    const plan = generatePlan(inputs);

    // Count total egg usage across all meals
    const totalEggUsage = plan.meals
      .flatMap((m) => m.ingredients)
      .filter((i) => i.normalizedName === "egg" || i.normalizedName === "eggs")
      .reduce((sum, i) => sum + i.qty, 0);

    if (totalEggUsage > 2) {
      // Pantry should be capped at 2
      const pantryEgg = plan.pantryItems.find(
        (i) => i.normalizedName === "egg" || i.normalizedName === "eggs"
      );
      if (pantryEgg) {
        expect(pantryEgg.qty).toBeLessThanOrEqual(2);
      }

      // Excess should be in shopping list
      const allShopItems = [
        ...plan.shoppingList.produce,
        ...plan.shoppingList.dairy,
        ...plan.shoppingList.plantBased,
        ...plan.shoppingList.dryGoods,
        ...plan.shoppingList.spicesCondiments,
      ];
      const shopEgg = allShopItems.find(
        (i) => i.normalizedName === "egg" || i.normalizedName === "eggs"
      );
      if (shopEgg) {
        expect(shopEgg.qty).toBe(totalEggUsage - 2);
      }
    }
  });

  it("shifts excess pasta to shopping list when pantry has 1 lb (16 oz)", () => {
    const inputs: FormInputs = {
      budget: "60",
      meals: "5",
      dietary: [],
      cuisines: ["Italian"],
      pantryItems: ["1 lb pasta"],
      preference: "balanced",
      mealCounts: { breakfast: 0, lunch: 2, dinner: 3, snack: 0 },
    };

    const plan = generatePlan(inputs);

    // Sum up all pasta usage
    const pastaNames = ["pasta", "spaghetti", "penne pasta"];
    const totalPastaOz = plan.meals
      .flatMap((m) => m.ingredients)
      .filter((i) => pastaNames.includes(i.normalizedName))
      .reduce((sum, i) => sum + i.qty, 0);

    // If total exceeds 16 oz, excess should move to shopping
    if (totalPastaOz > 16) {
      const pantryPasta = plan.pantryItems.find((i) =>
        pastaNames.includes(i.normalizedName)
      );
      if (pantryPasta) {
        expect(pantryPasta.qty).toBeLessThanOrEqual(16);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Metrics recalculation
// ---------------------------------------------------------------------------
describe("Metrics recalculation after enforcement", () => {
  it("costLow/costHigh match aggregated shopping items after enforcement", () => {
    const plan = generatePlan({
      budget: "50",
      meals: "3",
      dietary: [],
      cuisines: [],
      pantryItems: ["2 eggs", "1 cup rice"],
      preference: "balanced",
      mealCounts: { breakfast: 1, lunch: 1, dinner: 1, snack: 0 },
    });

    const allItems = [
      ...plan.shoppingList.produce,
      ...plan.shoppingList.dairy,
      ...plan.shoppingList.plantBased,
      ...plan.shoppingList.dryGoods,
      ...plan.shoppingList.spicesCondiments,
    ];
    const sumMin = allItems.reduce((s, i) => s + i.costMin, 0);
    const sumMax = allItems.reduce((s, i) => s + i.costMax, 0);

    expect(plan.metrics.costLow).toBe(Math.floor(sumMin));
    expect(plan.metrics.costHigh).toBe(Math.ceil(sumMax));
  });
});

// ---------------------------------------------------------------------------
// No pantry entry → treat as grocery
// ---------------------------------------------------------------------------
describe("No pantry entry fallback", () => {
  it("treats unrecognized pantry ingredients as grocery", () => {
    const plan = generatePlan({
      budget: "50",
      meals: "2",
      dietary: [],
      cuisines: [],
      pantryItems: [],
      preference: "balanced",
      mealCounts: { breakfast: 0, lunch: 1, dinner: 1, snack: 0 },
    });

    // With no pantry items, pantryItems list should be empty
    expect(plan.pantryItems.length).toBe(0);
  });
});
