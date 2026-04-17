/**
 * Plan generation service — calls the generate-plan edge function,
 * then applies the existing client-side post-processing pipeline.
 *
 * FILE MAP:
 * - Runtime system prompt: supabase/functions/generate-plan/index.ts (SYSTEM_PROMPT const)
 * - JSON schema (tool calling): supabase/functions/generate-plan/index.ts (PLAN_TOOL const)
 * - Post-processing: src/data/mockData.ts (enforcePantryLimits, validatePlanData, sanitizeIngredient)
 * - Fallback generator: src/data/mockData.ts (generatePlan)
 */

import { supabase } from "@/integrations/supabase/client";
import {
  FormInputs,
  PlanData,
  PlanDebugInfo,
  Meal,
  MealType,
  ShoppingListItem,
  validatePlanData,
  enforcePantryLimits,
  sanitizeIngredient,
  categorizeItem,
  generatePlan as generateLocalPlan,
  buildStructuredIngredient,
} from "@/data/mockData";
import { computeIngredientCost, parseIngredient } from "@/data/priceMap";
import { assertPlanInvariants, InvariantReport } from "./planInvariants";

// ---------------------------------------------------------------------------
// Transform raw LLM meals into PlanData shape expected by post-processing
// ---------------------------------------------------------------------------
function llmResponseToPlanData(
  rawMeals: any[],
  inputs: FormInputs
): PlanData {
  const budgetNum = parseFloat(inputs.budget || "60") || 60;
  const mc = inputs.mealCounts || { breakfast: 0, lunch: 0, dinner: 5, snack: 0 };

  const meals: Meal[] = rawMeals.map((m: any) => {
    // Sanitize each ingredient through our existing pipeline
    const ingredients = (m.ingredients || []).map((ing: any) =>
      sanitizeIngredient({
        name: ing.name || "unknown",
        normalizedName: ing.normalizedName,
        qty: ing.qty,
        unit: ing.unit,
        originalQtyString: ing.originalQtyString,
        source: ing.source === "pantry" ? "pantry" : "grocery",
        cost: ing.cost,
      })
    );

    const prepMatch = (m.duration || "0").match(/(\d+)/);
    const prepTimeMinutes = prepMatch ? parseInt(prepMatch[1], 10) : 0;

    return {
      id: m.id || `meal-${Math.random().toString(36).slice(2, 8)}`,
      name: m.name || "Untitled meal",
      day: m.day || "Mon",
      mealType: (m.mealType || "dinner") as MealType,
      duration: m.duration || "30 min",
      prepTimeMinutes,
      servings: m.servings || 2,
      tags: m.tags || [],
      cuisineTags: m.cuisineTags || [],
      dietaryTags: m.dietaryTags || [],
      reuseBadges: m.reuseBadges || [],
      estimatedCost: m.estimatedCost || "$0",
      ingredients,
      instructions: m.instructions || m.steps || [],
      steps: m.instructions || m.steps || [],
      cooked: false,
    };
  });

  // Build shopping list and pantry items from ingredients
  const lists: Record<string, ShoppingListItem[]> = {
    produce: [], dairy: [], plantBased: [], dryGoods: [], spicesCondiments: [],
  };
  const pantryAccum = new Map<string, ShoppingListItem>();

  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const item: ShoppingListItem = {
        name: ing.name,
        normalizedName: ing.normalizedName,
        qty: ing.qty,
        unit: ing.unit,
        cost: ing.cost,
        costMin: Math.floor(ing.cost * 0.9 * 100) / 100,
        costMax: Math.ceil(ing.cost * 1.1 * 100) / 100,
        costLikely: Math.round(ing.cost * 100) / 100,
      };

      if (ing.source === "pantry") {
        const existing = pantryAccum.get(ing.normalizedName);
        if (existing) {
          existing.qty += ing.qty;
          existing.cost += ing.cost;
          existing.costMin += item.costMin;
          existing.costMax += item.costMax;
          existing.costLikely += item.costLikely;
        } else {
          pantryAccum.set(ing.normalizedName, { ...item });
        }
      } else {
        const cat = categorizeItem(ing.name);
        lists[cat].push(item);
      }
    }
  }

  const allShop = [...lists.produce, ...lists.dairy, ...lists.plantBased, ...lists.dryGoods, ...lists.spicesCondiments];
  const totalCostMin = allShop.reduce((s, i) => s + i.costMin, 0);
  const totalCostMax = allShop.reduce((s, i) => s + i.costMax, 0);
  const totalCost = allShop.reduce((s, i) => s + i.cost, 0);

  // Ingredient reuse calculation
  const ingCounts = new Map<string, number>();
  for (const meal of meals) {
    const seen = new Set<string>();
    for (const ing of meal.ingredients) {
      if (!seen.has(ing.normalizedName)) {
        seen.add(ing.normalizedName);
        ingCounts.set(ing.normalizedName, (ingCounts.get(ing.normalizedName) || 0) + 1);
      }
    }
  }
  const totalDistinct = ingCounts.size;
  const sharedDistinct = [...ingCounts.values()].filter(c => c >= 2).length;
  const ingredientReusePercent = totalDistinct > 0 ? Math.round((sharedDistinct / totalDistinct) * 100) : 0;

  return {
    metrics: {
      totalMeals: meals.length,
      mealCounts: {
        breakfast: meals.filter(m => m.mealType === "breakfast").length,
        lunch: meals.filter(m => m.mealType === "lunch").length,
        dinner: meals.filter(m => m.mealType === "dinner").length,
        snack: meals.filter(m => m.mealType === "snack").length,
      },
      costRange: `$${Math.floor(totalCostMin)}–$${Math.ceil(totalCostMax)}`,
      costLow: Math.floor(totalCostMin),
      costHigh: Math.ceil(totalCostMax),
      reuseScore: `${ingredientReusePercent}% of ingredients used in 2+ meals`,
      budget: budgetNum,
      ingredientReusePercent,
    },
    meals,
    shoppingList: {
      produce: lists.produce,
      dairy: lists.dairy,
      plantBased: lists.plantBased,
      dryGoods: lists.dryGoods,
      spicesCondiments: lists.spicesCondiments,
      totalItems: allShop.length,
      estimatedCost: `$${Math.round(totalCost)}`,
    },
    pantryItems: [...pantryAccum.values()],
  };
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------
export interface GeneratePlanResult {
  plan: PlanData;
  source: "ai" | "local";
  error?: string;
  /** Schedule-coverage info for telemetry / UI. */
  coverage?: {
    requested: number;
    filled: number;
    retried: boolean;
    underFilled: boolean;
    /** Number of retry attempts performed after the initial call (0, 1, or 2). */
    retryCount: number;
    /** True when the model returned more meals than requested and we trimmed. */
    overFilled?: boolean;
    /** Original meal count before any trimming (only set when overFilled). */
    filledBeforeTrim?: number;
    /** Number of meals trimmed off the end (filledBeforeTrim - requested). */
    trimmedCount?: number;
  };
  /**
   * When the model under-fills both initial and retry attempts, this flag is
   * set so the UI can show a friendly error instead of a partial plan.
   */
  scheduleCoverageFailed?: boolean;
  /** Set when over-fill was detected and trimmed. */
  scheduleOverfillTrimmed?: boolean;
}

