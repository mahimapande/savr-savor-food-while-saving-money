import { describe, it, expect } from "vitest";
import {
  generatePlan,
  FormInputs,
  sanitizeIngredient,
  sanitizeShoppingItem,
  validatePlanData,
  buildStructuredIngredient,
  categorizeItem,
} from "@/data/mockData";

// ---------------------------------------------------------------------------
// Fixture: a basic form input
// ---------------------------------------------------------------------------
const BASE_INPUTS: FormInputs = {
  budget: "50",
  meals: "3",
  dietary: [],
  cuisines: [],
  pantryItems: ["olive oil", "rice", "soy sauce"],
  preference: "balanced",
  mealCounts: { breakfast: 1, lunch: 1, dinner: 2, snack: 1 },
};

// ---------------------------------------------------------------------------
// 1. Pantry vs grocery split
// ---------------------------------------------------------------------------
describe("Pantry vs grocery split", () => {
  it("marks ingredients matching pantry items as source=pantry", () => {
    const plan = generatePlan(BASE_INPUTS);
    const allIngredients = plan.meals.flatMap((m) => m.ingredients);
    const pantryIngs = allIngredients.filter((i) => i.source === "pantry");
    const groceryIngs = allIngredients.filter((i) => i.source === "grocery");

    expect(pantryIngs.length).toBeGreaterThan(0);
    expect(groceryIngs.length).toBeGreaterThan(0);

    // Pantry ingredients should match at least one pantry input
    for (const ing of pantryIngs) {
      const matchesPantry = BASE_INPUTS.pantryItems.some((p) =>
        ing.name.toLowerCase().includes(p.toLowerCase())
      );
      expect(matchesPantry).toBe(true);
    }
  });

  it("does not include pantry-sourced ingredients in shopping list", () => {
    const plan = generatePlan(BASE_INPUTS);
    const allShopNames = [
      ...plan.shoppingList.produce,
      ...plan.shoppingList.dairy,
      ...plan.shoppingList.plantBased,
      ...plan.shoppingList.dryGoods,
      ...plan.shoppingList.spicesCondiments,
    ].map((i) => i.name.toLowerCase());

    // None of the shopping items should be pure pantry staples
    for (const pantryItem of BASE_INPUTS.pantryItems) {
      const isInShop = allShopNames.some((n) => n === pantryItem.toLowerCase());
      // The raw pantry name itself shouldn't appear as a standalone shopping item
      expect(isInShop).toBe(false);
    }
  });

  it("generates pantryItems list with accumulated costs", () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.pantryItems.length).toBe(BASE_INPUTS.pantryItems.length);
    for (const item of plan.pantryItems) {
      expect(typeof item.cost).toBe("number");
      expect(typeof item.costLikely).toBe("number");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Shopping list consolidation (via structured fields)
// ---------------------------------------------------------------------------
describe("Shopping list structure", () => {
  it("every shopping item has required structured fields", () => {
    const plan = generatePlan(BASE_INPUTS);
    const allItems = [
      ...plan.shoppingList.produce,
      ...plan.shoppingList.dairy,
      ...plan.shoppingList.plantBased,
      ...plan.shoppingList.dryGoods,
      ...plan.shoppingList.spicesCondiments,
    ];

    for (const item of allItems) {
      expect(item.name).toBeTruthy();
      expect(item.normalizedName).toBeTruthy();
      expect(typeof item.qty).toBe("number");
      expect(item.qty).toBeGreaterThan(0);
      expect(typeof item.unit).toBe("string");
      expect(typeof item.cost).toBe("number");
      expect(typeof item.costMin).toBe("number");
      expect(typeof item.costMax).toBe("number");
      expect(typeof item.costLikely).toBe("number");
      expect(item.costMin).toBeLessThanOrEqual(item.costLikely);
      expect(item.costLikely).toBeLessThanOrEqual(item.costMax);
    }
  });

  it("categorizeItem returns valid categories", () => {
    expect(categorizeItem("olive oil")).toBe("spicesCondiments");
    expect(categorizeItem("1 can chickpeas")).toBe("dryGoods");
    expect(categorizeItem("1 ripe avocado")).toBe("produce");
    expect(categorizeItem("cheddar cheese")).toBe("dairy");
    expect(categorizeItem("firm tofu")).toBe("plantBased");
  });
});

// ---------------------------------------------------------------------------
// 3. Summary card calculations
// ---------------------------------------------------------------------------
describe("Summary metrics", () => {
  it("totalMeals equals sum of mealCounts", () => {
    const plan = generatePlan(BASE_INPUTS);
    const { mealCounts, totalMeals } = plan.metrics;
    expect(totalMeals).toBe(
      mealCounts.breakfast + mealCounts.lunch + mealCounts.dinner + mealCounts.snack
    );
  });

  it("costLow <= costHigh", () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.metrics.costLow).toBeLessThanOrEqual(plan.metrics.costHigh);
  });

  it("costLow/costHigh derive from item-level min/max", () => {
    const plan = generatePlan(BASE_INPUTS);
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

  it("ingredientReusePercent is between 0 and 100", () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.metrics.ingredientReusePercent).toBeGreaterThanOrEqual(0);
    expect(plan.metrics.ingredientReusePercent).toBeLessThanOrEqual(100);
  });

  it("budget matches input", () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.metrics.budget).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 4. Ingredient reuse
// ---------------------------------------------------------------------------
describe("Ingredient reuse", () => {
  it("reuse percent is > 0 when multiple meals share ingredients", () => {
    const plan = generatePlan({
      ...BASE_INPUTS,
      mealCounts: { breakfast: 0, lunch: 2, dinner: 3, snack: 0 },
    });
    // With 5 meals, there should be some shared ingredients
    expect(plan.metrics.ingredientReusePercent).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Budget left (computed in Plan.tsx, but we verify the data supports it)
// ---------------------------------------------------------------------------
describe("Budget left derivability", () => {
  it("budget minus costHigh and costLow are computable", () => {
    const plan = generatePlan(BASE_INPUTS);
    const budgetLeftMin = plan.metrics.budget - plan.metrics.costHigh;
    const budgetLeftMax = plan.metrics.budget - plan.metrics.costLow;
    expect(typeof budgetLeftMin).toBe("number");
    expect(typeof budgetLeftMax).toBe("number");
    expect(budgetLeftMax).toBeGreaterThanOrEqual(budgetLeftMin);
  });
});

// ---------------------------------------------------------------------------
// 6. Sanitization / validation fallbacks
// ---------------------------------------------------------------------------
describe("sanitizeIngredient", () => {
  it("fills missing structured fields from parser", () => {
    const result = sanitizeIngredient({ name: "2 cups spinach" });
    expect(result.normalizedName).toBe("spinach");
    expect(result.qty).toBe(2);
    expect(result.unit).toBe("cup");
    expect(result.source).toBe("grocery");
    expect(typeof result.cost).toBe("number");
  });

  it("handles completely bare ingredient name", () => {
    const result = sanitizeIngredient({ name: "mystery spice" });
    expect(result.name).toBe("mystery spice");
    expect(result.normalizedName).toBeTruthy();
    expect(result.qty).toBe(1);
    expect(result.source).toBe("grocery");
    expect(result.cost).toBeGreaterThan(0);
  });

  it("preserves valid fields when present", () => {
    const result = sanitizeIngredient({
      name: "1 can chickpeas",
      normalizedName: "chickpeas",
      qty: 1,
      unit: "can",
      source: "pantry",
      cost: 0.89,
    });
    expect(result.normalizedName).toBe("chickpeas");
    expect(result.source).toBe("pantry");
    expect(result.cost).toBe(0.89);
  });

  it("rejects invalid cost (NaN/Infinity)", () => {
    const result = sanitizeIngredient({ name: "1 cup rice", cost: NaN });
    expect(isFinite(result.cost)).toBe(true);
    expect(result.cost).toBeGreaterThan(0);
  });
});

describe("sanitizeShoppingItem", () => {
  it("derives min/max/likely from cost when missing", () => {
    const result = sanitizeShoppingItem({ name: "1 can black beans", cost: 0.79 });
    expect(result.costMin).toBeLessThanOrEqual(result.costLikely);
    expect(result.costLikely).toBeLessThanOrEqual(result.costMax);
    expect(result.normalizedName).toBeTruthy();
  });
});

describe("validatePlanData", () => {
  it("sanitizes all nested data in a generated plan", () => {
    const plan = generatePlan(BASE_INPUTS);
    const validated = validatePlanData(plan);

    // All meals should have valid structured ingredients
    for (const meal of validated.meals) {
      expect(meal.prepTimeMinutes).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(meal.cuisineTags)).toBe(true);
      expect(Array.isArray(meal.dietaryTags)).toBe(true);
      expect(meal.instructions.length).toBeGreaterThan(0);
      for (const ing of meal.ingredients) {
        expect(ing.normalizedName).toBeTruthy();
        expect(ing.source === "pantry" || ing.source === "grocery").toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Meal structure
// ---------------------------------------------------------------------------
describe("Meal structure", () => {
  it("every meal has all required fields", () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const meal of plan.meals) {
      expect(meal.id).toBeTruthy();
      expect(meal.day).toBeTruthy();
      expect(meal.name).toBeTruthy();
      expect(typeof meal.prepTimeMinutes).toBe("number");
      expect(meal.mealType).toMatch(/^(breakfast|lunch|dinner|snack)$/);
      expect(meal.servings).toBeGreaterThan(0);
      expect(Array.isArray(meal.cuisineTags)).toBe(true);
      expect(meal.cuisineTags.length).toBeGreaterThan(0);
      expect(Array.isArray(meal.instructions)).toBe(true);
      expect(meal.instructions.length).toBeGreaterThan(0);
      expect(meal.ingredients.length).toBeGreaterThan(0);
    }
  });
});
