export interface Meal {
  id: string;
  day: string;
  name: string;
  duration: string;
  servings: number;
  tags: string[];
  reuseBadges: string[];
  estimatedCost: string;
  ingredients: { name: string; note?: string; pantry?: boolean }[];
  steps: string[];
}

export interface PlanData {
  metrics: {
    dinners: number;
    costRange: string;
    reuseScore: string;
  };
  meals: Meal[];
  shoppingList: {
    produce: string[];
    pantry: string[];
    dairy: string[];
    totalItems: number;
    estimatedCost: string;
  };
}

export interface FormInputs {
  budget: string;
  meals: string;
  dietary: string;
  cuisines: string[];
  pantryItems: string[];
  preference: string;
}

// Recipe pool organized by cuisine leaning
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
      { name: "1 can chickpeas", pantry: true },
      { name: "1 cup coconut milk" },
      { name: "1 bunch cilantro", note: "used in multiple meals" },
      { name: "1 cup rice", pantry: true },
      { name: "1 onion" },
      { name: "2 cloves garlic" },
    ],
    steps: [
      "Sauté onions + garlic 3-4 min",
      "Add spices, toast 1 min",
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
      { name: "8 oz spaghetti", pantry: true },
      { name: "2 lemons" },
      { name: "3 cloves garlic" },
      { name: "Fresh parsley" },
      { name: "Olive oil" },
      { name: "Parmesan cheese" },
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
      { name: "1 can black beans", pantry: true },
      { name: "6 small tortillas" },
      { name: "1 avocado" },
      { name: "1 lime" },
      { name: "1 cup shredded cabbage" },
      { name: "Hot sauce" },
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
      { name: "8 oz penne", pantry: true },
      { name: "1 can crushed tomatoes" },
      { name: "1 cup cheddar cheese" },
      { name: "1 bell pepper" },
      { name: "Italian seasoning" },
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
      { name: "2 bell peppers" },
      { name: "1 cup broccoli" },
      { name: "1 cup rice", pantry: true },
      { name: "Soy sauce" },
      { name: "Fresh ginger" },
    ],
    steps: [
      "Cook rice according to package",
      "Stir-fry vegetables on high heat 5 min",
      "Add soy sauce & ginger, toss to coat",
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
      { name: "1 block tofu" },
      { name: "1 bell pepper" },
      { name: "1 zucchini" },
      { name: "Olive oil" },
      { name: "Seasoning of choice" },
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
      { name: "1 cup arborio rice", pantry: true },
      { name: "8 oz mushrooms" },
      { name: "1 onion" },
      { name: "2 cups vegetable broth" },
      { name: "Parmesan cheese" },
      { name: "2 cloves garlic" },
    ],
    steps: [
      "Sauté onion & garlic, add mushrooms until golden",
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
      { name: "2 sweet potatoes" },
      { name: "1 can kidney beans", pantry: true },
      { name: "1 can diced tomatoes" },
      { name: "1 onion" },
      { name: "Chili powder" },
      { name: "Cumin" },
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
      { name: "8 oz noodles", pantry: true },
      { name: "3 tbsp peanut butter" },
      { name: "2 tbsp soy sauce" },
      { name: "1 lime" },
      { name: "1 carrot, shredded" },
      { name: "Green onions" },
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
      { name: "2 flatbreads" },
      { name: "Fresh mozzarella" },
      { name: "2 tomatoes" },
      { name: "Fresh basil" },
      { name: "Balsamic glaze" },
      { name: "Olive oil" },
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
      { name: "2 cups cooked rice", pantry: true },
      { name: "3 eggs" },
      { name: "1 cup frozen peas" },
      { name: "Soy sauce" },
      { name: "Sesame oil" },
      { name: "Green onions" },
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
      { name: "2 large tortillas" },
      { name: "1 cucumber" },
      { name: "1 cup cherry tomatoes" },
      { name: "Feta cheese" },
      { name: "Kalamata olives" },
      { name: "Hummus" },
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
      const key = ing.name.replace(/^\d+\s*(cups?|cans?|tbsp|oz|blocks?|bunch(es)?|cloves?|large|small)?\s*/i, "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        ingredientCount.set(key, (ingredientCount.get(key) || 0) + 1);
      }
    }
  }
  return ingredientCount;
}

