# Enhanced Dish Filter with Protein Optimization
# File: dish_filter.py

import random
from typing import List, Dict, Union, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DishFilter:
    """
    Enhanced dish filtering system that matches user preferences with dish attributes
    using comprehensive scoring and constraint validation, now with protein optimization.
    """

    def __init__(self):
        self.meal_type_mapping = {
            "morning": "breakfast",
            "afternoon": "lunch",
            "evening": "dinner",
            "night": "dinner",
            "snacks": "snack",
        }

        # Weight factors for different scoring components
        self.score_weights = {
            "attribute_rankings": 1.0,
            "dietary_match": 2.0,
            "allergy_penalty": -10.0,
            "meal_timing": 0.5,
            "caloric_alignment": 0.3,
            "persona_bonus": 0.8,
            "protein_alignment": 1.5,  # NEW: Protein scoring weight
        }

        # Protein requirements based on goals (grams per kg body weight)
        self.protein_requirements = {
            "muscle gain": 2.2,
            "weight loss": 1.6,
            "recovery": 1.8,
            "cardiac": 1.2,
            "diabetes": 1.2,
            "maintenance": 1.0,
            "medical therapy": 1.4,
        }

    def calculate_user_protein_needs(self, user_data: Dict) -> float:
        """Calculate daily protein needs based on user profile."""
        weight = user_data.get("weight_kg", 70)  # Default fallback
        goal = user_data.get("primary_goal", "maintenance").lower().replace(" ", "_")
        lifestyle = user_data.get("lifestyle_type", "sedentary").lower()

        # Normalize goal name
        goal = goal.replace("_", " ")

        # Base protein requirement
        base_protein = self.protein_requirements.get(goal, 1.0) * weight

        # Adjust for activity level
        activity_multipliers = {
            "athletic": 1.2,
            "active": 1.1,
            "sedentary": 1.0,
            "elderly": 0.9,
        }

        multiplier = activity_multipliers.get(lifestyle, 1.0)
        return base_protein * multiplier

    def calculate_meal_protein_target(
        self, daily_protein: float, meal_type: str
    ) -> float:
        """Calculate protein target for specific meal type."""
        protein_distribution = {
            "breakfast": 0.25,
            "lunch": 0.35,
            "dinner": 0.30,
            "snack": 0.05,  # Per snack
        }

        return daily_protein * protein_distribution.get(meal_type, 0.25)

    def normalize_user_preferences(
        self, user_data: Dict[str, Union[str, int, List]]
    ) -> Dict[str, str]:
        """
        Normalize user preference keys to match dish attribute naming conventions.
        """
        normalized = {}

        # Map frontend field names to dish attribute names
        field_mapping = {
            "primary_goal": "health_suitability",
            "lifestyle_type": "lifestyle_suitability",
            "dietary_strictness": "dietary_suitability",
            "flavor_preferences": "flavor_profile",
            "prep_skill_level": "prep_complexity",
            "affordability_preference": "ingredient_affordability",
        }

        for frontend_key, dish_key in field_mapping.items():
            if frontend_key in user_data and user_data[frontend_key]:
                value = str(user_data[frontend_key]).lower().replace(" ", "_")
                # Handle special cases
                if frontend_key == "primary_goal":
                    value = self._normalize_health_goal(value)
                normalized[dish_key] = value

        return normalized

    def _normalize_health_goal(self, goal: str) -> str:
        """Normalize health goals to match dish health_suitability options."""
        goal_mapping = {
            "weight_loss": "weight loss",
            "muscle_gain": "muscle gain",
            "medical_therapy": "medical recovery",
            "cardiac": "cardiac",
            "diabetes": "diabetes",
            "maintenance": "maintenance",
            "recovery": "recovery",
        }
        return goal_mapping.get(goal, goal.replace("_", " "))

    def calculate_comprehensive_score(
        self,
        dish: Dict[str, Union[str, dict, list]],
        user_data: Dict[str, Union[str, int, List]],
        target_calories: Optional[int] = None,
        target_protein: Optional[float] = None,
    ) -> float:
        """
        Calculate comprehensive score for a dish based on multiple factors including protein.
        """
        total_score = 0.0
        normalized_prefs = self.normalize_user_preferences(user_data)

        # 1. Attribute Rankings Score (primary scoring mechanism)
        rankings = dish.get("attribute_rankings", {})
        attribute_score = 0

        for pref_key, pref_value in normalized_prefs.items():
            if pref_key in rankings and pref_value in rankings[pref_key]:
                attribute_score += rankings[pref_key][pref_value]

        total_score += attribute_score * self.score_weights["attribute_rankings"]

        # 2. Caloric Density Alignment
        if target_calories and "caloric_density" in rankings:
            caloric_score = self._calculate_caloric_score(
                dish, target_calories, rankings["caloric_density"]
            )
            total_score += caloric_score * self.score_weights["caloric_alignment"]

        # 3. NEW: Protein Alignment Score
        if target_protein:
            protein_score = self._calculate_protein_score(dish, target_protein)
            total_score += protein_score * self.score_weights["protein_alignment"]

        # 4. Dietary Compatibility
        dietary_score = self._calculate_dietary_compatibility(dish, user_data)
        total_score += dietary_score * self.score_weights["dietary_match"]

        # 5. Allergy Risk Assessment
        allergy_penalty = self._calculate_allergy_risk(dish, user_data)
        total_score += allergy_penalty * abs(self.score_weights["allergy_penalty"])

        # 6. Meal Timing Preference
        timing_score = self._calculate_meal_timing_score(dish, user_data)
        total_score += timing_score * self.score_weights["meal_timing"]

        # 7. Persona Tags Bonus
        persona_score = self._calculate_persona_match(dish, user_data)
        total_score += persona_score * self.score_weights["persona_bonus"]

        return total_score

    def _calculate_protein_score(self, dish: Dict, target_protein: float) -> float:
        """Calculate score based on protein content alignment with target."""
        dish_protein = dish.get("protein_grams", 0)

        if target_protein == 0:
            return 0

        # Calculate protein adequacy ratio
        protein_ratio = dish_protein / target_protein

        # Optimal range is 80-120% of target
        if 0.8 <= protein_ratio <= 1.2:
            return 3  # Excellent protein match
        elif 0.6 <= protein_ratio <= 1.4:
            return 2  # Good protein match
        elif 0.4 <= protein_ratio <= 1.6:
            return 1  # Acceptable protein match
        else:
            return -1  # Poor protein match

    def _calculate_caloric_score(
        self, dish: Dict, target_calories: int, caloric_rankings: Dict[str, int]
    ) -> float:
        """Calculate score based on caloric density alignment."""
        dish_calories = dish.get("calories", 0)

        # Determine appropriate caloric density based on dish calories
        if dish_calories < 200:
            density = "low"
        elif dish_calories > 500:
            density = "high"
        else:
            density = "moderate"

        return caloric_rankings.get(density, 0)

    def _calculate_dietary_compatibility(self, dish: Dict, user_data: Dict) -> float:
        """Calculate dietary compatibility score."""
        score = 0
        dish_diet_tags = [tag.lower() for tag in dish.get("diet_tags", [])]
        user_dietary = user_data.get("dietary_strictness", "").lower()

        # Direct dietary match
        if user_dietary in dish_diet_tags:
            score += 3

        # Check for dietary conflicts
        dietary_conflicts = {
            "vegan": ["non-vegetarian", "dairy"],
            "vegetarian": ["non-vegetarian"],
            "diabetic-friendly": ["high-sugar", "sweet"],
            "gluten-free": ["gluten"],
        }

        if user_dietary in dietary_conflicts:
            conflicts = dietary_conflicts[user_dietary]
            if any(conflict in dish_diet_tags for conflict in conflicts):
                score -= 5

        return score

    def _calculate_allergy_risk(self, dish: Dict, user_data: Dict) -> float:
        """Calculate allergy risk penalty."""
        user_allergies = set()
        if "known_allergies" in user_data:
            user_allergies = {
                allergy.strip().lower()
                for allergy in user_data["known_allergies"]
                if isinstance(allergy, str) and allergy.strip()
            }

        dish_allergens = set(
            allergen.lower() for allergen in dish.get("allergy_risks", [])
        )

        # Return penalty for each allergy conflict
        conflicts = user_allergies.intersection(dish_allergens)
        return -len(conflicts) if conflicts else 0

    def _calculate_meal_timing_score(self, dish: Dict, user_data: Dict) -> float:
        """Calculate meal timing preference alignment."""
        user_meal_times = user_data.get("preferred_meal_times", [])
        dish_suitable_times = dish.get("time_of_day_suitability", [])

        if not user_meal_times or not dish_suitable_times:
            return 0

        # Convert user preferences to dish timing format
        dish_times = []
        for time in user_meal_times:
            if time.lower() in self.meal_type_mapping:
                dish_times.extend(
                    [t for t in dish_suitable_times if time.lower() in t.lower()]
                )

        return len(set(dish_times)) * 0.5

    def _calculate_persona_match(self, dish: Dict, user_data: Dict) -> float:
        """Calculate persona tags alignment bonus."""
        user_personas = set(user_data.get("persona_tags", []))
        dish_personas = set(dish.get("persona_tags", []))

        if not user_personas or not dish_personas:
            return 0

        matches = user_personas.intersection(dish_personas)
        return len(matches) * 0.5

    def filter_dishes_by_constraints(
        self, dishes: List[Dict], user_data: Dict
    ) -> List[Dict]:
        """
        Filter dishes based on hard constraints (allergies, dietary restrictions).
        """
        filtered_dishes = []

        for dish in dishes:
            # Check allergy constraints
            if self._has_allergy_conflict(dish, user_data):
                continue

            # Check dietary restrictions
            if self._has_dietary_conflict(dish, user_data):
                continue

            # Check region preference if specified
            user_region = user_data.get("Region", "").lower()
            if user_region and dish.get("region", "").lower() != user_region:
                continue

            filtered_dishes.append(dish)

        return filtered_dishes

    def _has_allergy_conflict(self, dish: Dict, user_data: Dict) -> bool:
        """Check if dish conflicts with user allergies."""
        user_allergies = set(
            allergy.strip().lower()
            for allergy in user_data.get("known_allergies", [])
            if isinstance(allergy, str) and allergy.strip()
        )

        dish_allergens = set(
            allergen.lower() for allergen in dish.get("allergy_risks", [])
        )

        return bool(user_allergies.intersection(dish_allergens))

    def _has_dietary_conflict(self, dish: Dict, user_data: Dict) -> bool:
        """Check if dish conflicts with dietary preferences."""
        user_dietary = user_data.get("dietary_strictness", "").lower()
        dish_diet_tags = [tag.lower() for tag in dish.get("diet_tags", [])]

        # Strict dietary conflicts
        conflicts = {"vegan": "non-vegetarian", "vegetarian": "non-vegetarian"}

        if user_dietary in conflicts:
            return conflicts[user_dietary] in dish_diet_tags

        return False

    def get_best_dishes_by_meal_type(
        self,
        dishes: List[Dict],
        user_data: Dict,
        meal_type: str,
        target_calories: Optional[int] = None,
        target_protein: Optional[float] = None,
        top_n: int = 5,
    ) -> List[Dict]:
        """
        Get the best dishes for a specific meal type with protein optimization.
        """
        # Filter dishes by meal type
        meal_dishes = [
            dish
            for dish in dishes
            if dish.get("meal_type", "").lower() == meal_type.lower()
        ]

        if not meal_dishes:
            return []

        # Apply constraint filtering
        filtered_dishes = self.filter_dishes_by_constraints(meal_dishes, user_data)

        if not filtered_dishes:
            logger.warning(
                f"No dishes available for {meal_type} after constraint filtering"
            )
            return []

        # Score and rank dishes
        scored_dishes = []
        for dish in filtered_dishes:
            score = self.calculate_comprehensive_score(
                dish, user_data, target_calories, target_protein
            )
            scored_dishes.append((dish, score))

        # Sort by score (descending)
        scored_dishes.sort(key=lambda x: x[1], reverse=True)

        # Return top N dishes
        return [dish for dish, score in scored_dishes[:top_n]]

    def get_optimal_dish(
        self,
        dishes: List[Dict],
        user_data: Dict,
        meal_type: str,
        target_calories: Optional[int] = None,
        target_protein: Optional[float] = None,
        randomize_top_n: int = 3,
    ) -> Optional[Dict]:
        """
        Get a single optimal dish with some randomization from top choices.
        """
        top_dishes = self.get_best_dishes_by_meal_type(
            dishes,
            user_data,
            meal_type,
            target_calories,
            target_protein,
            randomize_top_n,
        )

        if not top_dishes:
            return None

        # Randomly select from top choices to add variety
        return random.choice(top_dishes)

    def generate_complete_meal_plan(
        self, dishes: List[Dict], user_data: Dict, target_daily_calories: int
    ) -> Dict[str, Optional[Dict]]:
        """
        Generate a complete meal plan with optimal calorie and protein distribution.
        """
        # Calculate daily protein needs
        daily_protein = self.calculate_user_protein_needs(user_data)

        # Typical calorie and protein distribution
        calorie_distribution = {
            "breakfast": 0.25,
            "lunch": 0.35,
            "dinner": 0.30,
            "snack": 0.10,
        }

        meal_plan = {}

        for meal_type, calorie_ratio in calorie_distribution.items():
            target_calories = int(target_daily_calories * calorie_ratio)
            target_protein = self.calculate_meal_protein_target(
                daily_protein, meal_type
            )

            if meal_type == "snack":
                # Handle snacks separately - might want 1 or 2
                snack_calories = (
                    target_calories // 2 if target_calories > 100 else target_calories
                )
                snack_protein = target_protein

                snack_1 = self.get_optimal_dish(
                    dishes, user_data, "snack", snack_calories, snack_protein
                )
                meal_plan["snack_1"] = snack_1

                if target_calories > 100:
                    snack_2 = self.get_optimal_dish(
                        dishes, user_data, "snack", snack_calories, snack_protein
                    )
                    meal_plan["snack_2"] = snack_2
            else:
                optimal_dish = self.get_optimal_dish(
                    dishes, user_data, meal_type, target_calories, target_protein
                )
                meal_plan[meal_type] = optimal_dish

        return meal_plan


# Usage function for backward compatibility
def find_best_dish(
    dishes: List[Dict[str, Union[str, list, dict]]],
    user: Dict[str, Union[str, int]],
    top_n: int = 5,
) -> Union[Dict[str, Union[str, list, dict]], None]:
    """
    Backward compatibility function for existing codebase.
    """
    filter_system = DishFilter()

    # Get dishes of any meal type
    filtered_dishes = filter_system.filter_dishes_by_constraints(dishes, user)

    if not filtered_dishes:
        return None

    # Calculate protein target for better scoring
    daily_protein = filter_system.calculate_user_protein_needs(user)
    target_protein = daily_protein * 0.3  # Assume this is for a main meal

    # Score all dishes
    scored_dishes = []
    for dish in filtered_dishes:
        score = filter_system.calculate_comprehensive_score(
            dish, user, target_protein=target_protein
        )
        scored_dishes.append((dish, score))

    # Sort and get top dishes
    scored_dishes.sort(key=lambda x: x[1], reverse=True)
    top_dishes = [dish for dish, score in scored_dishes[:top_n]]

    return random.choice(top_dishes) if top_dishes else None
