/**
 * Centralized ingredient pricing system.
 *
 * Each entry maps a normalized ingredient name to a per-unit rate.
 * `computeIngredientCost` parses quantity + unit from an ingredient string,
 * looks up the rate, and returns quantity × rate.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceEntry {
  unit: string;   // the unit the rate applies to (e.g. "each", "cup", "tbsp")
  rate: number;   // price in USD per that unit
}

export interface ParsedIngredient {
  qty: number;
  unit: string;
  baseName: string;
}

// ---------------------------------------------------------------------------
// Price map – single source of truth for MVP grocery prices (US average)
// ---------------------------------------------------------------------------

export const INGREDIENT_PRICE_MAP: Record<string, PriceEntry> = {
  // Produce
  "yellow onion":       { unit: "each", rate: 0.50 },
  "onion":              { unit: "each", rate: 0.50 },
  "bell pepper":        { unit: "each", rate: 1.00 },
  "zucchini":           { unit: "each", rate: 0.80 },
  "eggplant":           { unit: "each", rate: 1.50 },
  "carrot":             { unit: "each", rate: 0.30 },
  "sweet potato":       { unit: "each", rate: 0.80 },
  "potato":             { unit: "each", rate: 0.40 },
  "tomato":             { unit: "each", rate: 0.50 },
  "cherry tomatoes":    { unit: "cup",  rate: 1.50 },
  "cucumber":           { unit: "each", rate: 0.60 },
  "lemon":              { unit: "each", rate: 0.40 },
  "lime":               { unit: "each", rate: 0.25 },
  "avocado":            { unit: "each", rate: 1.00 },
  "banana":             { unit: "each", rate: 0.25 },
  "apple":              { unit: "each", rate: 0.75 },
  "pear":               { unit: "each", rate: 0.85 },
  "grapes":             { unit: "cup",  rate: 0.90 },
  "red grapes":         { unit: "cup",  rate: 0.90 },
  "strawberries":       { unit: "cup",  rate: 0.80 },
  "blueberries":        { unit: "cup",  rate: 2.00 },
  "mixed berries":      { unit: "cup",  rate: 1.50 },
  "frozen mango":       { unit: "cup",  rate: 1.50 },
  "spinach":            { unit: "cup",  rate: 0.80 },
  "mixed greens":       { unit: "cup",  rate: 0.62 },
  "cabbage":            { unit: "cup",  rate: 0.50 },
  "green cabbage":      { unit: "cup",  rate: 0.50 },
  "shredded green cabbage": { unit: "cup", rate: 0.50 },
  "broccoli florets":   { unit: "cup",  rate: 1.00 },
  "broccoli":           { unit: "cup",  rate: 1.00 },
  "cauliflower florets":{ unit: "cup",  rate: 0.75 },
  "cauliflower":        { unit: "cup",  rate: 0.75 },
  "frozen peas":        { unit: "cup",  rate: 1.00 },
  "corn kernels":       { unit: "cup",  rate: 0.60 },
  "celery":             { unit: "each", rate: 0.30 },
  "celery stalk":       { unit: "each", rate: 0.30 },
  "ginger":             { unit: "each", rate: 0.30 },
  "fresh ginger":       { unit: "each", rate: 0.30 },

  // Herbs (bunches)
  "cilantro":           { unit: "bunch", rate: 0.79 },
  "parsley":            { unit: "bunch", rate: 0.79 },
  "fresh parsley":      { unit: "bunch", rate: 0.79 },
  "basil":              { unit: "bunch", rate: 0.79 },
  "fresh basil":        { unit: "bunch", rate: 0.79 },
  "fresh dill":         { unit: "tbsp",  rate: 0.30 },
  "dill":               { unit: "tbsp",  rate: 0.30 },

  // Garlic
  "garlic":             { unit: "clove", rate: 0.10 },

  // Dairy
  "eggs":               { unit: "each", rate: 0.25 },
  "egg":                { unit: "each", rate: 0.25 },
  "butter":             { unit: "tbsp", rate: 0.15 },
  "milk":               { unit: "cup",  rate: 0.30 },
  "yogurt":             { unit: "cup",  rate: 0.80 },
  "greek yogurt":       { unit: "cup",  rate: 0.80 },
  "cheddar cheese":     { unit: "oz",   rate: 0.375 },
  "shredded cheddar cheese": { unit: "oz", rate: 0.375 },
  "parmesan cheese":    { unit: "cup",  rate: 3.80 },
  "grated parmesan cheese": { unit: "cup", rate: 3.80 },
  "feta cheese":        { unit: "oz",   rate: 0.50 },
  "crumbled feta cheese": { unit: "oz", rate: 0.50 },
  "mozzarella":         { unit: "oz",   rate: 0.62 },
  "fresh mozzarella":   { unit: "oz",   rate: 0.62 },
  "brie cheese":        { unit: "oz",   rate: 0.60 },
  "gouda cheese":       { unit: "oz",   rate: 0.53 },
  "cheddar cheese slices": { unit: "each", rate: 0.25 },

  // Plant-based
  "tofu":               { unit: "block", rate: 2.29 },
  "firm tofu":          { unit: "block", rate: 2.29 },
  "coconut milk":       { unit: "can",   rate: 1.79 },
  "oat milk":           { unit: "cup",   rate: 0.40 },

  // Canned goods
  "chickpeas":          { unit: "can",  rate: 0.89 },
  "black beans":        { unit: "can",  rate: 0.79 },
  "kidney beans":       { unit: "can",  rate: 0.89 },
  "cannellini beans":   { unit: "can",  rate: 1.09 },
  "crushed tomatoes":   { unit: "can",  rate: 1.29 },
  "diced tomatoes":     { unit: "can",  rate: 0.99 },
  "tuna":               { unit: "can",  rate: 1.10 },
  "tuna in water":      { unit: "can",  rate: 1.10 },
  "sardines":           { unit: "can",  rate: 1.40 },
  "sardines in olive oil": { unit: "can", rate: 1.40 },

  // Grains / Dry goods
  "jasmine rice":       { unit: "cup",  rate: 0.40 },
  "cooked jasmine rice":{ unit: "cup",  rate: 0.20 },
  "arborio rice":       { unit: "cup",  rate: 0.80 },
  "cooked quinoa":      { unit: "cup",  rate: 0.60 },
  "quinoa":             { unit: "cup",  rate: 0.60 },
  "rice":               { unit: "cup",  rate: 0.40 },
  "spaghetti":          { unit: "oz",   rate: 0.094 },
  "penne pasta":        { unit: "oz",   rate: 0.094 },
  "pasta":              { unit: "oz",   rate: 0.094 },
  "rice noodles":       { unit: "oz",   rate: 0.16 },
  "rolled oats":        { unit: "cup",  rate: 0.30 },
  "oats":               { unit: "cup",  rate: 0.30 },
  "flour":              { unit: "cup",  rate: 0.20 },
  "red lentils":        { unit: "cup",  rate: 0.90 },
  "dried red lentils":  { unit: "cup",  rate: 0.90 },
  "lentils":            { unit: "cup",  rate: 0.90 },
  "granola":            { unit: "cup",  rate: 1.20 },
  "bread":              { unit: "slice", rate: 0.15 },
  "whole-grain bread":  { unit: "slice", rate: 0.20 },
  "flatbread":          { unit: "each", rate: 1.00 },
  "naan":               { unit: "each", rate: 1.00 },
  "pita":               { unit: "each", rate: 0.80 },
  "corn tortillas":     { unit: "each", rate: 0.215 },
  "corn tortilla":      { unit: "each", rate: 0.215 },
  "flour tortilla":     { unit: "each", rate: 0.40 },
  "flour tortillas":    { unit: "each", rate: 0.40 },
  "crackers":           { unit: "each", rate: 0.15 },
  "whole wheat crackers": { unit: "each", rate: 0.15 },

  // Nuts / Seeds
  "almonds":            { unit: "cup",  rate: 1.20 },
  "cashews":            { unit: "cup",  rate: 1.40 },
  "walnuts":            { unit: "tbsp", rate: 0.20 },
  "pecans":             { unit: "cup",  rate: 2.00 },
  "macadamia nuts":     { unit: "cup",  rate: 3.20 },
  "mixed nuts":         { unit: "cup",  rate: 1.30 },
  "sunflower seeds":    { unit: "cup",  rate: 1.00 },
  "chia seeds":         { unit: "tbsp", rate: 0.30 },
  "sesame seeds":       { unit: "tbsp", rate: 0.13 },
  "dried cranberries":  { unit: "cup",  rate: 1.60 },
  "dried mango":        { unit: "cup",  rate: 1.80 },
  "coconut flakes":     { unit: "cup",  rate: 1.00 },
  "pitted dates":       { unit: "cup",  rate: 1.20 },
  "dark chocolate chips": { unit: "cup", rate: 2.00 },

  // Nut butters
  "tahini":             { unit: "tbsp", rate: 0.20 },
  "almond butter":      { unit: "tbsp", rate: 0.30 },
  "hummus":             { unit: "tbsp", rate: 0.167 },

  // Seafood
  "salmon fillet":      { unit: "each", rate: 3.50 },
  "salmon fillets":     { unit: "each", rate: 3.50 },
  "cooked salmon leftovers": { unit: "oz", rate: 0.00 },
  "cod fillet":         { unit: "oz",   rate: 0.50 },
  "raw shrimp":         { unit: "oz",   rate: 0.46 },
  "shrimp":             { unit: "oz",   rate: 0.46 },

  // Oils & Sauces
  "olive oil":          { unit: "tbsp", rate: 0.15 },
  "sesame oil":         { unit: "tbsp", rate: 0.20 },
  "soy sauce":          { unit: "tbsp", rate: 0.075 },
  "hot sauce":          { unit: "tbsp", rate: 0.10 },
  "balsamic glaze":     { unit: "tbsp", rate: 0.30 },
  "balsamic vinegar":   { unit: "tbsp", rate: 0.15 },
  "maple syrup":        { unit: "tbsp", rate: 0.20 },
  "honey":              { unit: "tbsp", rate: 0.20 },
  "enchilada sauce":    { unit: "cup",  rate: 1.29 },
  "vegetable broth":    { unit: "cup",  rate: 0.30 },
  "lime juice":         { unit: "tbsp", rate: 0.15 },
  "lemon juice":        { unit: "tsp",  rate: 0.10 },
  "dijon mustard":      { unit: "tsp",  rate: 0.20 },
  "cocoa powder":       { unit: "tbsp", rate: 0.20 },

  // Spices & Seasonings
  "cumin":              { unit: "tsp",  rate: 0.08 },
  "chili powder":       { unit: "tsp",  rate: 0.08 },
  "turmeric":           { unit: "tsp",  rate: 0.08 },
  "italian seasoning":  { unit: "tsp",  rate: 0.08 },
  "garlic powder":      { unit: "tsp",  rate: 0.08 },
  "smoked paprika":     { unit: "tsp",  rate: 0.10 },
  "seasoning of choice":{ unit: "tsp",  rate: 0.08 },
  "gochujang":          { unit: "tbsp", rate: 0.40 },
  "korean chili paste": { unit: "tbsp", rate: 0.40 },
  "miso paste":         { unit: "tbsp", rate: 0.25 },
  "capers":             { unit: "tbsp", rate: 0.20 },
  "kalamata olives":    { unit: "cup",  rate: 2.40 },
  "olives":             { unit: "cup",  rate: 2.00 },
  "nori seaweed":       { unit: "each", rate: 0.30 },
  "nori":               { unit: "each", rate: 0.30 },
  "pretzels":           { unit: "cup",  rate: 0.80 },
};

// Default fallback price when lookup/parsing fails
const FALLBACK_PRICE = 0.50;

// ---------------------------------------------------------------------------
// Unit conversion helpers (to normalize parsed units to map units)
// ---------------------------------------------------------------------------

const UNIT_ALIASES: Record<string, string> = {
  cups: "cup",
  tbsps: "tbsp",
  tsps: "tsp",
  cloves: "clove",
  clove: "clove",
  bunches: "bunch",
  bunch: "bunch",
  cans: "can",
  can: "can",
  blocks: "block",
  block: "block",
  slices: "slice",
  slice: "slice",
  fillets: "fillet",
  fillet: "fillet",
  sheets: "each",
  sheet: "each",
  stalks: "each",
  stalk: "each",
  jars: "jar",
  jar: "jar",
  bags: "bag",
  bag: "bag",
  boxes: "box",
  box: "box",
  cartons: "carton",
  carton: "carton",
  bottles: "bottle",
  bottle: "bottle",
  dozens: "dozen",
  dozen: "dozen",
};

// Conversions between compatible units: from → to → multiplier
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  tbsp: { tsp: 3, cup: 1 / 16 },
  tsp:  { tbsp: 1 / 3, cup: 1 / 48 },
  cup:  { tbsp: 16, tsp: 48 },
  oz:   { lb: 1 / 16 },
  lb:   { oz: 16 },
};

/**
 * Container-to-measurement conversions.
 * Used when pantry input uses a container unit (e.g. "1 jar tomato sauce")
 * but recipe usage is in measurement units (e.g. "2 cups").
 * Map key = container unit, value = { toUnit, factor }.
 */
