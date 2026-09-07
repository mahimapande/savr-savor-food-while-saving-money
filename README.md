# Savr — AI Meal Planning for Smarter Grocery Spending

Savr is an AI-powered meal-planning assistant for budget-conscious home cooks. It turns a user’s budget, pantry inventory, dietary needs, and meal preferences into a personalized weekly meal plan, grocery list, and estimated grocery spend.

## The Problem

Meal planning is time-consuming, grocery costs are uncertain, and ingredients already at home often go unused. Savr helps users plan meals around real constraints before they shop.

## What Savr Does

- Captures a weekly budget, pantry items, dietary needs, cuisine preferences, and selected meal days
- Generates a personalized weekly meal plan
- Produces a grocery list that separates pantry items from items to purchase
- Estimates total grocery spend and remaining budget
- Reuses ingredients across meals to help reduce food waste
- Validates AI output before it is displayed in the app

## Architecture

```text
User Inputs
  → Structured JSON Request
  → Planner Service
  → GPT-4o-mini Meal Generation
  → Validation & Guardrails
  → Savr UI
```

The validation layer parses structured JSON output and applies retry logic, meal trimming, cuisine normalization, and constraint checks before rendering the final plan.

## Evaluation Approach

Savr uses scenario-based testing across a 3 × 3 × 3 grid:

- **Budgets:** $60, $100, and $140
- **Pantry levels:** almost empty, medium, and well-stocked
- **Diet/allergy profiles:** vegetarian; vegetarian + nut-free; pescatarian + gluten-free

Key evaluation checks:

- Plan completeness — all requested meal slots are present
- Budget fit — estimated cost remains within the selected budget
- Diet safety — restricted ingredients are absent
- Pantry utilization — pantry ingredients are reused in the plan
- Output validity — generated JSON passes validation

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase and Edge Functions
- **AI:** GPT-4o-mini with structured JSON outputs
- **Product development:** Lovable

## Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/mahimapande/savr-savor-food-while-saving-money.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a local environment file:
   ```bash
   cp .env.example .env
   ```
4. Add your own Supabase project configuration to `.env`.
5. Start the development server:
   ```bash
   npm run dev
   ```

> Never commit `.env` files or API keys. Use environment variables and backend secrets for sensitive credentials.

## Roadmap

- Improve cost estimation with localized, real-time grocery pricing
- Add ingredient substitutions based on availability and budget
- Explain why meals were selected for each plan
- Expand user testing and measure activation, budget fit, and retention

## Demo

This is a beta capstone project. A live product demo and screenshots will be added here.
