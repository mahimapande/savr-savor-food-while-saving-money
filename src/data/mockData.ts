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
  cooked?: boolean;
}

export interface PlanData {
  metrics: {
    dinners: number;
    costRange: string;
    costLow: number;
    costHigh: number;
    reuseScore: string;
  };
  meals: Meal[];
  shoppingList: ShoppingList;
  pantryItems: ShoppingListItem[]; // items excluded because user already has them
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
// Each recipe now has a cuisine tag for filtering
interface RecipeWithCuisine extends Omit<Meal, "day"> {
  cuisine: string;
}

const RECIPE_POOL: RecipeWithCuisine[] = [
  {
    id: "chickpea-coconut-curry",
    name: "Chickpea Coconut Curry",
    cuisine: "Indian",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.80",
    ingredients: [
      { name: "1 can chickpeas (15 oz)", cost: 0.89 },
      { name: "1 can coconut milk (13.5 oz)", cost: 1.79 },
      { name: "1 bunch cilantro", note: "used in multiple meals", cost: 0.79 },
      { name: "1 cup jasmine rice", cost: 0.40 },
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
    cuisine: "Italian",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$3.90",
    ingredients: [
      { name: "8 oz spaghetti", cost: 0.75 },
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
    cuisine: "Mexican",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.20",
    ingredients: [
      { name: "1 can black beans (15 oz)", cost: 0.79 },
      { name: "6 small corn tortillas", cost: 1.29 },
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
    cuisine: "Italian",
    duration: "40 min",
    servings: 2,
    tags: ["40 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.20",
    ingredients: [
      { name: "8 oz penne pasta", cost: 0.75 },
      { name: "1 can crushed tomatoes (28 oz)", cost: 1.29 },
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
    cuisine: "Thai",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.00",
    ingredients: [
      { name: "2 medium bell peppers", cost: 2.00 },
      { name: "1 cup broccoli florets (6 oz)", cost: 1.00 },
      { name: "1 cup jasmine rice", cost: 0.40 },
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
    cuisine: "American",
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
      { name: "1 cup jasmine rice", cost: 0.40 },
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
    cuisine: "Italian",
    duration: "40 min",
    servings: 2,
    tags: ["40 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.80",
    ingredients: [
      { name: "1 cup arborio rice", cost: 0.80 },
      { name: "8 oz cremini mushrooms", cost: 2.49 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cups vegetable broth", cost: 0.60 },
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
    cuisine: "American",
    duration: "35 min",
    servings: 2,
    tags: ["35 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.50",
    ingredients: [
      { name: "2 medium sweet potatoes", cost: 1.60 },
      { name: "1 can kidney beans (15 oz)", cost: 0.89 },
      { name: "1 can diced tomatoes (14.5 oz)", cost: 0.99 },
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
    id: "tahini-noodles",
    name: "Tahini Noodles",
    cuisine: "Thai",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$3.70",
    ingredients: [
      { name: "8 oz rice noodles", cost: 1.29 },
      { name: "2 tbsp tahini", cost: 0.40 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 lime", cost: 0.25 },
      { name: "1 medium carrot, shredded", cost: 0.30 },
      { name: "2 green onions", cost: 0.20 },
    ],
    steps: [
      "Cook noodles, drain and rinse",
      "Whisk tahini, soy sauce, lime juice",
      "Toss noodles with sauce",
      "Top with carrot & green onions",
    ],
  },
  {
    id: "caprese-flatbread",
    name: "Caprese Flatbread",
    cuisine: "Italian",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.00",
    ingredients: [
      { name: "2 flatbreads (naan or pita)", cost: 1.99 },
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
    cuisine: "Thai",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings"],
    reuseBadges: [],
    estimatedCost: "$2.80",
    ingredients: [
      { name: "2 cups cooked jasmine rice", cost: 0.40 },
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
    cuisine: "Greek",
    duration: "10 min",
    servings: 2,
    tags: ["10 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.10",
    ingredients: [
      { name: "2 large flour tortillas", cost: 0.80 },
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
  // --- Mexican ---
  {
    id: "veggie-burrito-bowl",
    name: "Veggie Burrito Bowl",
    cuisine: "Mexican",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$4.80",
    ingredients: [
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "1 can black beans (15 oz)", cost: 0.79 },
      { name: "1 ripe avocado", cost: 1.00 },
      { name: "1 cup corn kernels", cost: 0.60 },
      { name: "1 lime", cost: 0.25 },
      { name: "1 bunch cilantro", cost: 0.79 },
      { name: "1 tsp cumin", cost: 0.08 },
    ],
    steps: [
      "Cook rice with a squeeze of lime",
      "Heat black beans with cumin",
      "Assemble bowls: rice, beans, corn, avocado",
      "Top with cilantro and lime juice",
    ],
  },
  {
    id: "enchilada-casserole",
    name: "Enchilada Casserole",
    cuisine: "Mexican",
    duration: "35 min",
    servings: 2,
    tags: ["35 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.60",
    ingredients: [
      { name: "6 small corn tortillas", cost: 1.29 },
      { name: "1 can black beans (15 oz)", cost: 0.79 },
      { name: "1 cup enchilada sauce", cost: 1.29 },
      { name: "1 cup shredded cheddar cheese (4 oz)", cost: 1.50 },
      { name: "1 medium bell pepper", cost: 1.00 },
    ],
    steps: [
      "Layer tortillas, beans, sauce, and cheese in a baking dish",
      "Add diced bell pepper between layers",
      "Bake at 375°F for 20 min until bubbly",
      "Let cool 5 min before serving",
    ],
  },
  // --- Indian ---
  {
    id: "dal-tadka",
    name: "Dal Tadka",
    cuisine: "Indian",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$3.50",
    ingredients: [
      { name: "1 cup dried red lentils", cost: 0.90 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 can diced tomatoes (14.5 oz)", cost: 0.99 },
      { name: "1 tsp cumin", cost: 0.08 },
      { name: "1 tsp turmeric", cost: 0.08 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 cup jasmine rice", cost: 0.40 },
    ],
    steps: [
      "Boil lentils until soft, about 20 min",
      "Sauté onion and garlic, add cumin and turmeric",
      "Add tomatoes and cooked lentils, simmer 5 min",
      "Serve over rice",
    ],
  },
  {
    id: "aloo-gobi",
    name: "Aloo Gobi",
    cuisine: "Indian",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.20",
    ingredients: [
      { name: "2 medium potatoes", cost: 0.80 },
      { name: "2 cups cauliflower florets", cost: 1.50 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "1 can diced tomatoes (14.5 oz)", cost: 0.99 },
      { name: "1 tsp cumin", cost: 0.08 },
      { name: "1 tsp turmeric", cost: 0.08 },
      { name: "1 tbsp olive oil", cost: 0.15 },
    ],
    steps: [
      "Dice potatoes and chop cauliflower",
      "Sauté onion, add cumin and turmeric",
      "Add potatoes, cauliflower, and tomatoes",
      "Cover and cook 20 min until tender",
    ],
  },
  // --- Japanese ---
  {
    id: "teriyaki-tofu-bowl",
    name: "Teriyaki Tofu Bowl",
    cuisine: "Japanese",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.90",
    ingredients: [
      { name: "1 block firm tofu (14 oz)", cost: 2.29 },
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tbsp maple syrup", cost: 0.20 },
      { name: "1 tsp sesame oil", cost: 0.10 },
      { name: "1 cup broccoli florets (6 oz)", cost: 1.00 },
      { name: "1 medium carrot", cost: 0.30 },
    ],
    steps: [
      "Press and cube tofu, pan-sear until crispy",
      "Mix soy sauce, maple syrup, and sesame oil for teriyaki glaze",
      "Toss tofu in glaze, cook veggies",
      "Serve over rice",
    ],
  },
  {
    id: "miso-soup-rice",
    name: "Miso Soup with Rice",
    cuisine: "Japanese",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$3.20",
    ingredients: [
      { name: "2 tbsp miso paste", cost: 0.50 },
      { name: "1 block firm tofu (14 oz)", cost: 2.29 },
      { name: "2 green onions", cost: 0.20 },
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "1 sheet nori seaweed", cost: 0.30 },
    ],
    steps: [
      "Cook rice according to package",
      "Bring 3 cups water to a simmer, dissolve miso paste",
      "Add cubed tofu and sliced green onions",
      "Serve soup alongside rice, garnish with nori",
    ],
  },
  // --- Korean ---
  {
    id: "bibimbap",
    name: "Bibimbap Bowl",
    cuisine: "Korean",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegetarian"],
    reuseBadges: [],
    estimatedCost: "$5.00",
    ingredients: [
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "2 large eggs", cost: 0.50 },
      { name: "1 medium carrot", cost: 0.30 },
      { name: "1 cup spinach", cost: 0.80 },
      { name: "1 medium zucchini", cost: 0.80 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tbsp sesame oil", cost: 0.20 },
      { name: "1 tbsp gochujang (Korean chili paste)", cost: 0.40 },
    ],
    steps: [
      "Cook rice and prep vegetables by slicing thin",
      "Sauté each vegetable separately with sesame oil",
      "Fry eggs sunny-side up",
      "Assemble bowls: rice, veggies, egg, gochujang",
    ],
  },
  // --- Mediterranean ---
  {
    id: "falafel-plate",
    name: "Falafel Plate",
    cuisine: "Mediterranean",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.60",
    ingredients: [
      { name: "1 can chickpeas (15 oz)", cost: 0.89 },
      { name: "2 large flour tortillas", cost: 0.80 },
      { name: "1 medium cucumber", cost: 0.60 },
      { name: "2 medium tomatoes", cost: 1.00 },
      { name: "3 tbsp hummus", cost: 0.50 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp cumin", cost: 0.08 },
    ],
    steps: [
      "Mash chickpeas with cumin, form into patties",
      "Pan-fry in olive oil until golden",
      "Dice cucumber and tomatoes",
      "Serve falafel with pita, veggies, and hummus",
    ],
  },
  // --- Chinese ---
  {
    id: "mapo-tofu",
    name: "Mapo Tofu",
    cuisine: "Chinese",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.10",
    ingredients: [
      { name: "1 block firm tofu (14 oz)", cost: 2.29 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tsp chili powder", cost: 0.08 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "2 green onions", cost: 0.20 },
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "1 tbsp sesame oil", cost: 0.20 },
    ],
    steps: [
      "Cube tofu and set aside",
      "Sauté garlic in sesame oil, add chili powder",
      "Add tofu and soy sauce, simmer 10 min",
      "Serve over rice, top with green onions",
    ],
  },
  // --- French ---
  {
    id: "ratatouille",
    name: "Ratatouille",
    cuisine: "French",
    duration: "40 min",
    servings: 2,
    tags: ["40 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$5.30",
    ingredients: [
      { name: "1 medium zucchini", cost: 0.80 },
      { name: "1 medium eggplant", cost: 1.50 },
      { name: "1 medium bell pepper", cost: 1.00 },
      { name: "1 can crushed tomatoes (28 oz)", cost: 1.29 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp Italian seasoning", cost: 0.08 },
    ],
    steps: [
      "Dice all vegetables into similar-size pieces",
      "Sauté onion and garlic in olive oil",
      "Add all vegetables, tomatoes, and seasoning",
      "Simmer 30 min until tender, serve with bread",
    ],
  },
];
const PESCATARIAN_POOL: Omit<Meal, "day">[] = [
  {
    id: "grilled-salmon-veggies",
    name: "Grilled Salmon + Veggies",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$8.40",
    ingredients: [
      { name: "2 salmon fillets (6 oz each)", cost: 6.99 },
      { name: "1 medium zucchini", cost: 0.80 },
      { name: "1 medium bell pepper", cost: 1.00 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1/2 lemon", cost: 0.40 },
      { name: "1 tsp garlic powder", cost: 0.08 },
    ],
    steps: [
      "Season salmon with lemon, garlic powder, and salt",
      "Toss sliced veggies with olive oil",
      "Grill salmon 4-5 min per side and sear veggies",
      "Serve salmon with charred vegetables",
    ],
  },
  {
    id: "tuna-rice-bowl",
    name: "Tuna Rice Bowl",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$5.20",
    ingredients: [
      { name: "2 cans tuna in water (5 oz)", cost: 2.20 },
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "1 medium cucumber", cost: 0.60 },
      { name: "1 medium carrot", cost: 0.30 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tsp sesame oil", cost: 0.10 },
      { name: "2 green onions", cost: 0.20 },
    ],
    steps: [
      "Cook rice and let cool slightly",
      "Drain tuna and mix with soy sauce and sesame oil",
      "Slice cucumber and carrot thinly",
      "Assemble bowls and top with green onions",
    ],
  },
  {
    id: "shrimp-stir-fry",
    name: "Shrimp Stir-fry",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$7.10",
    ingredients: [
      { name: "12 oz raw shrimp, peeled", cost: 5.49 },
      { name: "1 cup broccoli florets (6 oz)", cost: 1.00 },
      { name: "1 medium bell pepper", cost: 1.00 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tsp sesame oil", cost: 0.10 },
    ],
    steps: [
      "Pat shrimp dry and season lightly",
      "Stir-fry shrimp on high heat for 2-3 min",
      "Add vegetables, garlic, soy sauce, and sesame oil",
      "Cook until crisp-tender and serve",
    ],
  },
  {
    id: "leftover-salmon-salad",
    name: "Leftover Salmon Salad",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$4.80",
    ingredients: [
      { name: "6 oz cooked salmon leftovers", cost: 0.00 },
      { name: "4 cups mixed greens", cost: 2.49 },
      { name: "1 medium cucumber", cost: 0.60 },
      { name: "1/2 lemon", cost: 0.40 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp Dijon mustard", cost: 0.20 },
    ],
    steps: [
      "Flake leftover salmon into bite-size pieces",
      "Whisk olive oil, lemon juice, and mustard",
      "Toss greens and cucumber with dressing",
      "Top with salmon and serve immediately",
    ],
  },
  {
    id: "cod-tacos",
    name: "Cod Tacos",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$6.90",
    ingredients: [
      { name: "10 oz cod fillet", cost: 4.99 },
      { name: "6 small corn tortillas", cost: 1.29 },
      { name: "1 cup shredded green cabbage", cost: 0.50 },
      { name: "1 lime", cost: 0.25 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp chili powder", cost: 0.08 },
    ],
    steps: [
      "Season cod with chili powder and salt",
      "Pan-sear cod in olive oil 3-4 min per side",
      "Warm tortillas and prep cabbage slaw with lime",
      "Build tacos with fish and slaw",
    ],
  },
  {
    id: "garlic-shrimp-pasta",
    name: "Garlic Shrimp Pasta",
    duration: "25 min",
    servings: 2,
    tags: ["25 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$7.40",
    ingredients: [
      { name: "8 oz spaghetti", cost: 0.75 },
      { name: "10 oz raw shrimp, peeled", cost: 4.99 },
      { name: "3 cloves garlic", cost: 0.30 },
      { name: "1/2 lemon", cost: 0.40 },
      { name: "2 tbsp olive oil", cost: 0.30 },
      { name: "1 bunch fresh parsley", cost: 0.79 },
    ],
    steps: [
      "Cook spaghetti until al dente",
      "Sauté shrimp and garlic in olive oil",
      "Add pasta, lemon juice, and parsley",
      "Toss and serve warm",
    ],
  },
  {
    id: "sardine-toast-plate",
    name: "Sardine Tomato Toast Plate",
    duration: "10 min",
    servings: 2,
    tags: ["10 mins", "2 servings", "Pescatarian"],
    reuseBadges: [],
    estimatedCost: "$4.90",
    ingredients: [
      { name: "2 cans sardines in olive oil (3.75 oz)", cost: 2.80 },
      { name: "4 slices whole-grain bread", cost: 0.80 },
      { name: "2 medium tomatoes", cost: 1.00 },
      { name: "1 tbsp capers", cost: 0.20 },
      { name: "1/2 lemon", cost: 0.40 },
    ],
    steps: [
      "Toast bread slices until crisp",
      "Slice tomatoes and drain sardines",
      "Top toast with tomatoes, sardines, and capers",
      "Finish with lemon juice",
    ],
  },
];

const VEGAN_EXTRA_POOL: Omit<Meal, "day">[] = [
  {
    id: "lentil-coconut-stew",
    name: "Lentil Coconut Stew",
    duration: "35 min",
    servings: 2,
    tags: ["35 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.60",
    ingredients: [
      { name: "1 cup dried red lentils", cost: 0.90 },
      { name: "1 can coconut milk (13.5 oz)", cost: 1.79 },
      { name: "1 can diced tomatoes (14.5 oz)", cost: 0.99 },
      { name: "1 medium yellow onion", cost: 0.50 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 tsp cumin", cost: 0.08 },
    ],
    steps: [
      "Sauté onion and garlic",
      "Add lentils, tomatoes, coconut milk, and cumin",
      "Simmer 25 minutes until lentils are tender",
      "Season and serve",
    ],
  },
  {
    id: "tofu-rice-bowl",
    name: "Crispy Tofu Rice Bowl",
    duration: "30 min",
    servings: 2,
    tags: ["30 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$5.30",
    ingredients: [
      { name: "1 block firm tofu (14 oz)", cost: 2.29 },
      { name: "1 cup jasmine rice", cost: 0.40 },
      { name: "1 cup broccoli florets (6 oz)", cost: 1.00 },
      { name: "1 medium carrot", cost: 0.30 },
      { name: "2 tbsp soy sauce", cost: 0.15 },
      { name: "1 tbsp sesame oil", cost: 0.20 },
    ],
    steps: [
      "Cook rice according to package",
      "Press and cube tofu, pan-sear until crispy",
      "Cook vegetables and add sauce",
      "Assemble bowls with rice, tofu, and veggies",
    ],
  },
  {
    id: "chickpea-shawarma-wrap",
    name: "Chickpea Shawarma Wrap",
    duration: "20 min",
    servings: 2,
    tags: ["20 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$4.10",
    ingredients: [
      { name: "1 can chickpeas (15 oz)", cost: 0.89 },
      { name: "2 large flour tortillas", cost: 0.80 },
      { name: "1 cup shredded green cabbage", cost: 0.50 },
      { name: "1 medium cucumber", cost: 0.60 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp seasoning of choice", cost: 0.08 },
    ],
    steps: [
      "Roast chickpeas in oil and seasoning",
      "Slice cucumber and prep cabbage",
      "Warm tortillas",
      "Fill wraps with chickpeas and veggies",
    ],
  },
  {
    id: "tomato-white-bean-toast",
    name: "Tomato White Bean Toast",
    duration: "15 min",
    servings: 2,
    tags: ["15 mins", "2 servings", "Vegan"],
    reuseBadges: [],
    estimatedCost: "$3.90",
    ingredients: [
      { name: "1 can cannellini beans (15 oz)", cost: 1.09 },
      { name: "4 slices whole-grain bread", cost: 0.80 },
      { name: "2 medium tomatoes", cost: 1.00 },
      { name: "2 cloves garlic", cost: 0.20 },
      { name: "1 tbsp olive oil", cost: 0.15 },
      { name: "1 tsp Italian seasoning", cost: 0.08 },
    ],
    steps: [
      "Toast bread until golden",
      "Mash beans with garlic, oil, and seasoning",
      "Slice tomatoes",
      "Spread beans on toast and top with tomatoes",
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIETARY_TAGS = ["Vegetarian", "Vegan", "Pescatarian"];

type DietaryPreference = "vegetarian" | "vegan" | "pescatarian" | "any";

function normalizeDietary(value?: string): DietaryPreference {
  const dietary = (value || "").toLowerCase().trim();
  if (dietary.includes("pesc")) return "pescatarian";
  if (dietary.includes("vegan")) return "vegan";
  if (dietary.includes("veget")) return "vegetarian";
  return "any";
}

function getDietaryTag(preference: DietaryPreference): string | null {
  if (preference === "any") return null;
  if (preference === "pescatarian") return "Pescatarian ✓";
  if (preference === "vegan") return "Vegan ✓";
  return "Vegetarian ✓";
}

function matchesDiet(recipe: Omit<Meal, "day">, preference: DietaryPreference): boolean {
  const hasTag = (tag: string) => recipe.tags.some((t) => t.toLowerCase() === tag.toLowerCase());
  if (preference === "pescatarian") return hasTag("Pescatarian");
  if (preference === "vegan") return hasTag("Vegan");
  if (preference === "vegetarian") return hasTag("Vegetarian") || hasTag("Vegan");
  return true;
}

function ensureMealCount(recipes: Omit<Meal, "day">[], count: number): Omit<Meal, "day">[] {
  if (recipes.length >= count) return recipes.slice(0, count);
  if (recipes.length === 0) return [];

  const completed = [...recipes];
  let i = 0;
  while (completed.length < count) {
    const base = recipes[i % recipes.length];
    const variantNumber = Math.floor(i / recipes.length) + 2;
    completed.push({
      ...base,
      id: `${base.id}-v${variantNumber}`,
      name: `${base.name} (Variation ${variantNumber})`,
    });
    i += 1;
  }
  return completed;
}

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
const NUT_BUTTER_KEYWORDS = ["almond butter", "cashew butter", "nut butter", "tahini"];
const DRY_GOODS_KEYWORDS = ["rice", "pasta", "noodle", "spaghetti", "penne", "beans", "chickpeas", "lentils", "flour", "sugar", "tortilla", "flatbread", "pita", "naan", "broth", "almond butter", "cashew butter", "nut butter", "tahini", "hummus", "olives", "peas", "canned", "bread"];
const SPICE_KEYWORDS = ["oil", "sauce", "seasoning", "spice", "cumin", "chili powder", "italian seasoning", "ginger", "balsamic", "sesame oil", "hot sauce", "soy sauce", "vinegar", "mustard", "capers"];

export function categorizeItem(name: string): keyof Omit<ShoppingList, "totalItems" | "estimatedCost"> {
  const lower = name.toLowerCase();
  if (PLANT_BASED_KEYWORDS.some((k) => lower.includes(k))) return "plantBased";
  // Check nut butters / tahini before dairy so they don't match "butter"
  if (NUT_BUTTER_KEYWORDS.some((k) => lower.includes(k))) return "dryGoods";
  if (DRY_GOODS_KEYWORDS.some((k) => lower.includes(k))) return "dryGoods";
  if (DAIRY_KEYWORDS.some((k) => lower.includes(k))) return "dairy";
  if (SPICE_KEYWORDS.some((k) => lower.includes(k))) return "spicesCondiments";
  return "produce";
}

export function generatePlan(inputs?: FormInputs): PlanData {
  const numMeals = Math.min(7, Math.max(2, parseInt(inputs?.meals || "5") || 5));
  const budgetNum = parseFloat(inputs?.budget || "60") || 60;
  const perMealBudget = budgetNum / numMeals;
  const dietaryPreference = normalizeDietary(inputs?.dietary);
  const dietaryTag = getDietaryTag(dietaryPreference);
  const mergedPool = [...RECIPE_POOL, ...PESCATARIAN_POOL, ...VEGAN_EXTRA_POOL];

  const seed = Date.now();
  const filteredPool = mergedPool.filter((recipe) => matchesDiet(recipe, dietaryPreference));

  let selectedBase: Omit<Meal, "day">[];
  if (dietaryPreference === "pescatarian") {
    const anchorIds = [
      "grilled-salmon-veggies",
      "tuna-rice-bowl",
      "shrimp-stir-fry",
      "leftover-salmon-salad",
    ];
    const anchors = anchorIds
      .map((id) => PESCATARIAN_POOL.find((recipe) => recipe.id === id))
      .filter((recipe): recipe is Omit<Meal, "day"> => Boolean(recipe));
    const extras = seededShuffle(
      PESCATARIAN_POOL.filter((recipe) => !anchorIds.includes(recipe.id)),
      seed
    );
    selectedBase = ensureMealCount([...anchors, ...extras], numMeals);
  } else {
    selectedBase = ensureMealCount(seededShuffle(filteredPool, seed), numMeals);
  }

  const selected = selectedBase.length > 0
    ? selectedBase
    : ensureMealCount(seededShuffle(mergedPool, seed), numMeals);

  if (inputs?.preference === "savings") {
    selected.sort((a, b) => parseFloat(a.estimatedCost.replace("$", "")) - parseFloat(b.estimatedCost.replace("$", "")));
  }

  const shared = findSharedIngredients(selected);
  const reuseEntries = [...shared.entries()].filter(([, count]) => count >= 2);
  const totalIngredients = selected.reduce((sum, m) => sum + m.ingredients.length, 0);
  const reusedIngredients = reuseEntries.reduce((sum, [, count]) => sum + count, 0);
  const reusePercent = totalIngredients > 0 ? Math.round((reusedIngredients / totalIngredients) * 100) : 0;

  // Build pantry matchers early so we can mark ingredients
  const userPantryListEarly = Array.from(
    new Set((inputs?.pantryItems || []).map((p) => p.trim()).filter(Boolean))
  );
  const STRIP_QTY_RE_EARLY = /^[\d./]+\s*/;
  const STRIP_UNIT_RE_EARLY = /^(cups?|gallons?|sticks?|cans?|tbsp|tsp|oz|lbs?|large|small|medium|dozen|bunch(es)?|cloves?|blocks?|bags?|boxes?|bottles?|jars?|cartons?|pints?|quarts?|liters?)\s+/i;
  function extractBaseNameEarly(input: string): string {
    let s = input.toLowerCase().trim();
    s = s.replace(STRIP_QTY_RE_EARLY, "").trim();
    s = s.replace(STRIP_UNIT_RE_EARLY, "").trim();
    s = s.replace(STRIP_UNIT_RE_EARLY, "").trim();
    return s || input.toLowerCase().trim();
  }
  const pantryMatchersEarly = userPantryListEarly.map((raw) => ({
    raw,
    baseName: extractBaseNameEarly(raw),
  }));

  function isUserPantryItem(ingredientName: string): boolean {
    const lower = ingredientName.toLowerCase();
    return pantryMatchersEarly.some(({ baseName }) => {
      const regex = new RegExp(`(^|\\s|\\d)${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?($|\\s|,)`, 'i');
      return regex.test(lower);
    });
  }

  const meals: Meal[] = selected.map((recipe, i) => {
    const badges: string[] = [];
    // Mark ingredients as pantry based on user input
    const ingredients = recipe.ingredients.map((ing) => ({
      ...ing,
      pantry: isUserPantryItem(ing.name),
    }));
    const pantryCount = ingredients.filter((ing) => ing.pantry).length;
    if (pantryCount > 0) {
      badges.push(`Uses ${pantryCount} pantry item${pantryCount > 1 ? "s" : ""}`);
    }
    for (const ing of ingredients) {
      const key = ing.name.replace(/^\d+\s*(cups?|cans?|tbsp|tsp|oz|blocks?|bunch(es)?|cloves?|large|small|medium|inch|ripe)?\s*/i, "").toLowerCase().trim();
      const count = shared.get(key) || 0;
      if (count >= 2) {
        badges.push(`${key} used in ${count} meals`);
        break;
      }
    }

    const scaleFactor = perMealBudget / 5;
    const baseCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const adjustedCost = Math.max(2, baseCost * Math.min(1.5, Math.max(0.7, scaleFactor))).toFixed(2);
    badges.push(`Est. cost: ~$${adjustedCost}`);

    return {
      ...recipe,
      ingredients,
      day: DAYS[i],
      estimatedCost: `$${adjustedCost}`,
      reuseBadges: badges,
      tags: dietaryTag
        ? [...recipe.tags.filter((tag) => !DIETARY_TAGS.includes(tag)), dietaryTag]
        : recipe.tags,
      cooked: false,
    };
  });

  const userPantryList = userPantryListEarly;
  const pantryMatchers = pantryMatchersEarly;
  const pantryCostAccumulator = new Map<string, number>(
    userPantryList.map((item) => [item, 0])
  );

  const lists: Record<string, ShoppingListItem[]> = {
    produce: [],
    dairy: [],
    plantBased: [],
    dryGoods: [],
    spicesCondiments: [],
  };

  const allIngredients: ShoppingListItem[] = meals.flatMap((meal) =>
    meal.ingredients.map((ing) => ({ name: ing.name, cost: ing.cost }))
  );

  for (const ing of allIngredients) {
    const lower = ing.name.toLowerCase();
    const matchedPantry = pantryMatchers.find(({ baseName }) => {
      const regex = new RegExp(`(^|\\s|\\d)${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?($|\\s|,)`, 'i');
      return regex.test(lower);
    });

    if (matchedPantry) {
      pantryCostAccumulator.set(
        matchedPantry.raw,
        (pantryCostAccumulator.get(matchedPantry.raw) || 0) + ing.cost
      );
      continue;
    }

    const category = categorizeItem(ing.name);
    lists[category].push({ name: ing.name, cost: ing.cost });
  }

  const pantryItemsList: ShoppingListItem[] = userPantryList.map((name) => ({
    name,
    cost: pantryCostAccumulator.get(name) || 0,
  }));

  const produce = lists.produce;
  const dairy = lists.dairy;
  const plantBased = lists.plantBased;
  const dryGoods = lists.dryGoods;
  const spicesCondiments = lists.spicesCondiments;
  const allShoppingItems = [...produce, ...dairy, ...plantBased, ...dryGoods, ...spicesCondiments];
  const totalCost = allShoppingItems.reduce((sum, item) => sum + item.cost, 0);

  const lowCost = Math.floor(totalCost * 0.9);
  const highCost = Math.ceil(totalCost * 1.1);



  return {
    metrics: {
      dinners: numMeals,
      costRange: `$${lowCost}–$${highCost}`,
      costLow: lowCost,
      costHigh: highCost,
      reuseScore: `${reusePercent}% of ingredients used in 2+ meals`,
    },
    meals,
    shoppingList: {
      produce,
      dairy,
      plantBased,
      dryGoods,
      spicesCondiments,
      totalItems: allShoppingItems.length,
      estimatedCost: `$${Math.round(totalCost)}`,
    },
    pantryItems: pantryItemsList,
  };
}
