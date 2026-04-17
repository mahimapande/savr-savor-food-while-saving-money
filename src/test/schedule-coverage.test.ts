/**
 * Regression tests for the hybrid schedule-coverage retry policy in planService.
 *
 * Hybrid policy:
 *   - Always make 1 initial attempt.
 *   - If under-filled and requestedSlots ∈ [6, 10] → up to 2 retries.
 *   - Otherwise → 1 retry only.
 *   - Stop early as soon as any attempt reaches full coverage.
 *
 * Scenarios covered:
 *   - Happy path: full fill on first try → no retry.
 *   - S2 pattern (7 slots): first retry recovers → success.
 *   - S3 pattern (8 slots): both retries fail → scheduleCoverageFailed.
 *   - Hybrid recovery: 6/8 → 7/8 → 8/8 succeeds on second retry.
 *   - 6/7 pattern recovers on second retry.
 *   - Early stop: first retry fills → no second retry call.
 *   - Outside hybrid range:
 *       - 5 slots: only 1 retry, then fail.
 *       - 12 slots: only 1 retry, then fail.
 *       - 15 slots (S1): only 1 retry, then fail.
 *   - Debug info contains schedule-coverage violation when under-filled.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

function mockResponse(filled: number, requested: number, retried = true) {
  return {
    data: {
      plan: { meals: makeRawMeals(filled) },
      meta: { requestedSlots: requested, filledSlots: filled, retried },
    },
    error: null,
  };
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

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe("Schedule-coverage: happy path (no retry)", () => {
  it("does not trigger any extra invoke when the model fills all slots", async () => {
    invokeMock.mockResolvedValueOnce(mockResponse(5, 5, false));

    const result = await generatePlanFromAI(BASE_INPUTS);

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("ai");
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage).toEqual({
      requested: 5,
      filled: 5,
      retried: false,
      underFilled: false,
      retryCount: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// In-range hybrid retries (6–10 slots)
// ---------------------------------------------------------------------------
describe("Hybrid retry: medium plans (6–10 slots) get up to 2 retries", () => {
  const mediumInputs: FormInputs = {
    ...BASE_INPUTS,
    mealCounts: { breakfast: 2, lunch: 3, dinner: 3, snack: 0 }, // 8 slots
  };

  it("S2 pattern (5/7): first retry recovers → no second retry", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 0, lunch: 3, dinner: 4, snack: 0 },
    };
    invokeMock
      .mockResolvedValueOnce(mockResponse(5, 7, false))
      .mockResolvedValueOnce(mockResponse(7, 7, true));

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage).toEqual({
      requested: 7,
      filled: 7,
      retried: true,
      underFilled: false,
      retryCount: 1,
    });
  });

  it("recovers on second retry (6/8 → 7/8 → 8/8)", async () => {
    invokeMock
      .mockResolvedValueOnce(mockResponse(6, 8))
      .mockResolvedValueOnce(mockResponse(7, 8))
      .mockResolvedValueOnce(mockResponse(8, 8));

    const result = await generatePlanFromAI(mediumInputs);

    expect(invokeMock).toHaveBeenCalledTimes(3);
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage?.retryCount).toBe(2);
    expect(result.coverage?.filled).toBe(8);
    expect(result.coverage?.underFilled).toBe(false);
  });

  it("recovers on second retry for 6/7 pattern", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 0, lunch: 3, dinner: 4, snack: 0 },
    };
    invokeMock
      .mockResolvedValueOnce(mockResponse(6, 7))
      .mockResolvedValueOnce(mockResponse(6, 7))
      .mockResolvedValueOnce(mockResponse(7, 7));

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(3);
    expect(result.scheduleCoverageFailed).toBeFalsy();
    expect(result.coverage?.retryCount).toBe(2);
    expect(result.coverage?.filled).toBe(7);
  });

  it("stops early when first retry fills (no second retry call)", async () => {
    invokeMock
      .mockResolvedValueOnce(mockResponse(6, 8))
      .mockResolvedValueOnce(mockResponse(8, 8));

    const result = await generatePlanFromAI(mediumInputs);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.coverage?.retryCount).toBe(1);
    expect(result.coverage?.underFilled).toBe(false);
  });

  it("S3 pattern (7/8): both retries under-fill → scheduleCoverageFailed", async () => {
    invokeMock
      .mockResolvedValueOnce(mockResponse(7, 8))
      .mockResolvedValueOnce(mockResponse(7, 8))
      .mockResolvedValueOnce(mockResponse(7, 8));

    const result = await generatePlanFromAI(mediumInputs);

    expect(invokeMock).toHaveBeenCalledTimes(3);
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.coverage?.underFilled).toBe(true);
    expect(result.coverage?.retryCount).toBe(2);
    expect(result.error).toMatch(/7\/8/);
  });
});

// ---------------------------------------------------------------------------
// Outside hybrid range — single retry only
// ---------------------------------------------------------------------------
describe("Hybrid retry: plans outside 6–10 get only 1 retry", () => {
  it("small plan (5 slots) gets only 1 retry, then fails", async () => {
    invokeMock
      .mockResolvedValueOnce(mockResponse(3, 5))
      .mockResolvedValueOnce(mockResponse(3, 5));

    const result = await generatePlanFromAI(BASE_INPUTS);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.coverage?.retryCount).toBe(1);
  });

  it("large plan (12 slots) gets only 1 retry, then fails", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 4, lunch: 4, dinner: 4, snack: 0 },
    };
    invokeMock
      .mockResolvedValueOnce(mockResponse(10, 12))
      .mockResolvedValueOnce(mockResponse(10, 12));

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.coverage?.retryCount).toBe(1);
    expect(result.error).toMatch(/10\/12/);
  });

  it("S1 pattern (15 slots): only 1 retry → scheduleCoverageFailed", async () => {
    const inputs: FormInputs = {
      ...BASE_INPUTS,
      mealCounts: { breakfast: 5, lunch: 5, dinner: 5, snack: 0 },
    };
    invokeMock
      .mockResolvedValueOnce(mockResponse(13, 15))
      .mockResolvedValueOnce(mockResponse(13, 15));

    const result = await generatePlanFromAI(inputs);

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.scheduleCoverageFailed).toBe(true);
    expect(result.error).toMatch(/13\/15/);
    expect(result.coverage?.underFilled).toBe(true);
    expect(result.coverage?.retryCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Debug info
// ---------------------------------------------------------------------------
describe("Schedule-coverage: violation appears in debug info", () => {
  it("adds a schedule-coverage entry to invariantViolations when under-filled", async () => {
    invokeMock
      .mockResolvedValueOnce(mockResponse(3, 5))
      .mockResolvedValueOnce(mockResponse(3, 5));

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
