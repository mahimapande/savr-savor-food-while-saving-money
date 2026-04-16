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
// System prompt – the finalized Savr meal-planning prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Savr, an expert budget-conscious meal-planning assistant.

ROLE
Generate a weekly meal plan that maximises ingredient reuse, respects the user's budget, dietary needs, cuisine preferences, and pantry inventory.

RULES
1. Every meal MUST include a unique id (kebab-case), a human-readable name, prep duration string (e.g. "25 min"), servings count, tags array, cuisine tag, dietary tags, reuse badges, estimated cost string, a full ingredients list, and step-by-step cooking instructions.
2. Each ingredient MUST have: name (human-readable with quantity, e.g. "2 large eggs"), normalizedName (lowercase singular base, e.g. "egg"), qty (number), unit (e.g. "each","cup","oz","lb","tbsp","tsp"), originalQtyString, source ("pantry" or "grocery"), and cost (estimated USD).
3. Mark an ingredient source as "pantry" ONLY if it appears in the user's pantry list. All other ingredients are "grocery".
4. Do NOT exceed the user's pantry quantities — the post-processor will clamp, but try to be accurate.
5. Maximise ingredient reuse across meals: prefer recipes that share staple ingredients.
6. Stay within the weekly budget. Estimate realistic US grocery prices.
7. Respect ALL dietary restrictions strictly. Never include excluded ingredients.
8. NEVER include peanut butter in any recipe. Use tahini or other nut/seed butters instead.
9. Assign each meal a day abbreviation (Mon, Tue, Wed, Thu, Fri, Sat, Sun) matching the user's requested days.
10. Provide 3-6 clear cooking instructions per meal.
11. Include reuse badges like "Uses 2 pantry items" or "egg used in 3 meals".
12. Estimate cost per meal realistically (USD).

OUTPUT
Return ONLY the structured meal plan via the provided tool/function call. Do not add commentary.`;

// ---------------------------------------------------------------------------
// Structured output schema via tool calling (OpenAI function calling)
// ---------------------------------------------------------------------------
const PLAN_TOOL = {
  type: "function" as const,
  function: {
    name: "return_meal_plan",
    description:
      "Return the complete weekly meal plan with meals, shopping list, pantry usage, and summary metrics.",
    parameters: {
      type: "object",
      properties: {
        meals: {
          type: "array",
          description: "Array of planned meals for the week",
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
      },
      required: ["meals"],
    },
  },
};

// ---------------------------------------------------------------------------
// Build user message from form inputs
// ---------------------------------------------------------------------------
function buildUserMessage(inputs: Record<string, unknown>): string {
  const budget = inputs.budget || "60";
  const mealCounts = (inputs.mealCounts as Record<string, number>) || {
    breakfast: 0, lunch: 0, dinner: 5, snack: 0,
  };
  const dietary = (inputs.dietary as string[]) || [];
  const cuisines = (inputs.cuisines as string[]) || [];
  const pantryItems = (inputs.pantryItems as string[]) || [];
  const preference = (inputs.preference as string) || "balanced";
  const mealDays = inputs.mealDays as Record<string, string[]> | undefined;

  const parts: string[] = [
    `Weekly budget: $${budget}`,
    `Meals requested: ${JSON.stringify(mealCounts)}`,
  ];

  if (mealDays) parts.push(`Meal days: ${JSON.stringify(mealDays)}`);
  if (dietary.length > 0) parts.push(`Dietary restrictions: ${dietary.join(", ")}`);
  if (cuisines.length > 0) parts.push(`Preferred cuisines: ${cuisines.join(", ")}`);
  if (pantryItems.length > 0) parts.push(`Pantry inventory: ${pantryItems.join("; ")}`);
  parts.push(`Preference: ${preference}`);

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Handler
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
    const userMessage = buildUserMessage(inputs);

    console.log(`Calling OpenAI ${OPENAI_MODEL} for meal plan generation...`);

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "return_meal_plan" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "OpenAI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check the OPENAI_API_KEY secret." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `OpenAI error (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "return_meal_plan") {
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return new Response(JSON.stringify({ plan: parsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          console.error("Could not parse OpenAI response as JSON");
        }
      }
      return new Response(
        JSON.stringify({ error: "OpenAI did not return structured plan data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planData = JSON.parse(toolCall.function.arguments);
    console.log(`OpenAI returned ${planData.meals?.length || 0} meals`);

    return new Response(JSON.stringify({ plan: planData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
