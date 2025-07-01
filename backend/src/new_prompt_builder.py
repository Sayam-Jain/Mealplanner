# Enhanced Prompt Builder Including Protein Analysis
# File: new_prompt_builder.py


def build_prompt(user: dict, meal_name: str, calorie_limit: int, dish: dict) -> str:
    """Build a prompt including protein context so model replies include protein analysis."""
    goal = user.get("primary_goal", "general wellness").replace("_", " ").title()
    dietary = user.get("dietary_strictness", "Vegetarian").replace("-", " ").title()
    lifestyle = user.get("lifestyle_type", "Moderate").capitalize()
    region = user.get("Region", "North").title()
    flavor = user.get("flavor_preferences", "Mild").capitalize()
    meal_label = meal_name.replace("_", " ").title()

    dish_protein = dish.get("protein_grams", 0)
    tags = ", ".join(dish.get("diet_tags", []))
    health_benefits = ", ".join(dish.get("health_benefits", []))
    protein_source = dish.get("protein_source_type", "mixed")

    # Estimate user daily protein need roughly (1.5g/kg default) for context
    weight = user.get("weight_kg", 70)
    daily_protein_need = int(weight * 1.5)
    meal_protein_target = (
        int(daily_protein_need * 0.3)
        if meal_label.lower() != "snack"
        else int(daily_protein_need * 0.1)
    )

    prompt = f"""
You are a certified sports nutritionist focused on Indian cuisine.
Explain why the following {meal_label} dish is a great choice for the user below.
Make sure to reference: calories, *exact* protein grams, health goal, dietary preference, lifestyle, and cultural relevance.

User:
- Region: {region}
- Goal: {goal}
- Dietary Pref.: {dietary}
- Lifestyle: {lifestyle}
- Weight: {weight} kg (≈ Daily protein need {daily_protein_need} g)
- Target for this meal: {calorie_limit} kcal & {meal_protein_target} g protein

Dish:
- Name: {dish["name"]}
- Calories: {dish["calories"]} kcal
- Protein: {dish_protein} g ({protein_source})
- Diet Tags: {tags or "—"}
- Health Benefits: {health_benefits or "—"}
- Cultural Note: {dish.get("cultural_significance", "Traditional dish")}.

Reply **exactly in this structured markdown**:
**Recommended Dish**: <name>
**Why This Dish**: <2-3 sentences>
**Nutritional Highlights**: <calories & protein>
**Protein Analysis**: <link protein grams to user target>
**Cultural Context**: <1 sentence>
"""
    return prompt