export const CONTAINER_CONVERSIONS: Record<string, { toUnit: string; factor: number }> = {
  jar:    { toUnit: "cup",  factor: 2 },     // 1 jar ≈ 2 cups
  bag:    { toUnit: "cup",  factor: 6 },     // 1 bag ≈ 6 cups (e.g. spinach)
  box:    { toUnit: "cup",  factor: 8 },     // 1 box ≈ 8 cups
  carton: { toUnit: "cup",  factor: 4 },     // 1 carton ≈ 4 cups
  bottle: { toUnit: "cup",  factor: 2 },     // 1 bottle ≈ 2 cups
  dozen:  { toUnit: "each", factor: 12 },    // 1 dozen = 12 each
};

function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return UNIT_ALIASES[lower] || lower;
}

export function convertQty(qty: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return qty;
  const table = UNIT_CONVERSIONS[fromUnit];
  if (table && table[toUnit] != null) return qty * table[toUnit];
  // reverse check
  const rev = UNIT_CONVERSIONS[toUnit];
  if (rev && rev[fromUnit] != null) return qty / rev[fromUnit];
  // container conversions
  const container = CONTAINER_CONVERSIONS[fromUnit];
  if (container && container.toUnit === toUnit) return qty * container.factor;
  // reverse container
  const revContainer = Object.entries(CONTAINER_CONVERSIONS).find(([, v]) => v.toUnit === fromUnit);
  if (revContainer && revContainer[0] === toUnit) return qty / revContainer[1].factor;
  return null;
}