export function generatePlan(inputs?: FormInputs): PlanData {
  const numMeals = Math.min(7, Math.max(2, parseInt(inputs?.meals || "5") || 5));
  const budgetNum = parseFloat(inputs?.budget || "60") || 60;
  const perMealBudget = budgetNum / numMeals;

  // Use current timestamp as seed for variety
  const seed = Date.now();
  const shuffled = seededShuffle(RECIPE_POOL, seed);
  const selected = shuffled.slice(0, numMeals);

  // If preference is savings, sort by cost (cheapest first); variety keeps shuffle order
  if (inputs?.preference === "savings") {
    selected.sort((a, b) => parseFloat(a.estimatedCost.replace("$", "")) - parseFloat(b.estimatedCost.replace("$", "")));
  }

  // Calculate shared ingredients for reuse badges
  const shared = findSharedIngredients(selected);
  const reuseEntries = [...shared.entries()].filter(([, count]) => count >= 2);
  const totalIngredients = selected.reduce((sum, m) => sum + m.ingredients.length, 0);
  const reusedIngredients = reuseEntries.reduce((sum, [, count]) => sum + count, 0);
  const reusePercent = totalIngredients > 0 ? Math.round((reusedIngredients / totalIngredients) * 100) : 0;

  // Build meals with days and reuse badges
  const meals: Meal[] = selected.map((recipe, i) => {
    const badges: string[] = [];
    const pantryCount = recipe.ingredients.filter((ing) => ing.pantry).length;
    if (pantryCount > 0) {
      badges.push(`Uses ${pantryCount} pantry item${pantryCount > 1 ? "s" : ""}`);
    }
    // Check which ingredients are shared
    for (const ing of recipe.ingredients) {
      const key = ing.name.replace(/^\d+\s*(cups?|cans?|tbsp|oz|blocks?|bunch(es)?|cloves?|large|small)?\s*/i, "").toLowerCase().trim();
      const count = shared.get(key) || 0;
      if (count >= 2) {
        badges.push(`${key} used in ${count} meals`);
        break; // only show one shared badge per meal
      }
    }
    badges.push(`Est. cost: ~${recipe.estimatedCost}`);

    // Scale cost to fit budget
    const baseCost = parseFloat(recipe.estimatedCost.replace("$", ""));
    const scaleFactor = perMealBudget / 5; // 5 is roughly average base cost
    const adjustedCost = Math.max(2, baseCost * Math.min(1.5, Math.max(0.7, scaleFactor))).toFixed(2);

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

  // Build shopping list from all meals
  const produceItems = new Set<string>();
  const pantryItemsList = new Set<string>();
  const dairyItems = new Set<string>();

  const dairyKeywords = ["cheese", "milk", "butter", "yogurt", "cream", "eggs", "egg", "tofu", "mozzarella", "parmesan", "feta", "cheddar"];
  const pantryKeywords = ["rice", "pasta", "noodle", "spaghetti", "penne", "beans", "chickpeas", "lentils", "flour", "oil", "sauce", "seasoning", "spice", "cumin", "chili", "broth", "peanut butter", "tortilla", "flatbread", "hot sauce", "soy sauce", "balsamic"];

  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const lower = ing.name.toLowerCase();
      if (dairyKeywords.some((k) => lower.includes(k))) {
        dairyItems.add(ing.name);
      } else if (ing.pantry || pantryKeywords.some((k) => lower.includes(k))) {
        pantryItemsList.add(ing.name);
      } else {
        produceItems.add(ing.name);
      }
    }
  }

  // Add user's pantry items as already-have
  if (inputs?.pantryItems) {
    for (const item of inputs.pantryItems) {
      pantryItemsList.add(`${item} ✓ (on hand)`);
    }
  }

  const produce = [...produceItems];
  const pantry = [...pantryItemsList];
  const dairy = [...dairyItems];
  const totalItems = produce.length + pantry.length + dairy.length;
  const totalCost = meals.reduce((sum, m) => sum + parseFloat(m.estimatedCost.replace("$", "")), 0);

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
      pantry,
      dairy,
      totalItems,
      estimatedCost: `$${Math.round(totalCost)}`,
    },
  };
}
