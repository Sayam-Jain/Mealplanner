import json
import pandas as pd
from transformers import pipeline
from calorie_splitter import split_calories
from dish_filter import find_best_dish
from new_prompt_builder import build_prompt
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MealPlannerService:
    def __init__(self):
        """Initialize the meal planner service with required resources."""
        # Load dish libraries
        try:
            with open(
                r"D:\projects\Mealplanner\backend\dish_library\menu.json",
                "r",
                encoding="utf-8",
            ) as f:
                self.dish_pool = json.load(f)
            logger.info(f"Loaded {len(self.dish_pool)} dishes from library")
        except Exception as e:
            logger.error(f"Failed to load dishes: {e}")
            self.dish_pool = []

        # Set up text generation model
        try:
            self.generator = pipeline(
                "text2text-generation",
                model="MBZUAI/LaMini-Flan-T5-783M",
                max_new_tokens=150,
                truncation=True,
            )
            self.model_loaded = True
            logger.info("AI model successfully initialized")
        except Exception as e:
            logger.error(f"Failed to initialize AI model: {e}")
            self.generator = None
            self.model_loaded = False

    def generate_meal_plan(self, user_data, caloric_intake):
        """Generate meal plan for a user based on input data and caloric intake."""
        if isinstance(user_data, list):
            logger.warning("user_data is a list — using first item.")
            user_data = user_data[0]

        meal_freq = user_data.get("Meal_Frequency", "3 meals + 2 snacks")
        meal_calories = split_calories(caloric_intake, meal_freq)

        logger.info(f"Calorie Distribution Across Meals: {meal_calories}")

        meal_plan = {}

        for meal_name, kcal in meal_calories.items():
            dish_type = "snack" if meal_name.startswith("snack") else meal_name

            filtered_dishes = [
                dish for dish in self.dish_pool if dish.get("meal_type") == dish_type
            ]

            if not filtered_dishes:
                meal_plan[meal_name] = f"No {dish_type} dishes available."
                continue

            best_dish = find_best_dish(filtered_dishes, user_data)

            if not best_dish:
                meal_plan[meal_name] = f"No suitable {meal_name.title()} found."
                continue

            best_dish = best_dish[0] if isinstance(best_dish, list) else best_dish

            # Build and log prompt
            prompt = build_prompt(user_data, meal_name, kcal, best_dish)
            logger.info(f"Prompt for {meal_name.title()}:\n{prompt}")

            if not self.model_loaded:
                result = f"AI model unavailable. Recommended: {best_dish.get('cultural_significance', best_dish.get('name', meal_name))}"
            else:
                try:
                    model_output = self.generator(prompt)
                    logger.info(f"Model Output for {meal_name}: {model_output}")

                    if not model_output or "generated_text" not in model_output[0]:
                        result = "⚠️ Model returned no valid output."
                    else:
                        result = model_output[0]["generated_text"].strip()

                except Exception as e:
                    logger.error(f"Generation failed for {meal_name}: {str(e)}")
                    result = f"❌ Generation failed: {str(e)}"

            meal_plan[meal_name] = result

        return meal_plan, meal_calories


# Standalone usage function
def generate_standalone_meal_plan(user_data, caloric_intake):
    """Standalone function for generating meal plans outside of API context."""
    service = MealPlannerService()
    return service.generate_meal_plan(user_data, caloric_intake)
