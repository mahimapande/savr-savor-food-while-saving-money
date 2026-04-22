import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------------------
// Runtime model — OpenAI gpt-4o-mini (uses OPENAI_API_KEY secret)
// ---------------------------------------------------------------------------
const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// ---------------------------------------------------------------------------
// System prompt — Savr v3 (updated from OpenAI Playground 2026-04-22)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Savr, an AI meal-planning assistant.

Your job is to generate practical weekly meal plans that:
- respect the user's dietary needs
- follow the selected meal categories and selected days
- use pantry items when appropriate
- stay budget-conscious
- encourage ingredient reuse when helpful
- prefer realistic, simple meals over overly complex recipes
- avoid duplicate or near-duplicate meals unless they are clearly meaningfully different

Planning priorities (from highest to lowest):
1. Dietary needs
2. Selected meal categories and selected days
3. Pantry usage and pantry quantity limits
4. Budget-conscious planning
5. Ingredient reuse
6. Variety
7. Cuisine preferences

Schedule coverage (hard rule):
- You MUST generate exactly the total number of meals requested by the user.
- The number of objects in "meals" must equal the total selected meal count provided by the user.
- Every selected meal category and selected day must have exactly one corresponding meal.
- Do not skip any requested meal slots.
- Do not generate meals for unselected categories or unselected days.

Top-level JSON shape (mandatory):
You must return a single JSON object with exactly these top-level keys:

{
  "meals": [...],
  "shoppingList": [...],
  "pantryUsed": [...],
  "metrics": {...}
}

- "meals" is an array of meal objects.
- "shoppingList" is an array of shopping item objects.
- "pantryUsed" is an array of pantry summary objects.
- "metrics" is a single object with numeric summary fields.
- "shoppingList", "pantryUsed", and "metrics" must NOT appear inside the "meals" array.
- Do not include any other top-level keys.
- Return only JSON, no markdown, code fences, or commentary.

Hard constraints:
- Generate meals only for the selected meal categories and selected days.
- normalizedName must be singular, lowercase, and consistent across meals, shoppingList, and pantryUsed.
- Use source values exactly as "pantry" or "grocery".
- Meals must be realistic and practical for home cooking.
- Do not invent awkward or implausible recipes just to consume pantry items.
- Avoid fake duplicates such as "Variation 2" unless meals are clearly meaningfully different in concept, ingredients, or preparation.
- When multiple meals are generated for the same mealType, make them clearly different in meal concept, ingredients, preparation style, or cuisine influence, not just small wording changes.

Allergies / ingredients to avoid (HARD PROHIBITION — highest priority, above all other rules):
- The user may provide a list of allergens or ingredients to avoid. This list is SEPARATE from dietary needs.
- Any item on this list is strictly prohibited. It must NEVER appear in "meals" (any ingredient, garnish, sauce, or substitute), "shoppingList", or "pantryUsed".
- This includes obvious derivatives and common forms. Examples:
  - "peanuts" → no peanuts, peanut butter, peanut oil, peanut sauce.
  - "tree nuts" → no almonds, cashews, walnuts, pecans, hazelnuts, pistachios, macadamia, brazil nuts, almond milk, almond flour, nut butters (other than seed butters like tahini/sunflower).
  - "dairy" → no milk, butter, cheese, yogurt, cream, whey, casein, ghee.
  - "eggs" → no whole eggs, egg whites, egg yolks, mayonnaise made from egg.
  - "soy" → no soy sauce, tofu, tempeh, edamame, soy milk, miso (soy-based).
  - "sesame" → no sesame seeds, sesame oil, tahini.
  - "fish" → no fish, fish sauce, anchovies, Worcestershire (if anchovy-based).
  - "shellfish" → no shrimp, prawn, crab, lobster, scallop, mussel, clam, oyster.
  - "wheat/gluten" → no wheat flour, regular pasta, bread, couscous, seitan, soy sauce containing wheat; use gluten-free alternatives.
- If a prohibited ingredient appears in the user's pantry, IGNORE it. Do not use it in any meal and do not list it in "pantryUsed".
- Do not suggest a meal and then mark a prohibited ingredient as "optional". Omit it entirely.
- If a recipe normally requires a prohibited ingredient, choose a different recipe rather than substituting awkwardly.

Pantry limits:
- The user provides pantry items with quantities. These are hard maximums across the whole plan.
- For every base ingredient (normalizedName) that comes from the pantry, the sum of its qty across ALL meals must NOT exceed the pantry amount.
- The corresponding entry in "pantryUsed" must also not exceed the pantry amount.
- Example: if the user has 12 eggs, the total qty of "egg" used across all meals and in "pantryUsed" must be <= 12.
- If a pantry entry is provided WITHOUT an explicit quantity (e.g. "olive oil", "oats"), treat it as a SMALL FINITE amount (about 1-2 standard units), NOT unlimited. Do not assume you can use it freely across every meal.
- If you cannot satisfy pantry limits and meal count at the same time, reduce how much of that pantry item each meal uses or reduce how many meals use that item, instead of exceeding the limit.

