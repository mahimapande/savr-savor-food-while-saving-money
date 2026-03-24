export interface Ingredient {
  name: string;
  note?: string;
  pantry?: boolean;
  cost: number; // per-item estimated cost in dollars
}

export interface Meal {
  id: string;
  day: string;
  name: string;
  duration: string;
  servings: number;
  tags: string[];
  reuseBadges: string[];
  estimatedCost: string;
  ingredients: Ingredient[];
  steps: string[];
}

export interface PlanData {
  metrics: {
    dinners: number;
    costRange: string;
    reuseScore: string;
  };
  meals: Meal[];
  shoppingList: ShoppingList;
}

export interface ShoppingListItem {
  name: string;
  cost: number;
}

export interface ShoppingList {
  produce: ShoppingListItem[];
  dairy: ShoppingListItem[];
  plantBased: ShoppingListItem[];
  dryGoods: ShoppingListItem[];
  spicesCondiments: ShoppingListItem[];
  totalItems: number;
  estimatedCost: string;
}

export interface FormInputs {
  budget: string;
  meals: string;
  dietary: string;
  cuisines: string[];
  pantryItems: string[];
  preference: string;
}

// Recipe pool with realistic quantities and per-item costs
const RECIPE_POOL: Omit<Meal, "day">[] = [
  {
    id: "chickpea-coconut-curry",
    name: "Chickpea Coconut Curry",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.80",
    ingredients: [
      { name: "1 can chickpeas (15 oz)", pantry: true, cost: 0.89 },
      { name: "1 can coconut milk (13.5 oz)", cost: 1.79 },
      { name: "1 bunch cilantro", note: "used in multiple meals", cost: 0.79 },
      { name: "1 cup jasmine rice", pantry: true, cost: 0.40 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp cumin", cost: 0.08 },
    ],
    steps: [
      "Sauté onions + garlic in olive oil 3-4 min",
      "Add cumin and spices, toast 1 min",
      "Add chickpeas + coconut milk, simmer 15 min",
      "Serve over rice, top w/ cilantro",
    ],
  },
  {
    id: "lemon-herb-pasta",
    name: "Lemon Herb Pasta",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$3.90",
    ingredients: [
      { name: "8 oz spaghetti", pantry: true, cost: 0.75 },
      { name: "2 lemons", cost: 0.80 },
      { name: "3 cloves garlic", cost: 0.30 },
      { name: "1 bunch fresh parsley", cost: 0.79 },
      { name: "2 tbsp olive oil", cost: 0.30 },
      { name: "1/4 cup grated parmesan cheese", cost: 0.95 },
    ],
    steps: [
      "Cook pasta al dente, reserve ½ cup pasta water",
      "Sauté garlic in olive oil 1 min",
      "Toss pasta with lemon juice, oil, pasta water",
      "Top with parsley & parmesan",
    ],
  },
  {
    id: "black-bean-tacos",
    name: "Black Bean Tacos",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.20",
    ingredients: [
      { name: "1 can black beans (15 oz)", pantry: true, cost: 0.79 },
      { name: "6 small corn tortillas", pantry: true, cost: 1.29 },
      { name: "1 ripe avocado", cost: 1.00 },
      { name: "1 lime", cost: 0.25 },
      { name: "1 cup shredded green cabbage", cost: 0.50 },
      { name: "1 tbsp hot sauce", cost: 0.10 },
      { name: "1 tsp cumin", cost: 0.08 },
      { name: "1 tsp chili powder", cost: 0.08 },
    ],
    steps: [
      "Heat and season black beans with cumin & chili powder",
      "Warm tortillas in a dry skillet",
      "Assemble tacos with beans, cabbage, avocado",
      "Squeeze lime over top, add hot sauce",
    ],
  },
  {
    id: "tomato-pasta-bake",
    name: "Tomato Pasta Bake",
    duration: "40 min",
    servings: 2,
    tags: ["40 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.20",
    ingredients: [
      { name: "8 oz penne pasta", pantry: true, cost: 0.75 },
      { name: "1 can crushed tomatoes (28 oz)", pantry: true, cost: 1.29 },
      { name: "1 cup shredded cheddar cheese (4 oz)", cost: 1.50 },
      { name: "1 medium bell pepper", cost: 1.00 },
      { name: "1 tsp Italian seasoning", cost: 0.08 },
      { name: "1 tbsp olive oil", cost: 0.15 },
    ],
    steps: [
      "Cook pasta al dente, drain",
      "Mix with crushed tomatoes & diced pepper",
      "Top with cheddar, bake at 375°F for 20 min",
      "Let cool 5 min before serving",
    ],
  },
  {
    id: "veggie-stir-fry",
    name: "Veggie Stir-fry",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.00",
    ingredients: [
      { name: "2 medium bell peppers", cost: 2.00 },
      { name: "1 cup broccoli florets (6 oz)", cost: 1.00 },
      { name: "1 cup jasmine rice", pantry: true, cost: 0.40 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 inch fresh ginger, minced", cost: 0.30 },
      { name: "1 tbsp sesame oil", cost: 0.20 },
    ],
    steps: [
      "Cook rice according to package",
      "Stir-fry vegetables on high heat 5 min",
      "Add soy sauce, ginger & sesame oil, toss to coat",
      "Serve over rice",
    ],
  },
  {
    id: "sheet-pan-veggies-tofu",
    name: "Sheet-pan Veggies & Tofu",
    duration: "35 min",
    servings: 2,
    tags: ["35 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$5.50",
    ingredients: [
      { name: "1 block firm tofu (14 oz)", cost: 2.29 },
      { name: "1 medium bell pepper", cost: 1.00 },
      { name: "1 medium zucchini", cost: 0.80 },
      { name: "2 tbsp olive oil", cost: 0.30 },
      { name: "1 tsp seasoning of choice", cost: 0.08 },
      { name: "1 cup jasmine rice", pantry: true, cost: 0.40 },
    ],
    steps: [
      "Press & cube tofu, chop veggies",
      "Toss everything in olive oil & seasoning",
      "Spread on sheet pan, bake 400°F 25 min",
      "Serve with rice or bread",
    ],
  },
  {
    id: "mushroom-risotto",
    name: "Mushroom Risotto",
    duration: "40 min",
    servings: 2,
    tags: ["40 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.80",
    ingredients: [
      { name: "1 cup arborio rice", pantry: true, cost: 0.80 },
      { name: "8 oz cremini mushrooms", cost: 2.49 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cups vegetable broth", pantry: true, cost: 0.60 },
      { name: "1/4 cup grated parmesan cheese", cost: 0.95 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 tbsp butter", cost: 0.20 },
    ],
    steps: [
      "Sauté onion & garlic in butter, add mushrooms until golden",
      "Add rice, stir 1 min to toast",
      "Add broth ½ cup at a time, stirring often",
      "Finish with parmesan, season to taste",
    ],
  },
  {
    id: "sweet-potato-chili",
    name: "Sweet Potato & Bean Chili",
    duration: "35 min",
    servings: 2,
    tags: ["35 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.50",
    ingredients: [
      { name: "2 medium sweet potatoes", cost: 1.60 },
      { name: "1 can kidney beans (15 oz)", pantry: true, cost: 0.89 },
      { name: "1 can diced tomatoes (14.5 oz)", pantry: true, cost: 0.99 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "1 tsp chili powder", cost: 0.08 },
      { name: "1 tsp cumin", cost: 0.08 },
      { name: "1 tbsp olive oil", cost: 0.15 },
    ],
    steps: [
      "Dice sweet potatoes, sauté onion 3 min",
      "Add sweet potatoes, beans, tomatoes, spices",
      "Simmer 25 min until potatoes are tender",
      "Serve with bread or rice",
    ],
  },
  {
    id: "peanut-noodles",
    name: "Peanut Noodles",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$3.70",
    ingredients: [
      { name: "8 oz rice noodles", pantry: true, cost: 1.29 },
      { name: "3 tbsp peanut butter", cost: 0.30 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 lime", cost: 0.25 },
      { name: "1 medium carrot, shredded", cost: 0.30 },
      { name: "2 green onions", cost: 0.20 },
    ],
    steps: [
      "Cook noodles, drain and rinse",
      "Whisk peanut butter, soy sauce, lime juice",
      "Toss noodles with sauce",
      "Top with carrot & green onions",
    ],
  },
  {
    id: "caprese-flatbread",
    name: "Caprese Flatbread",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.00",
    ingredients: [
      { name: "2 flatbreads (naan or pita)", pantry: true, cost: 1.99 },
      { name: "4 oz fresh mozzarella", cost: 2.49 },
      { name: "2 medium tomatoes", cost: 1.00 },
      { name: "1 bunch fresh basil", cost: 0.79 },
      { name: "1 tbsp balsamic glaze", cost: 0.30 },
      { name: "1 tbsp olive oil", cost: 0.15 },
    ],
    steps: [
      "Warm flatbreads in oven at 400°F 5 min",
      "Slice mozzarella & tomatoes",
      "Layer on flatbread with basil",
      "Drizzle with balsamic & olive oil",
    ],
  },
  {
    id: "egg-fried-rice",
    name: "Egg Fried Rice",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings"],
    reuseBadges: [],
    estimatedCost: "$2.80",
    ingredients: [
      { name: "2 cups cooked jasmine rice", pantry: true, cost: 0.40 },
      { name: "3 large eggs", cost: 0.75 },
      { name: "1 cup frozen peas (5 oz)", cost: 0.50 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tsp sesame oil", cost: 0.10 },
      { name: "2 green onions", cost: 0.20 },
    ],
    steps: [
      "Scramble eggs in hot wok, set aside",
      "Stir-fry rice on high heat 3 min",
      "Add peas, soy sauce, sesame oil",
      "Mix in eggs, top with green onions",
    ],
  },
  {
    id: "greek-salad-wrap",
    name: "Greek Salad Wraps",
    duration: "10 min",
    servings: 2,
    tags: ["10 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.10",
    ingredients: [
      { name: "2 large flour tortillas", pantry: true, cost: 0.80 },
      { name: "1 medium cucumber", cost: 0.60 },
      { name: "1 cup cherry tomatoes (6 oz)", cost: 1.50 },
      { name: "2 oz crumbled feta cheese", cost: 1.00 },
      { name: "1/4 cup kalamata olives", cost: 0.60 },
      { name: "3 tbsp hummus", cost: 0.50 },
    ],
    steps: [
      "Spread hummus on tortillas",
      "Dice cucumber, halve tomatoes",
      "Layer veggies, feta, olives on tortilla",
      "Roll tightly and slice in half",
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function findSharedIngredients(meals: Omit<Meal, "day">[]): Map<string, number> {
  const ingredientCount = new Map<string, number>();
  for (const meal of meals) {
    const seen = new Set<string>();
    for (const ing of meal.ingredients) {
      const key = ing.name.replace(/^\d+\s*(cups?|cans?|tbsp|tsp|oz|blocks?|bunch(es)?|cloves?|large|small|medium|inch|ripe)?\s*/i, "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        ingredientCount.set(key, (ingredientCount.get(key) || 0) + 1);
      }
    }
  }
  return ingredientCount;
}

// Categorization keywords
const DAIRY_KEYWORDS = ["cheese", "milk", "butter", "yogurt", "cream", "eggs", "egg", "mozzarella", "parmesan", "feta", "cheddar"];
const PLANT_BASED_KEYWORDS = ["tofu", "tempeh", "coconut milk", "oat milk", "almond milk", "soy milk", "plant-based"];
const DRY_GOODS_KEYWORDS = ["rice", "pasta", "noodle", "spaghetti", "penne", "beans", "chickpeas", "lentils", "flour", "sugar", "tortilla", "flatbread", "pita", "naan", "broth", "peanut butter", "hummus", "olives", "peas", "canned"];
const SPICE_KEYWORDS = ["oil", "sauce", "seasoning", "spice", "cumin", "chili powder", "italian seasoning", "ginger", "balsamic", "sesame oil", "hot sauce", "soy sauce", "vinegar"];

function categorizeItem(name: string): keyof Omit<ShoppingList, "totalItems" | "estimatedCost"> {
  const lower = name.toLowerCase();
  // Plant-based must be checked before dairy (coconut milk != dairy milk)
  if (PLANT_BASED_KEYWORDS.some((k) => lower.includes(k))) return "plantBased";
  if (DAIRY_KEYWORDS.some((k) => lower.includes(k))) return "dairy";
  if (SPICE_KEYWORDS.some((k) => lower.includes(k))) return "spicesCondiments";
  if (DRY_GOODS_KEYWORDS.some((k) => lower.includes(k))) return "dryGoods";
  return "produce";
}

export function generatePlan(inputs?: FormInputs): PlanData {
  const numMeals = Math.min(7, Math.max(2, parseInt(inputs?.meals || "5") || 5));
  const budgetNum = parseFloat(inputs?.budget || "60") || 60;
  const perMealBudget = budgetNum / numMeals;

  const seed = Date.now();
  const shuffled = seededShuffle(RECIPE_POOL, seed);
  const selected = shuffled.slice(0, numMeals);

  if (inputs?.preference === "savings") {
    selected.sort((a, b) => parseFloat(a.estimatedCost.replace("$", "")) - parseFloat(b.estimatedCost.replace("$", "")));
  }

  const shared = findSharedIngredients(selected);
  const reuseEntries = [...shared.entries()].filter(([, count]) => count >= 2);
  const totalIngredients = selected.reduce((sum, m) => sum + m.ingredients.length, 0);
  const reusedIngredients = reuseEntries.reduce((sum, [, count]) => sum + count, 0);
  const reusePercent = totalIngredients > 0 ? Math.round((reusedIngredients / totalIngredients) * 100) : 0;

  // Normalize user pantry items for matching
  const userPantrySet = new Set(
    (inputs?.pantryItems || []).map((p) => p.toLowerCase().trim())
  );

  const meals: Meal[] = selected.map((recipe, i) => {
    const badges: string[] = [];
    const pantryCount = recipe.ingredients.filter((ing) => ing.pantry).length;
    if (pantryCount > 0) {
      badges.push(`Uses ${pantryCount} pantry item${pantryCount > 1 ? "s" : ""}`);
    }
    for (const ing of recipe.ingredients) {
      const key = ing.name.replace(/^\d+\s*(cups?|cans?|tbsp|tsp|oz|blocks?|bunch(es)?|cloves?|large|small|medium|inch|ripe)?\s*/i, "").toLowerCase().trim();
      const count = shared.get(key) || 0;
      if (count >= 2) {
        badges.push(`${key} used in ${count} meals`);
        break;
      }
    }

    const scaleFactor = perMealBudget / 5;
    const baseCost = recipe.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const adjustedCost = Math.max(2, baseCost * Math.min(1.5, Math.max(0.7, scaleFactor))).toFixed(2);
    badges.push(`Est. cost: ~$${adjustedCost}`);

    return {
      ...recipe,
      day: DAYS[i],
      estimatedCost: `$${adjustedCost}`,
      reuseBadges: badges,
      tags: recipe.tags.map((t) =>
        inputs?.dietary && t === "Vegetarian" ? inputs.dietary : t
      ),
    };
  });

  // Build shopping list excluding user pantry items
  const lists: Record<string, Map<string, ShoppingListItem>> = {
    produce: new Map(),
    dairy: new Map(),
    plantBased: new Map(),
    dryGoods: new Map(),
    spicesCondiments: new Map(),
  };

  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const lower = ing.name.toLowerCase();
      // Skip if user already has this pantry item
      const isUserPantry = [...userPantrySet].some((p) => lower.includes(p));
      if (isUserPantry) continue;

      const category = categorizeItem(ing.name);
      if (!lists[category].has(ing.name)) {
        lists[category].set(ing.name, { name: ing.name, cost: ing.cost });
      }
    }
  }

  const produce = [...lists.produce.values()];
  const dairy = [...lists.dairy.values()];
  const plantBased = [...lists.plantBased.values()];
  const dryGoods = [...lists.dryGoods.values()];
  const spicesCondiments = [...lists.spicesCondiments.values()];
  const allItems = [...produce, ...dairy, ...plantBased, ...dryGoods, ...spicesCondiments];
  const totalCost = allItems.reduce((sum, item) => sum + item.cost, 0);

  const lowCost = Math.floor(totalCost * 0.9);
  const highCost = Math.ceil(totalCost * 1.1);

  return {
    metrics: {
      dinners: numMeals,
      costRange: `$${lowCost}–$${highCost}`,
      reuseScore: `${reusePercent}% of ingredients used in 2+ meals`,
    },
    meals,
    shoppingList: {
      produce,
      dairy,
      plantBased,
      dryGoods,
      spicesCondiments,
      totalItems: allItems.length,
      estimatedCost: `$${Math.round(totalCost)}`,
    },
  };
}