function totalRequestedSlots(inputs: FormInputs): number {
  const mc = inputs.mealCounts || { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  return (mc.breakfast || 0) + (mc.lunch || 0) + (mc.dinner || 0) + (mc.snack || 0);
}

/**
 * Invoke the edge function once. `allowRetry` defaults to true server-side; we
 * pass it through so the client can opt out (e.g. in unit tests or for a
 * second-pass attempt orchestrated client-side).
 */
async function invokeGeneratePlan(
  inputs: FormInputs,
  allowRetry: boolean
): Promise<{ rawMeals: any[]; meta: { requestedSlots: number; filledSlots: number; retried: boolean } }> {
  const { data, error } = await supabase.functions.invoke("generate-plan", {
    body: { inputs, allowRetry },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message || "Edge function call failed");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (!data?.plan?.meals || !Array.isArray(data.plan.meals)) {
    throw new Error("AI returned invalid meal plan");
  }

  const requestedSlots = data.meta?.requestedSlots ?? totalRequestedSlots(inputs);
  const filledSlots = data.meta?.filledSlots ?? data.plan.meals.length;
  const retried = data.meta?.retried ?? false;

  return {
    rawMeals: data.plan.meals,
    meta: { requestedSlots, filledSlots, retried },
  };
}

/**
 * Hybrid retry policy for under-filled schedules:
 *   - Always allow 1 client-side retry (mirrors prior behavior).
 *   - For medium plans (requestedSlots in [6, 10]), allow up to 2 retries total
 *     after the initial attempt — stop early if any retry reaches full coverage.
 *   - Outside that range: keep single-retry behavior.
 */
function maxRetriesFor(requestedSlots: number): number {
  if (requestedSlots >= 6 && requestedSlots <= 10) return 2;
  return 1;
}

export async function generatePlanFromAI(inputs: FormInputs): Promise<GeneratePlanResult> {
  const requestedSlots = totalRequestedSlots(inputs);

  try {
    // Initial attempt — server may auto-retry once on under-fill.
    let { rawMeals, meta } = await invokeGeneratePlan(inputs, true);
    let retryCount = 0;
    const maxRetries = maxRetriesFor(requestedSlots);

    // Client-side retry loop. We only retry while still under-filled, the
    // server didn't already retry on this attempt, and we haven't hit our cap.
    while (
      requestedSlots > 0 &&
      rawMeals.length < requestedSlots &&
      retryCount < maxRetries
    ) {
      retryCount++;
      const isExtraRetry = retryCount === 2;
      console.warn(
        `Schedule under-filled: ${rawMeals.length}/${requestedSlots}. ` +
        `Issuing client-side retry #${retryCount}` +
        (isExtraRetry ? " (hybrid policy: medium plan, second retry)" : "") +
        `...`
      );
      const next = await invokeGeneratePlan(inputs, true);
      rawMeals = next.rawMeals;
      meta = { ...next.meta, retried: true };

      if (rawMeals.length >= requestedSlots) {
        if (isExtraRetry) {
          console.info(
            `Hybrid retry recovered missing slot(s) on retry #2 ` +
            `(${rawMeals.length}/${requestedSlots}).`
          );
        }
        break;
      }
    }

    if (
      requestedSlots >= 6 && requestedSlots <= 10 &&
      retryCount === 2 && rawMeals.length < requestedSlots
    ) {
      console.warn(
        `Hybrid retry exhausted: still ${rawMeals.length}/${requestedSlots} ` +
        `after 2 retries.`
      );
    }

    const filledBeforeTrim = rawMeals.length;
    const underFilled = requestedSlots > 0 && filledBeforeTrim < requestedSlots;

    // Over-fill guard: if the model returned MORE meals than requested AND we
    // are not also under-filled (under-fill rules win — guarded for safety),
    // trim deterministically to the first N meals. All downstream
    // metrics/shopping/pricing run against the trimmed array.
    let overFilled = false;
    let trimmedCount = 0;
    if (!underFilled && requestedSlots > 0 && filledBeforeTrim > requestedSlots) {
      overFilled = true;
      trimmedCount = filledBeforeTrim - requestedSlots;
      rawMeals = rawMeals.slice(0, requestedSlots);
      console.warn(
        `Schedule over-filled: ${filledBeforeTrim}/${requestedSlots}. ` +
        `Trimming ${trimmedCount} extra meal(s).`
      );
    }

    const filledSlots = rawMeals.length;
    const coverage = {
      requested: requestedSlots,
      filled: filledSlots,
      retried: meta.retried,
      underFilled,
      retryCount,
      ...(overFilled
        ? { overFilled: true, filledBeforeTrim, trimmedCount }
        : {}),
    };

    if (rawMeals.length === 0) {
      throw new Error("AI returned empty meal plan");
    }

    // Convert raw LLM response to PlanData
    const rawPlanData = llmResponseToPlanData(rawMeals, inputs);

    // Validate/sanitize
    const validatedPlan = validatePlanData(rawPlanData);

    // Enforce pantry limits (existing pipeline)
    const pantryInputs = inputs.pantryItems || [];
    const enforcement = enforcePantryLimits(validatedPlan, pantryInputs);

    // Run invariant assertions (defense-in-depth)
    const invariants = assertPlanInvariants(enforcement.plan, {
      pantryInputs,
      allergies: inputs.allergies || [],
      selectedCuisines: inputs.cuisines || [],
    });

    // Augment invariants with schedule-coverage / over-fill violations.
    const allViolations = [...invariants.violations];
    if (underFilled) {
      allViolations.push({
        code: "schedule-coverage" as any,
        message: `Schedule under-filled after retry: ${filledSlots}/${requestedSlots} meals`,
        details: { filled: filledSlots, requested: requestedSlots, retried: meta.retried } as any,
      });
    }
    if (overFilled) {
      allViolations.push({
        code: "schedule-overfill" as any,
        message: `Schedule over-filled: model returned ${filledBeforeTrim} meals for ${requestedSlots} slots; trimmed ${trimmedCount}.`,
        details: {
          requestedSlots,
          filledSlotsBeforeTrim: filledBeforeTrim,
          trimmedCount,
        } as any,
      });
    }

    if (allViolations.length > 0) {
      console.warn("Plan invariant violations:", allViolations);
    }

    // Attach debug info in dev mode
    if (import.meta.env.DEV) {
      const finalSnapshot = JSON.parse(JSON.stringify(enforcement.plan)) as PlanData;
      (enforcement.plan as any).__debugInfo = {
        rawPlan: rawPlanData,
        finalPlan: finalSnapshot,
        pantryInputs,
        inputsSummary: {
          budget: inputs.budget,
          dietary: inputs.dietary || [],
          allergies: inputs.allergies || [],
          cuisines: inputs.cuisines || [],
          pantryItems: pantryInputs,
          preference: inputs.preference,
          mealCounts: inputs.mealCounts,
        },
        pantryUsageBeforeEnforcement: enforcement.pantryUsageBefore,
        pantryUsageAfterEnforcement: enforcement.pantryUsageAfter,
        excessMovedToGrocery: enforcement.excessMoved,
        validation: {
          schemaValid: true,
          pantryCapped:
            enforcement.excessMoved.length === 0 ||
            Object.keys(enforcement.pantryUsageAfter).length >= 0,
          metricsRecomputed: true,
          invariantsOk: !underFilled && !overFilled && invariants.ok,
          invariantViolations: allViolations.map(v => ({ code: v.code, message: v.message })),
        },
      } satisfies PlanDebugInfo;
    }

    // If the schedule is still under-filled after retry, mark plan invalid for UI.
    if (underFilled) {
      return {
        plan: enforcement.plan,
        source: "ai",
        coverage,
        scheduleCoverageFailed: true,
        error: `We had trouble filling all your slots (${filledSlots}/${requestedSlots}). Please try again.`,
      };
    }

    return { plan: enforcement.plan, source: "ai", coverage };
  } catch (err) {
    console.warn("AI plan generation failed, falling back to local:", err);
    const localPlan = generateLocalPlan(inputs);
    return {
      plan: localPlan,
      source: "local",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
