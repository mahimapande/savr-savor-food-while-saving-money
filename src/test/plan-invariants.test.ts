/**
 * Regression suite for plan invariant assertions.
 * Covers four bugs discovered during the 9-scenario regression run:
 *   1. Pantry item without qty must be treated as finite (default cap).
 *   2. Multi-meal pantry cap enforcement (aggregate qty across all meals).
 *   3. Cuisine label casing — model output normalized back to allowed labels.
 *   4. Allergy derivative scan — parmesan/butter/whey for "dairy", mayo for "eggs", etc.
 */

import { describe, it, expect } from "vitest";
import { assertPlanInvariants, DEFAULT_PANTRY_CAP } from "@/services/planInvariants";
import type { PlanData, Meal, Ingredient, ShoppingList } from "@/data/mockData";

// ---------------------------------------------------------------------------
// Helpers — build a minimal valid PlanData fixture
// ---------------------------------------------------------------------------
function ing(opts: Partial<Ingredient> & { name: string; normalizedName: string; qty: number }): Ingredient {
  return {
    name: opts.name,
    normalizedName: opts.normalizedName,
    qty: opts.qty,
    unit: opts.unit ?? "each",
    originalQtyString: opts.originalQtyString ?? `${opts.qty}`,
    source: opts.source ?? "grocery",
    cost: opts.cost ?? 0,
  };
}

function meal(opts: Partial<Meal> & { id: string; ingredients: Ingredient[] }): Meal {
  return {
    id: opts.id,
    name: opts.name ?? opts.id,
    day: opts.day ?? "Mon",
    mealType: opts.mealType ?? "dinner",
    duration: opts.duration ?? "20 min",
    prepTimeMinutes: opts.prepTimeMinutes ?? 20,
    servings: opts.servings ?? 2,
    tags: opts.tags ?? [],
    cuisineTags: opts.cuisineTags ?? [],
    dietaryTags: opts.dietaryTags ?? [],
    reuseBadges: opts.reuseBadges ?? [],
    estimatedCost: opts.estimatedCost ?? "$5",
    ingredients: opts.ingredients,
    instructions: opts.instructions ?? [],
    steps: opts.steps ?? [],
    cooked: false,
  };
}

const emptyShop: ShoppingList = {
  produce: [], dairy: [], plantBased: [], dryGoods: [], spicesCondiments: [],
  totalItems: 0, estimatedCost: "$0",
};

function plan(meals: Meal[], extra: Partial<PlanData> = {}): PlanData {
  return {
    metrics: {
      totalMeals: meals.length,
      mealCounts: { breakfast: 0, lunch: 0, dinner: meals.length, snack: 0 },
      costRange: "$0–$0",
      costLow: 0,
      costHigh: 0,
      reuseScore: "0%",
      budget: 60,
      ingredientReusePercent: 0,
    },
    meals,
    shoppingList: extra.shoppingList ?? emptyShop,
    pantryItems: extra.pantryItems ?? [],
  };
}

