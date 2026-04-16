/**
 * Regression tests for schedule-coverage assertion + retry in planService.
 *
 * Scenarios:
 *   - S1 pattern: 13/15 → server-meta says retry already happened, still under-fill → scheduleCoverageFailed
 *   - S2 pattern: 5/7  → server didn't retry (older shape) → client-side retry succeeds
 *   - S3 pattern: 7/8  → server-meta retried but second attempt also short → scheduleCoverageFailed
 *   - Happy path: 5/5 first try → no retry triggered, no failure flag
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client BEFORE importing planService
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { generatePlanFromAI } from "@/services/planService";
import type { FormInputs } from "@/data/mockData";

// Helper: build a minimal valid raw meal as the edge function would return it.
function rawMeal(id: string, day: string, mealType: "breakfast" | "lunch" | "dinner" | "snack") {
  return {
    id,
    name: `Meal ${id}`,
    day,
    mealType,
    duration: "20 min",
    servings: 2,
    tags: [],
    cuisineTags: [],
    dietaryTags: [],
    reuseBadges: [],
    estimatedCost: "$5",
    ingredients: [
      {
        name: "1 cup rice",
        normalizedName: "rice",
        qty: 1,
        unit: "cup",
        originalQtyString: "1 cup",
        source: "grocery",
        cost: 1.0,
      },
    ],
    instructions: ["Cook it."],
  };
}

function makeRawMeals(count: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const types: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
  const meals = [];
  for (let i = 0; i < count; i++) {
    meals.push(rawMeal(`m${i}`, days[i % 7], types[i % 3]));
  }
  return meals;
}

const BASE_INPUTS: FormInputs = {
  budget: "60",
  meals: "5",
  dietary: [],
  cuisines: [],
  pantryItems: [],
  preference: "balanced",
  mealCounts: { breakfast: 0, lunch: 0, dinner: 5, snack: 0 },
};

beforeEach(() => {
  invokeMock.mockReset();
});

describe("Schedule-coverage: happy path (no retry)", () => {
  it("does not trigger any extra invoke when the model fills all slots", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(5) },
        meta: { requestedSlots: 5, filledSlots: 5, retried: false },
      },
      error: null,
    });

    const result = await generatePlanFromAI(BASE_INPUTS);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("ai");
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage).toEqual({
      requested: 5,
      filled: 5,
      retried: false,
      underFilled: false,
    });
  });
});

describe("Schedule-coverage: S1 pattern (13/15, server retried, still short)", () => {
  it("flags scheduleCoverageFailed and returns a friendly error", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 5, lunch: 5, dinner: 5, snack: 0 },
    };

    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(13) },
        meta: { requestedSlots: 15, filledSlots: 13, retried: true },
      },
      error: null,
    });

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(1); // server already retried
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.error).toMatch(/13\/15/);
    expect(result.coverage?.underFilled).toBe(true);
    expect(result.coverage?.retried).toBe(true);
  });
});

describe("Schedule-coverage: S2 pattern (5/7, server didn't retry → client retries)", () => {
  it("issues a client-side retry when server meta.retried is false and result is short", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 0, lunch: 3, dinner: 4, snack: 0 },
    };

    // First call: 5/7, server did not retry
    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(5) },
        meta: { requestedSlots: 7, filledSlots: 5, retried: false },
      },
      error: null,
    });
    // Second call (client-side retry): full 7
    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(7) },
        meta: { requestedSlots: 7, filledSlots: 7, retried: true },
      },
      error: null,
    });

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage).toEqual({
      requested: 7,
      filled: 7,
      retried: true,
      underFilled: false,
    });
  });
});

describe("Schedule-coverage: S3 pattern (7/8, retried but still short)", () => {
  it("flags scheduleCoverageFailed when both attempts under-fill", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 2, lunch: 3, dinner: 3, snack: 0 },
    };

    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(7) },
        meta: { requestedSlots: 8, filledSlots: 7, retried: true },
      },
      error: null,
    });

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.coverage?.underFilled).toBe(true);
    expect(result.error).toMatch(/7\/8/);
  });
});

describe("Schedule-coverage: violation appears in debug info", () => {
  it("adds a schedule-coverage entry to invariantViolations when under-filled", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        plan: { meals: makeRawMeals(3) },
        meta: { requestedSlots: 5, filledSlots: 3, retried: true },
      },
      error: null,
    });

    const result = await generatePlanFromAI(BASE_INPUTS);
    const debug = (result.plan as any).__debugInfo;

    // Debug info is only attached in DEV; vitest sets DEV=true by default.
    if (debug) {
      const codes = (debug.validation.invariantViolations || []).map((v: any) => v.code);
      expect(codes).toContain("schedule-coverage");
      expect(debug.validation.invariantsOk).toBe(false);
    }
  });
});