// ---------------------------------------------------------------------------
// Ingredient string parser
// ---------------------------------------------------------------------------

// Matches patterns like: "1 can", "2.5 cups", "1/2 cup", "1 1/2 cups", "12 oz"
const QTY_UNIT_RE =
  /^([\d]+(?:[./][\d]+)?(?:\s+[\d]+\/[\d]+)?)\s*(cups?|cans?|tbsps?|tsps?|oz|lbs?|bunch(?:es)?|cloves?|blocks?|large|small|medium|slices?|sheets?|inch|fillets?|stalks?|jars?|bags?|box(?:es)?|cartons?|bottles?|dozens?)\b\s*/i;

// Matches just a leading number with no unit (including mixed numbers like "1 1/2")
const QTY_ONLY_RE = /^([\d]+(?:[./][\d]+)?(?:\s+[\d]+\/[\d]+)?)\s+/;

// Words to strip from the base name for normalization
const STRIP_WORDS =
  /\b(fresh|ripe|medium|large|small|frozen|cooked|dried|shredded|sliced|diced|chopped|minced|peeled|raw|whole|grated|crumbled|firm)\b/gi;

const PARENTHETICAL = /\s*\(.*?\)\s*/g;
const TRAILING_COMMA = /,.*$/;

function parseFraction(s: string): number {
  const trimmed = s.trim();
  // Mixed number: "1 1/2" → 1.5
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return Number(mixedMatch[1]) + Number(mixedMatch[2]) / Number(mixedMatch[3]);
  }
  // Simple fraction: "1/2"
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);
    return den ? num / den : Number(trimmed);
  }
  return Number(trimmed);
}