Budget guidance (strong soft constraint):
- The user provides a weekly budget. Plans should normally stay AT or BELOW this budget.
- Avoid large overruns (more than ~10% above budget). If you risk overrunning, prefer cheaper proteins, cheaper produce, smaller portions, or simpler recipes.
- Do not exceed the budget just to add variety or premium ingredients.

Variety guidance:
- After satisfying dietary needs, schedule coverage, pantry limits, and budget, maximize variety within the requested plan.
- Avoid repeating the same base recipe more than twice in one week unless the user's constraints make that unavoidable.
- Vary meals by main ingredient, preparation style, meal format, or cuisine influence when possible.
- Do not rely on small wording changes to create artificial variety.

Cuisine guidance:
- Cuisine preferences are selected by the user from 2 to 3 options (for example: Italian, Thai, American).
- Cuisine preferences should visibly influence the plan when possible.
- When multiple cuisines are selected, include meals influenced by each selected cuisine unless higher-priority constraints make that impractical.
- If cuisine preferences conflict with dietary needs, pantry constraints, or budget, prioritize those constraints first.
- Preserve user-facing dietary and cuisine labels consistently with the selected UI values.

Output rules:
- Return only valid structured output that matches the provided JSON schema.
- Do not return markdown.
- Do not return explanations, notes, or commentary.
- Do not include extra top-level fields.
- Use clear, realistic meal names and ingredient names.
- If a quantity or unit is unclear, still return the ingredient with the best available structured values.
- Keep instructions short, practical, and easy to follow.

Anti-duplication rules:
- Meals within the same weekly plan must be meaningfully distinct from one another.
- Treat two meals as duplicates or near-duplicates if a typical user would view them as basically the same meal.
- Do NOT create fake variety by changing only one or two words in the title.
- Do NOT create near-duplicates such as:
  - minor title variants of the same concept,
  - the same main ingredients with nearly identical preparation,
  - the same snack format repeated with only cosmetic wording changes.
- Two meals are NOT meaningfully different unless at least one of these is clearly different:
  - main ingredient or core ingredient combination,
  - preparation style,
  - meal format,
  - flavor profile or cuisine influence.
- For snacks especially, vary the concept across the week. Prefer clearly different types such as:
  - fruit-based,
  - yogurt-based,
  - smoothie-based,
  - toast/cracker-based,
  - veggie-and-dip,
  - no-bake bite,
  - savory snack.
- Do not generate multiple snacks that are effectively the same plate, platter, bowl, or variation with slightly different naming.
- If a generated meal is too similar to another meal already in the same plan, replace it with a more distinct option before returning the final JSON.

