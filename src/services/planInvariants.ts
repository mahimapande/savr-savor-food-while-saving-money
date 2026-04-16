/**
 * Plan invariant assertions — defense-in-depth checks run after AI generation.
 *
 * Covers:
 *  a) Pantry caps with a finite default for entries lacking explicit qty.
 *  b) Aggregate per-ingredient qty across meals must not exceed cap.
 *  c) Allergy derivative scan (e.g. parmesan/butter for "dairy", mayo for "eggs").
 *  d) Cuisine label normalization to original user-selected casing & allowed set.
 */

import { PlanData } from "@/data/mockData";
import { parseIngredient } from "@/data/priceMap";

// Default finite cap when a pantry entry has no explicit quantity (e.g. "olive oil").
export const DEFAULT_PANTRY_CAP = 2;

// Allergy → derivative keyword map (lowercase substrings).
export const ALLERGY_DERIVATIVES: Record<string, string[]> = {
  peanuts: ["peanut", "groundnut"],
  "tree nuts": [
    "almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio",
    "macadamia", "brazil nut", "nut butter", "praline", "marzipan",
  ],
  dairy: [
    "milk", "butter", "cheese", "yogurt", "yoghurt", "cream", "whey",
    "casein", "ghee", "parmesan", "mozzarella", "cheddar", "feta",
    "ricotta", "brie", "gouda", "lactose",
  ],
  eggs: ["egg", "mayo", "mayonnaise", "aioli", "meringue", "custard"],
  soy: ["soy", "tofu", "tempeh", "edamame", "miso", "tamari"],
  sesame: ["sesame", "tahini"],
  fish: ["fish", "anchovy", "anchovies", "tuna", "salmon", "cod", "tilapia", "sardine", "worcestershire"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "crayfish"],
  "wheat/gluten": ["wheat", "flour", "bread", "pasta", "couscous", "seitan", "barley", "rye", "bulgur", "farro"],
  wheat: ["wheat", "flour", "bread", "pasta", "couscous", "seitan"],
  gluten: ["wheat", "flour", "bread", "pasta", "couscous", "seitan", "barley", "rye"],
};

// Allowed cuisine label set — must match the UI options.
export const ALLOWED_CUISINES = [
  "Italian", "Mexican", "Asian", "American", "Mediterranean",
  "Indian", "Thai", "Japanese", "Chinese", "French", "Middle Eastern",
] as const;

export interface InvariantViolation {
  code:
    | "pantry-cap-exceeded"
    | "pantry-no-qty-default-exceeded"
    | "allergy-derivative-detected"
    | "cuisine-label-unknown";
  message: string;
  details?: Record<string, unknown>;
}

export interface InvariantReport {
  ok: boolean;
  violations: InvariantViolation[];
  /** Ingredient name → effective cap that was applied (incl. defaults). */
  effectivePantryCaps: Record<string, { cap: number; unit: string; usedDefault: boolean }>;
}

/**
 * Build pantry caps from raw user input strings.
 * Entries without a parseable quantity are assigned DEFAULT_PANTRY_CAP.
 */
function buildCapsWithDefaults(
  pantryInputs: string[]
): Record<string, { cap: number; unit: string; usedDefault: boolean }> {
  const caps: Record<string, { cap: number; unit: string; usedDefault: boolean }> = {};
  for (const raw of pantryInputs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Heuristic: did the user supply a number anywhere?
    const hasQty = /\d/.test(trimmed);

    const parsed = parseIngredient(trimmed);
    const name = parsed.baseName;
    if (!name) continue;

    const cap = hasQty ? parsed.qty : DEFAULT_PANTRY_CAP;
    caps[name] = { cap, unit: parsed.unit || "each", usedDefault: !hasQty };
  }
  return caps;
}

/**
 * Run all invariant assertions on a finalized plan.
 */