export function parseIngredient(raw: string): ParsedIngredient {
  let s = raw.trim();
  let qty = 1;
  let unit = "each";

  // Try qty + unit
  const qtyUnitMatch = s.match(QTY_UNIT_RE);
  if (qtyUnitMatch) {
    qty = parseFraction(qtyUnitMatch[1]);
    unit = normalizeUnit(qtyUnitMatch[2]);
    s = s.slice(qtyUnitMatch[0].length).trim();
  } else {
    // Try qty only (e.g. "2 bananas")
    const qtyMatch = s.match(QTY_ONLY_RE);
    if (qtyMatch) {
      qty = parseFraction(qtyMatch[1]);
      s = s.slice(qtyMatch[0].length).trim();
    }
  }

  // Clean up base name
  let baseName = s
    .replace(PARENTHETICAL, " ")   // remove parenthetical notes like "(15 oz)"
    .replace(TRAILING_COMMA, "")    // remove ", minced" etc.
    .replace(STRIP_WORDS, " ")      // remove adjectives
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Remove trailing 's' for simple plurals (but not words like "hummus", "oats")
  if (baseName.length > 3 && baseName.endsWith("s") && !baseName.endsWith("ss") && !baseName.endsWith("us") && !baseName.endsWith("oats")) {
    const singular = baseName.slice(0, -1);
    // Only de-pluralize if singular form exists in map OR base doesn't
    if (INGREDIENT_PRICE_MAP[singular] && !INGREDIENT_PRICE_MAP[baseName]) {
      baseName = singular;
    }
  }

  return { qty, unit, baseName };
}

