# Savr: Savor Food while Saving Money

Build a responsive mobile-first web app called "Savr" with this exact 3-screen workflow:

SCREEN 1: Input form (route "/")

- Title: "Savr: savor food while saving money" 

- Form fields (stacked vertically): 
 * Number input: "Weekly budget" ($ placeholder)

  * Number input: "Number of meals" 

  * Text input: "Dietary needs" (e.g. "vegetarian")

  * Chips/checkboxes: "Cuisine of choice (select 2-3)" with options Italian, Thai, American + "Add cuisine" text field

  * Pantry items: checkboxes "Eggs", "Milk", "Butter" + "Add items" text field

  * Radio buttons: "Preference" with "Reuse/maximize savings", "Balanced", "Maximize variety"

- Primary button: "Generate plan"

SCREEN 2: Weekly plan (route "/plan")

When form submits, navigate here showing:

- Top 3 metric cards:

  * "5 dinners planned" 

  * "Estimated cost: $54–$60"

  * "Reuse score: 82% of ingredients used in 2+ meals"

- Subtitle: "This week at a glance"

- List of 5 tappable meal cards:

  * Mon: Chickpea Coconut Curry (30 min)

  * Tue: Leftover Curry w/ Salad  

  * Wed: Tomato Pasta Bake

  * Thu: Veggie Stir-fry

  * Fri: Sheet-pan Veggies & Tofu

- Bottom shopping list card: "Shopping list (12 items) – Est. $54"

  * Produce: 3 bell peppers, 1 bunch cilantro

  * Pantry: 1 bag rice, 2 cans chickpeas  

  * Dairy: 1 block cheddar

SCREEN 3: Recipe detail (route "/recipe/[id]")

When user taps any meal from Screen 2:

- Header: "Chickpea Coconut Curry"

- Tags: "30 mins · 2 servings · Vegetarian"

- Reuse badges: "Uses pantry: chickpeas, rice", "Cilantro used in 3 meals", "Est. cost: ~$4.80"

- Ingredients list w/ checkboxes:

  * 1 can chickpeas (pantry)

  * 1 cup coconut milk  

  * 1 bunch cilantro (used Tues/Thu too)

- Numbered steps:

  1. Sauté onions + garlic 3-4 min

  2. Add spices, toast 1 min  

  3. Add chickpeas + coconut milk, simmer

  4. Serve over rice, top w/ cilantro

- Bottom bar: "Back to week" | "Mark as cooked" buttons

Create mock `generatePlan()` function that returns this exact data structure when form submits. Make it fully clickable with navigation between all 3 screens. Use clean cards, neutral colors, mobile-first responsive design.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/388e0b65-5a5d-4f4d-9163-79e0b86aaaf0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