export function assertPlanInvariants(
  plan: PlanData,
  inputs: {
    pantryInputs: string[];
    allergies: string[];
    selectedCuisines: string[];
  }
): InvariantReport {
  const violations: InvariantViolation[] = [];
  const effectiveCaps = buildCapsWithDefaults(inputs.pantryInputs);

  // (a, b) Pantry cap enforcement — aggregate per normalizedName across all meals
  const aggregate: Record<string, number> = {};
  for (const meal of plan.meals) {
    for (const ing of meal.ingredients) {
      if (ing.source !== "pantry") continue;
      aggregate[ing.normalizedName] = (aggregate[ing.normalizedName] || 0) + ing.qty;
    }
  }
  for (const [name, total] of Object.entries(aggregate)) {
    const cap = effectiveCaps[name];
    if (!cap) continue; // unknown pantry item — handled by enforcePantryLimits elsewhere
    if (total > cap.cap + 1e-6) {
      violations.push({
        code: cap.usedDefault ? "pantry-no-qty-default-exceeded" : "pantry-cap-exceeded",
        message: `Pantry cap exceeded for "${name}": used ${total}, cap ${cap.cap} ${cap.unit}${cap.usedDefault ? " (default)" : ""}`,
        details: { ingredient: name, used: total, cap: cap.cap, unit: cap.unit, default: cap.usedDefault },
      });
    }
  }

  // (c) Allergy derivative scan
  const activeKeywords: { allergy: string; keyword: string }[] = [];
  for (const allergy of inputs.allergies) {
    const key = allergy.toLowerCase().trim();
    const derivatives = ALLERGY_DERIVATIVES[key];
    if (derivatives) {
      for (const kw of derivatives) activeKeywords.push({ allergy, keyword: kw });
    } else {
      // Free-text allergy — match the literal token
      activeKeywords.push({ allergy, keyword: key });
    }
  }
  if (activeKeywords.length > 0) {
    const scan = (label: string, source: "meal" | "shoppingList" | "pantryItems") => {
      const lower = label.toLowerCase();
      for (const { allergy, keyword } of activeKeywords) {
        // Word-boundary-ish check to avoid false positives like "creamer" → "cream"? we accept that.
        if (lower.includes(keyword)) {
          violations.push({
            code: "allergy-derivative-detected",
            message: `Prohibited derivative for allergy "${allergy}" found in ${source}: "${label}" matches "${keyword}"`,
            details: { allergy, keyword, source, label },
          });
          return;
        }
      }
    };
    for (const meal of plan.meals) {
      for (const ing of meal.ingredients) {
        scan(ing.name, "meal");
        scan(ing.normalizedName, "meal");
      }
    }
    const shop = plan.shoppingList;
    for (const cat of [shop.produce, shop.dairy, shop.plantBased, shop.dryGoods, shop.spicesCondiments]) {
      for (const item of cat) {
        scan(item.name, "shoppingList");
        scan(item.normalizedName, "shoppingList");
      }
    }
    for (const item of plan.pantryItems) {
      scan(item.name, "pantryItems");
      scan(item.normalizedName, "pantryItems");
    }
  }

  // (d) Cuisine label normalization — map model output back to allowed set.
  const allowedLower: Record<string, string> = {};
  for (const c of ALLOWED_CUISINES) allowedLower[c.toLowerCase()] = c;
  // Also include user-selected labels in case they exceed the static set.
  for (const c of inputs.selectedCuisines) {
    if (c) allowedLower[c.toLowerCase()] = c;
  }

  for (const meal of plan.meals) {
    if (!Array.isArray(meal.cuisineTags)) continue;
    const normalized: string[] = [];
    for (const tag of meal.cuisineTags) {
      const canonical = allowedLower[String(tag).toLowerCase().trim()];
      if (canonical) {
        normalized.push(canonical);
      } else {
        violations.push({
          code: "cuisine-label-unknown",
          message: `Unknown cuisine label "${tag}" on meal "${meal.name}"`,
          details: { meal: meal.name, tag },
        });
        normalized.push(tag); // keep original to avoid data loss
      }
    }
    meal.cuisineTags = normalized;
  }

  return {
    ok: violations.length === 0,
    violations,
    effectivePantryCaps: effectiveCaps,
  };
}