// ---------------------------------------------------------------------------
// Cost computation
// ---------------------------------------------------------------------------

/**
 * Computes the cost for an ingredient string using the centralized price map.
 * Returns a numeric cost in USD.
 *
 * Fallback strategy:
 * 1. Direct name match → qty × rate (with unit conversion if needed)
 * 2. Substring match (ingredient name contains a map key) → same calc
 * 3. FALLBACK_PRICE
 */
export function computeIngredientCost(ingredientName: string): number {
  const { qty, unit, baseName } = parseIngredient(ingredientName);

  // Attempt direct match first, then substring
  let entry = INGREDIENT_PRICE_MAP[baseName];

  if (!entry) {
    // Try finding a key that the baseName contains or that contains baseName
    // Sort by key length descending so longer, more specific names match first
    const sortedEntries = Object.entries(INGREDIENT_PRICE_MAP)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [key, val] of sortedEntries) {
      if (baseName.includes(key) || key.includes(baseName)) {
        entry = val;
        break;
      }
    }
  }

  if (!entry) return Math.round(qty * FALLBACK_PRICE * 100) / 100;

  const mapUnit = entry.unit;

  // If units match, simple multiply
  if (unit === mapUnit) {
    return Math.round(qty * entry.rate * 100) / 100;
  }

  // Try unit conversion
  const converted = convertQty(qty, unit, mapUnit);
  if (converted != null) {
    return Math.round(converted * entry.rate * 100) / 100;
  }

  // Units don't match and can't convert — assume qty is in the map's unit
  // (e.g. "6 small corn tortillas" → unit=each, map unit=each)
  return Math.round(qty * entry.rate * 100) / 100;
}
