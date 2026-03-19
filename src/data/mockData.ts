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

export function generatePlan(): PlanData {
  return {
    metrics: {
      dinners: 5,
      costRange: "$54–$60",
      reuseScore: "82% of ingredients used in 2+ meals",
    },
    meals: [
      {
        id: "chickpea-coconut-curry",
        day: "Mon",
        name: "Chickpea Coconut Curry",
        duration: "30 min",
        servings: 2,
        tags: ["30 mins", "2 servings", "Vegetarian"],
        reuseBadges: [
          "Uses pantry: chickpeas, rice",
          "Cilantro used in 3 meals",
          "Est. cost: ~$4.80",
        ],
        estimatedCost: "$4.80",
        ingredients: [
          { name: "1 can chickpeas", pantry: true },
          { name: "1 cup coconut milk" },
          { name: "1 bunch cilantro", note: "used Tues/Thu too" },
          { name: "1 cup rice", pantry: true },
          { name: "1 onion" },
          { name: "2 cloves garlic" },
        ],
        steps: [
          "Sauté onions + garlic 3-4 min",
          "Add spices, toast 1 min",
          "Add chickpeas + coconut milk, simmer",
          "Serve over rice, top w/ cilantro",
        ],
      },
      {
        id: "leftover-curry-salad",
        day: "Tue",
        name: "Leftover Curry w/ Salad",
        duration: "10 min",
        servings: 2,
        tags: ["10 mins", "2 servings", "Vegetarian"],
        reuseBadges: [
          "Reuses Monday's curry",
          "Cilantro used in 3 meals",
          "Est. cost: ~$2.50",
        ],
        estimatedCost: "$2.50",
        ingredients: [
          { name: "Leftover curry from Mon" },
          { name: "2 cups mixed greens" },
          { name: "Cilantro", note: "used Mon/Thu too" },
          { name: "Lemon juice" },
        ],
        steps: [
          "Reheat leftover curry",
          "Toss greens with lemon juice",
          "Plate curry alongside salad",
          "Garnish with cilantro",
        ],
      },
      {
        id: "tomato-pasta-bake",
        day: "Wed",
        name: "Tomato Pasta Bake",
        duration: "40 min",
        servings: 2,
        tags: ["40 mins", "2 servings", "Vegetarian"],
        reuseBadges: [
          "Uses pantry: pasta",
          "Cheddar used in 2 meals",
          "Est. cost: ~$5.20",
        ],
        estimatedCost: "$5.20",
        ingredients: [
          { name: "8 oz pasta", pantry: true },
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
        day: "Thu",
        name: "Veggie Stir-fry",
        duration: "25 min",
        servings: 2,
        tags: ["25 mins", "2 servings", "Vegetarian"],
        reuseBadges: [
          "Bell peppers used in 2 meals",
          "Cilantro used in 3 meals",
          "Est. cost: ~$4.00",
        ],
        estimatedCost: "$4.00",
        ingredients: [
          { name: "2 bell peppers" },
          { name: "1 cup broccoli" },
          { name: "1 cup rice", pantry: true },
          { name: "Soy sauce" },
          { name: "Cilantro", note: "used Mon/Tue too" },
        ],
        steps: [
          "Cook rice according to package",
          "Stir-fry vegetables on high heat 5 min",
          "Add soy sauce, toss to coat",
          "Serve over rice, garnish with cilantro",
        ],
      },
      {
        id: "sheet-pan-veggies-tofu",
        day: "Fri",
        name: "Sheet-pan Veggies & Tofu",
        duration: "35 min",
        servings: 2,
        tags: ["35 mins", "2 servings", "Vegetarian"],
        reuseBadges: [
          "Uses remaining veggies",
          "Maximizes ingredient reuse",
          "Est. cost: ~$5.50",
        ],
        estimatedCost: "$5.50",
        ingredients: [
          { name: "1 block tofu" },
          { name: "Remaining bell peppers" },
          { name: "1 zucchini" },
          { name: "Olive oil" },
          { name: "Seasoning of choice" },
        ],
        steps: [
          "Press & cube tofu, chop veggies",
          "Toss everything in olive oil & seasoning",
          "Spread on sheet pan, bake 400°F 25 min",
          "Serve with remaining rice",
        ],
      },
    ],
    shoppingList: {
      produce: ["3 bell peppers", "1 bunch cilantro", "1 zucchini", "1 bunch broccoli", "Mixed greens"],
      pantry: ["1 bag rice", "2 cans chickpeas", "1 can crushed tomatoes", "8 oz pasta", "Soy sauce"],
      dairy: ["1 block cheddar", "1 block tofu"],
      totalItems: 12,
      estimatedCost: "$54",
    },
  };
}