// ---------------------------------------------------------------------------
// 1. Pantry item without qty — finite default cap
// ---------------------------------------------------------------------------
describe("Invariant: pantry item without qty is treated as finite", () => {
  it("flags violation when qty-less pantry item is used beyond DEFAULT_PANTRY_CAP", () => {
    const meals = Array.from({ length: 5 }, (_, i) =>
      meal({
        id: `m${i}`,
        ingredients: [ing({ name: "1 tbsp olive oil", normalizedName: "olive oil", qty: 1, unit: "tbsp", source: "pantry" })],
      })
    );
    const report = assertPlanInvariants(plan(meals), {
      pantryInputs: ["olive oil"], // no qty
      allergies: [],
      selectedCuisines: [],
    });
    // Total used = 5, default cap = DEFAULT_PANTRY_CAP (2)
    expect(report.effectivePantryCaps["olive oil"]?.usedDefault).toBe(true);
    expect(report.effectivePantryCaps["olive oil"]?.cap).toBe(DEFAULT_PANTRY_CAP);
    expect(report.ok).toBe(false);
    expect(report.violations.some(v => v.code === "pantry-no-qty-default-exceeded")).toBe(true);
  });

  it("passes when qty-less pantry item is used within DEFAULT_PANTRY_CAP", () => {
    const m = meal({
      id: "m1",
      ingredients: [ing({ name: "olive oil", normalizedName: "olive oil", qty: 1, unit: "tbsp", source: "pantry" })],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: ["olive oil"],
      allergies: [],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "pantry-no-qty-default-exceeded")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-meal pantry cap enforcement
// ---------------------------------------------------------------------------
describe("Invariant: multi-meal pantry cap enforcement", () => {
  it("flags violation when egg usage across meals exceeds pantry cap of 2", () => {
    const meals = [
      meal({ id: "b1", mealType: "breakfast", ingredients: [ing({ name: "2 eggs", normalizedName: "egg", qty: 2, source: "pantry" })] }),
      meal({ id: "b2", mealType: "breakfast", ingredients: [ing({ name: "1 egg", normalizedName: "egg", qty: 1, source: "pantry" })] }),
    ];
    const report = assertPlanInvariants(plan(meals), {
      pantryInputs: ["2 eggs"],
      allergies: [],
      selectedCuisines: [],
    });
    expect(report.ok).toBe(false);
    const v = report.violations.find(x => x.code === "pantry-cap-exceeded");
    expect(v).toBeDefined();
    expect(v?.details?.used).toBe(3);
    expect(v?.details?.cap).toBe(2);
  });

  it("passes when total egg usage stays within cap", () => {
    const meals = [
      meal({ id: "b1", ingredients: [ing({ name: "2 eggs", normalizedName: "egg", qty: 2, source: "pantry" })] }),
    ];
    const report = assertPlanInvariants(plan(meals), {
      pantryInputs: ["2 eggs"],
      allergies: [],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "pantry-cap-exceeded")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Cuisine label casing normalization
// ---------------------------------------------------------------------------
describe("Invariant: cuisine label casing normalization", () => {
  it("normalizes lowercase 'american' back to 'American'", () => {
    const m = meal({
      id: "m1",
      ingredients: [],
      cuisineTags: ["american", "ITALIAN"],
    });
    const p = plan([m]);
    const report = assertPlanInvariants(p, {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: ["American", "Italian"],
    });
    expect(p.meals[0].cuisineTags).toEqual(["American", "Italian"]);
    expect(report.violations.filter(v => v.code === "cuisine-label-unknown")).toHaveLength(0);
  });

  it("flags unknown cuisine labels", () => {
    const m = meal({
      id: "m1",
      ingredients: [],
      cuisineTags: ["Martian"],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: ["Italian"],
    });
    expect(report.violations.some(v => v.code === "cuisine-label-unknown")).toBe(true);
  });

  it("normalizes all-lowercase tags from the model (S3 regression)", () => {
    const meals = [
      meal({ id: "m1", name: "Pasta", ingredients: [], cuisineTags: ["italian"] }),
      meal({ id: "m2", name: "Curry", ingredients: [], cuisineTags: ["thai"] }),
    ];
    const p = plan(meals);
    const report = assertPlanInvariants(p, {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: ["Italian", "Thai", "American"],
    });
    expect(p.meals[0].cuisineTags).toEqual(["Italian"]);
    expect(p.meals[1].cuisineTags).toEqual(["Thai"]);
    expect(report.violations.filter(v => v.code === "cuisine-label-unknown")).toHaveLength(0);
    expect(report.violations.filter(v => v.code === "cuisine-tag-empty")).toHaveLength(0);
  });

  it("flags + auto-fills meals with empty cuisineTags when cuisines are selected (S2 regression)", () => {
    const meals = [
      meal({ id: "m1", name: "Pasta", ingredients: [], cuisineTags: ["Italian"] }),
      meal({ id: "m2", name: "Chicken Fajitas", ingredients: [], cuisineTags: [] }),
    ];
    const p = plan(meals);
    const report = assertPlanInvariants(p, {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: ["Italian", "Thai", "American"],
    });
    const emptyViol = report.violations.find(v => v.code === "cuisine-tag-empty");
    expect(emptyViol).toBeDefined();
    expect(emptyViol?.details?.meal).toBe("Chicken Fajitas");
    expect(p.meals[1].cuisineTags).toEqual(["Italian"]);
  });

  it("does NOT flag empty cuisineTags when no cuisines selected", () => {
    const m = meal({ id: "m1", ingredients: [], cuisineTags: [] });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "cuisine-tag-empty")).toHaveLength(0);
  });

  it("tracks unknown cuisine tags in the report", () => {
    const m = meal({ id: "m1", name: "Mystery", ingredients: [], cuisineTags: ["Martian"] });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: [],
      selectedCuisines: ["Italian"],
    });
    expect(report.unknownCuisineTags).toEqual([{ meal: "Mystery", tag: "Martian" }]);
  });
});

// ---------------------------------------------------------------------------
// 4. Allergy derivative scan
// ---------------------------------------------------------------------------
describe("Invariant: allergy derivative scan", () => {
  it("detects parmesan when 'dairy' is an allergy", () => {
    const m = meal({
      id: "m1",
      ingredients: [ing({ name: "1/4 cup parmesan", normalizedName: "parmesan", qty: 0.25, unit: "cup" })],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: ["dairy"],
      selectedCuisines: [],
    });
    expect(report.ok).toBe(false);
    expect(report.violations.some(v => v.code === "allergy-derivative-detected")).toBe(true);
  });

  it("detects mayo when 'eggs' is an allergy", () => {
    const m = meal({
      id: "m1",
      ingredients: [ing({ name: "2 tbsp mayo", normalizedName: "mayonnaise", qty: 2, unit: "tbsp" })],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: ["eggs"],
      selectedCuisines: [],
    });
    expect(report.violations.some(v => v.code === "allergy-derivative-detected")).toBe(true);
  });

  it("detects butter when 'dairy' is an allergy", () => {
    const m = meal({
      id: "m1",
      ingredients: [ing({ name: "1 tbsp butter", normalizedName: "butter", qty: 1, unit: "tbsp" })],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: ["dairy"],
      selectedCuisines: [],
    });
    expect(report.violations.some(v => v.code === "allergy-derivative-detected")).toBe(true);
  });

  it("passes when no derivatives are present", () => {
    const m = meal({
      id: "m1",
      ingredients: [ing({ name: "1 cup rice", normalizedName: "rice", qty: 1, unit: "cup" })],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: ["dairy", "eggs"],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "allergy-derivative-detected")).toHaveLength(0);
  });

  it("does NOT flag coconut milk as dairy (S3 regression)", () => {
    const m = meal({
      id: "curry",
      name: "Vegetable Curry",
      ingredients: [
        ing({ name: "1 can coconut milk", normalizedName: "coconut milk", qty: 1, unit: "can" }),
        ing({ name: "1 cup rice", normalizedName: "rice", qty: 1, unit: "cup" }),
      ],
    });
    const report = assertPlanInvariants(plan([m]), {
      pantryInputs: [],
      allergies: ["dairy", "eggs", "peanuts"],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "allergy-derivative-detected")).toHaveLength(0);
  });

  it("does NOT flag almond/soy/oat milk as dairy", () => {
    const meals = [
      meal({ id: "m1", ingredients: [ing({ name: "almond milk", normalizedName: "almond milk", qty: 1, unit: "cup" })] }),
      meal({ id: "m2", ingredients: [ing({ name: "soy milk", normalizedName: "soy milk", qty: 1, unit: "cup" })] }),
      meal({ id: "m3", ingredients: [ing({ name: "oat milk", normalizedName: "oat milk", qty: 1, unit: "cup" })] }),
    ];
    const report = assertPlanInvariants(plan(meals), {
      pantryInputs: [],
      allergies: ["dairy"],
      selectedCuisines: [],
    });
    expect(report.violations.filter(v => v.code === "allergy-derivative-detected")).toHaveLength(0);
  });

  it("still flags real dairy terms (whole milk, cheese, butter, whey)", () => {
    const cases = [
      { name: "1 cup whole milk", normalized: "milk" },
      { name: "1/2 cup cheese", normalized: "cheese" },
      { name: "1 tbsp butter", normalized: "butter" },
      { name: "1 scoop whey protein", normalized: "whey" },
    ];
    for (const c of cases) {
      const m = meal({
        id: c.normalized,
        ingredients: [ing({ name: c.name, normalizedName: c.normalized, qty: 1, unit: "cup" })],
      });
      const report = assertPlanInvariants(plan([m]), {
        pantryInputs: [],
        allergies: ["dairy"],
        selectedCuisines: [],
      });
      expect(
        report.violations.some(v => v.code === "allergy-derivative-detected"),
        `expected violation for ${c.name}`
      ).toBe(true);
    }
  });
});