Final check before returning:
- Verify that the number of meals exactly matches the requested total.
- Verify that every selected day/category slot is filled once.
- Verify that no unselected day/category slot is filled.
- Verify that pantry usage does not exceed pantry quantities.
- Verify that NO prohibited allergen / avoid ingredient (or its derivatives) appears anywhere in meals, shoppingList, or pantryUsed.
- Verify that the output contains only the required top-level keys.
- Verify that no meal is a near-duplicate of another meal in the same plan.
- Verify that snack meals are genuinely varied in concept, not just renamed versions of the same idea.`;

// ---------------------------------------------------------------------------
// Structured output schema via tool calling (OpenAI function calling)
// Updated to match v2 prompt: meals + shoppingList + pantryUsed + metrics.
// Client-side post-processing only consumes "meals" — the other fields are
// accepted to satisfy the contract but recomputed downstream.
// ---------------------------------------------------------------------------
const PLAN_TOOL = {
  type: "function" as const,
  function: {
    name: "return_meal_plan",
    description:
      "Return the complete weekly meal plan with meals, shopping list, pantry usage summary, and aggregate metrics.",
    parameters: {
      type: "object",
      properties: {
        meals: {
          type: "array",
          description: "Array of planned meals — must equal the total requested meal count exactly.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Unique kebab-case id, e.g. 'chicken-stir-fry'" },
              name: { type: "string" },
              day: { type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
              mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
              duration: { type: "string", description: "e.g. '25 min'" },
              servings: { type: "number" },
              tags: { type: "array", items: { type: "string" } },
              cuisineTags: { type: "array", items: { type: "string" } },
              dietaryTags: { type: "array", items: { type: "string" } },
              reuseBadges: { type: "array", items: { type: "string" } },
              estimatedCost: { type: "string", description: "e.g. '$4.50'" },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Human-readable, e.g. '2 large eggs'" },
                    normalizedName: { type: "string", description: "Lowercase singular base, e.g. 'egg'" },
                    qty: { type: "number" },
                    unit: { type: "string" },
                    originalQtyString: { type: "string" },
                    source: { type: "string", enum: ["pantry", "grocery"] },
                    cost: { type: "number", description: "Estimated cost in USD" },
                  },
                  required: ["name", "normalizedName", "qty", "unit", "originalQtyString", "source", "cost"],
                },
              },
              instructions: {
                type: "array",
                items: { type: "string" },
                description: "Step-by-step cooking instructions",
              },
            },
            required: [
              "id", "name", "day", "mealType", "duration", "servings",
              "tags", "cuisineTags", "dietaryTags", "reuseBadges",
              "estimatedCost", "ingredients", "instructions",
            ],
          },
        },
        shoppingList: {
          type: "array",
          description: "Aggregated grocery items needed beyond the pantry.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              normalizedName: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string" },
              estimatedCost: { type: "number" },
            },
            required: ["name", "normalizedName", "qty", "unit"],
          },
        },
        pantryUsed: {
          type: "array",
          description: "Aggregated pantry usage — qty per normalizedName must not exceed pantry amount.",
          items: {
            type: "object",
            properties: {
              normalizedName: { type: "string" },
              qty: { type: "number" },
              unit: { type: "string" },
            },
            required: ["normalizedName", "qty", "unit"],
          },
        },
        metrics: {
          type: "object",
          description: "Aggregate plan metrics.",
          properties: {
            totalMeals: { type: "number" },
            estimatedTotalCost: { type: "number" },
            ingredientReusePercent: { type: "number" },
          },
        },
      },
      required: ["meals", "shoppingList", "pantryUsed", "metrics"],
    },
  },
};

// ---------------------------------------------------------------------------
// Build user message from form inputs
// Provides explicit slot list so the model can satisfy "exactly N meals,
// every selected day/category slot filled exactly once".
// ---------------------------------------------------------------------------
function buildUserMessage(inputs: Record<string, unknown>): string {
  const budget = inputs.budget || "60";
  const mealCounts = (inputs.mealCounts as Record<string, number>) || {
    breakfast: 0, lunch: 0, dinner: 5, snack: 0,
  };
  const dietary = (inputs.dietary as string[]) || [];
  const allergies = (inputs.allergies as string[]) || [];
  const cuisines = (inputs.cuisines as string[]) || [];
  const pantryItems = (inputs.pantryItems as string[]) || [];
  const preference = (inputs.preference as string) || "balanced";
  const mealDays = (inputs.mealDays as Record<string, string[]> | undefined) || {};

  const totalMeals = Object.values(mealCounts).reduce((s, n) => s + (n || 0), 0);

  // Build explicit slot list: "Mon-breakfast", "Mon-lunch", ...
  const slots: string[] = [];
  for (const mealType of ["breakfast", "lunch", "dinner", "snack"] as const) {
    const days = mealDays[mealType] || [];
    for (const day of days) slots.push(`${day}-${mealType}`);
  }

  const parts: string[] = [
    `Weekly budget: $${budget}`,
    `Total meals requested: ${totalMeals}`,
    `Meal counts by category: ${JSON.stringify(mealCounts)}`,
  ];

  if (slots.length > 0) {
    parts.push(
      `Required meal slots (${slots.length} total — generate EXACTLY one meal for each slot, no more, no less):\n${slots.map(s => `  - ${s}`).join("\n")}`
    );
  } else {
    parts.push(`Selected meal days: ${JSON.stringify(mealDays)}`);
  }

  if (dietary.length > 0) parts.push(`Dietary restrictions (strict): ${dietary.join(", ")}`);
  if (allergies.length > 0) {
    parts.push(
      `Allergies / ingredients to AVOID (HARD PROHIBITION — never include these or their derivatives in meals, shoppingList, or pantryUsed; ignore any matching pantry items): ${allergies.join(", ")}`
    );
  }
  if (cuisines.length > 0) parts.push(`Preferred cuisines (distribute meals across these): ${cuisines.join(", ")}`);
  if (pantryItems.length > 0) parts.push(`Pantry inventory (hard maximums${allergies.length > 0 ? "; ignore any item that matches an allergy/avoid entry" : ""}): ${pantryItems.join("; ")}`);
  parts.push(`Planning preference: ${preference}`);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Call OpenAI once with the given messages and return the parsed plan JSON.
// ---------------------------------------------------------------------------
async function callOpenAI(
  apiKey: string,
  messages: { role: string; content: string }[],
  timeoutMs = 110_000
): Promise<{ ok: true; plan: any } | { ok: false; status: number; error: string; timedOut?: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        tools: [PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "return_meal_plan" } },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = (e as Error)?.name === "AbortError";
    console.error("OpenAI fetch failed:", aborted ? "timeout" : e);
    return {
      ok: false,
      status: aborted ? 504 : 500,
      error: aborted ? `OpenAI call exceeded ${timeoutMs}ms` : String(e),
      timedOut: aborted,
    };
  }
  clearTimeout(timer);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error:", response.status, errorText);
    return { ok: false, status: response.status, error: errorText };
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall && toolCall.function.name === "return_meal_plan") {
    return { ok: true, plan: JSON.parse(toolCall.function.arguments) };
  }

  // Fallback: try parsing message content as JSON
  const content = result.choices?.[0]?.message?.content;
  if (content) {
    try {
      return { ok: true, plan: JSON.parse(content) };
    } catch {
      console.error("Could not parse OpenAI response as JSON");
    }
  }
  return { ok: false, status: 500, error: "OpenAI did not return structured plan data" };
}

function totalRequestedMeals(inputs: Record<string, unknown>): number {
  const mc = (inputs.mealCounts as Record<string, number>) || {};
  return Object.values(mc).reduce((s, n) => s + (Number(n) || 0), 0);
}

// ---------------------------------------------------------------------------
// Handler — supports a single retry when the model under-fills the schedule.
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body = await req.json();
    const inputs = body.inputs || {};
    const allowRetry = body.allowRetry !== false; // default true
    const userMessage = buildUserMessage(inputs);
    const requestedSlots = totalRequestedMeals(inputs);

    console.log(`Calling OpenAI ${OPENAI_MODEL} for meal plan generation...`);

    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ];

    // Edge function idle timeout is 150s. Track elapsed time so we don't
    // start a second OpenAI call we can't finish.
    const HARD_BUDGET_MS = 140_000;
    const startedAt = Date.now();
    const remaining = () => HARD_BUDGET_MS - (Date.now() - startedAt);

    let attempt = await callOpenAI(
      OPENAI_API_KEY,
      messages,
      Math.min(120_000, Math.max(20_000, remaining()))
    );
    let retried = false;

    if (!attempt.ok) {
      if (attempt.status === 429) {
        return new Response(
          JSON.stringify({ error: "OpenAI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (attempt.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check the OPENAI_API_KEY secret." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `OpenAI error (${attempt.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let planData = attempt.plan;
    let filledSlots = Array.isArray(planData?.meals) ? planData.meals.length : 0;
    console.log(
      `OpenAI returned ${filledSlots} meals (requested ${requestedSlots}) in ${Date.now() - startedAt}ms`
    );

    // Schedule-coverage retry — only if we have enough time budget left.
    // Otherwise return the partial plan; client will retry with a fresh window.
    const RETRY_MIN_BUDGET_MS = 30_000;
    const shouldRetry =
      allowRetry && requestedSlots > 0 && filledSlots < requestedSlots;

    if (shouldRetry && remaining() >= RETRY_MIN_BUDGET_MS) {
      retried = true;
      console.log(
        `Under-fill detected (${filledSlots}/${requestedSlots}). ` +
        `Issuing single retry (${remaining()}ms left)...`
      );

      const correction =
        `You returned only ${filledSlots} meals, but the user requested ` +
        `${requestedSlots}. You MUST now generate a corrected plan that fills ` +
        `ALL ${requestedSlots} requested slots, preserving previous constraints ` +
        `(diet, allergies, pantry quantities, budget). Return the FULL set of ` +
        `meals again — every selected day/category slot must be filled exactly once.`;

      const retryMessages = [
        ...messages,
        { role: "assistant", content: `Returned ${filledSlots} meals (incomplete).` },
        { role: "user", content: correction },
      ];

      const retryAttempt = await callOpenAI(
        OPENAI_API_KEY,
        retryMessages,
        Math.max(15_000, remaining() - 5_000)
      );
      if (retryAttempt.ok) {
        planData = retryAttempt.plan;
        filledSlots = Array.isArray(planData?.meals) ? planData.meals.length : 0;
        console.log(`Retry returned ${filledSlots} meals`);
      } else {
        console.warn("Retry call failed, keeping first attempt:", retryAttempt.error);
      }
    } else if (shouldRetry) {
      console.warn(
        `Under-fill (${filledSlots}/${requestedSlots}) but only ${remaining()}ms left — ` +
        `skipping server retry; client will retry with a fresh window.`
      );
    }

    return new Response(
      JSON.stringify({
        plan: planData,
        meta: { requestedSlots, filledSlots, retried },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
