# FastAPI Backend API for Meal Planner
# File: backend/src/api.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Union
import json
import pandas as pd
from datetime import datetime
import logging
import os

# Import AI model dependencies
from transformers import pipeline
from calorie_splitter import split_calories
from dish_filter import find_best_dish, DishFilter
from new_prompt_builder import build_prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Meal Planner API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Enhanced Pydantic models with better validation
class UserInputData(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=14, le=75)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    height_cm: int = Field(..., ge=120, le=225)
    weight_kg: float = Field(..., ge=40, le=120)
    Region: str = Field(..., pattern="^(north|south)$")
    primary_goal: str = Field(
        ...,
        pattern="^(Cardiac|Diabetes|Maintenance|Medical Therapy|Muscle Gain|Recovery|Weight Loss)$",
    )
    lifestyle_type: str = Field(..., pattern="^(active|athletic|elderly|sedentary)$")
    dietary_strictness: str = Field(
        ..., pattern="^(diabetic-friendly|gluten-free|non-vegetarian|vegan|vegetarian)$"
    )
    known_allergies: List[str] = []
    preferred_meal_times: List[str] = []
    flavor_preferences: str = Field(
        ..., pattern="^(aromatic|creamy|earthy|mild|rich|spicy|sweet|tangy)$"
    )
    prep_skill_level: str = Field(..., pattern="^(beginner|expert|intermediate)$")
    affordability_preference: str = Field(
        ..., pattern="^(affordable|expensive|moderate)$"
    )
    persona_tags: List[str] = []

    @validator("known_allergies")
    def validate_allergies(cls, v):
        valid_allergies = [
            "dairy",
            "eggs",
            "fish",
            "gluten",
            "mustard",
            "nuts",
            "tree nuts",
        ]
        for allergy in v:
            if allergy not in valid_allergies:
                raise ValueError(f"Invalid allergy: {allergy}")
        return v

    @validator("preferred_meal_times")
    def validate_meal_times(cls, v):
        valid_times = ["afternoon", "evening", "morning", "night", "snacks"]
        for time in v:
            if time not in valid_times:
                raise ValueError(f"Invalid meal time: {time}")
        return v

    @validator("persona_tags")
    def validate_persona_tags(cls, v):
        valid_tags = [
            "budget-conscious",
            "dairy-free",
            "elderly-friendly",
            "fitness-focused",
            "general",
            "health-focused",
            "muscle-gain",
            "quick-meal",
            "vegetarian-friendly",
            "weight-loss-friendly",
        ]
        for tag in v:
            if tag not in valid_tags:
                raise ValueError(f"Invalid persona tag: {tag}")
        return v


class CalculatedData(BaseModel):
    bmi: float
    bmi_category: str
    caloric_intake: int
    bmr: float
    activity_factor: float


# NEW: Enhanced Pydantic models for protein tracking
class EnhancedMealPlan(BaseModel):
    breakfast: str
    breakfast_protein: int = 0
    lunch: str
    lunch_protein: int = 0
    dinner: str
    dinner_protein: int = 0
    snack_1: Optional[str] = None
    snack_1_protein: int = 0
    snack_2: Optional[str] = None
    snack_2_protein: int = 0


class EnhancedMealPlanResponse(BaseModel):
    user_data: UserInputData
    calculated_data: CalculatedData
    meal_plan: EnhancedMealPlan
    meal_calories: Dict[str, int]
    meal_proteins: Dict[str, int]  # NEW: Protein content per meal
    total_calories: int
    total_protein: int  # NEW: Total daily protein
    daily_protein_target: int  # NEW: User's protein target
    nutritional_summary: Dict[str, str]
    timestamp: datetime


# Keep original models for backward compatibility
class MealPlan(BaseModel):
    breakfast: str
    lunch: str
    dinner: str
    snack_1: Optional[str] = None
    snack_2: Optional[str] = None


class MealPlanResponse(BaseModel):
    user_data: UserInputData
    calculated_data: CalculatedData
    meal_plan: MealPlan
    meal_calories: Dict[str, int]
    total_calories: int
    nutritional_summary: Dict[str, str]
    timestamp: datetime


# Enhanced MealPlannerService with AI Model Integration and Protein Support
class AIEnhancedMealPlannerService:
    def __init__(self):
        self.dishes = self.load_dishes()
        self.initialize_ai_model()
        self.dish_filter = (
            DishFilter()
        )  # Initialize dish filter for protein calculations

    def load_dishes(self):
        """Load dishes from JSON file with error handling."""
        try:
            dishes_path = os.path.join(
                os.path.dirname(__file__), "..", "dish_library", "menu.json"
            )
            with open(dishes_path, "r", encoding="utf-8") as f:
                dishes_data = json.load(f)
                return dishes_data if isinstance(dishes_data, list) else []
        except FileNotFoundError:
            logger.error("Dishes JSON file not found")
            return []
        except json.JSONDecodeError:
            logger.error("Invalid JSON in dishes file")
            return []

    def initialize_ai_model(self):
        """Initialize the AI text generation model."""
        try:
            logger.info("Initializing AI model: MBZUAI/LaMini-Flan-T5-783M")
            self.generator = pipeline(
                "text2text-generation",
                model="MBZUAI/LaMini-Flan-T5-783M",
                max_new_tokens=150,
                truncation=True,
            )
            self.model_loaded = True
            logger.info("AI model successfully loaded")
        except Exception as e:
            logger.error(f"Failed to load AI model: {e}")
            self.generator = None
            self.model_loaded = False

    def normalize_user_data(self, user_data: Dict) -> Dict:
        """Normalize user data for meal planning compatibility."""
        normalized = user_data.copy()

        # Add calculated fields
        normalized["BMI"] = self.calculate_bmi(
            user_data["weight_kg"], user_data["height_cm"]
        )
        normalized["BMR"] = self.calculate_bmr(
            user_data["weight_kg"],
            user_data["height_cm"],
            user_data["age"],
            user_data["gender"],
        )

        # Add meal frequency if not present
        if "Meal_Frequency" not in normalized:
            normalized["Meal_Frequency"] = "3 meals + 2 snacks"

        # Ensure all list fields are properly formatted
        for field in ["known_allergies", "preferred_meal_times", "persona_tags"]:
            if field in normalized and not isinstance(normalized[field], list):
                normalized[field] = []

        return normalized

    def calculate_bmi(self, weight_kg: float, height_cm: int) -> float:
        """Calculate BMI."""
        height_m = height_cm / 100
        return weight_kg / (height_m**2)

    def calculate_bmr(
        self, weight_kg: float, height_cm: int, age: int, gender: str
    ) -> float:
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation."""
        base_calc = 10 * weight_kg + 6.25 * height_cm - 5 * age
        return base_calc + 5 if gender == "Male" else base_calc - 161

    def get_activity_factor(self, lifestyle_type: str) -> float:
        """Get activity factor based on lifestyle type."""
        activity_factors = {
            "sedentary": 1.2,
            "active": 1.55,
            "elderly": 1.2,
            "athletic": 1.725,
        }
        return activity_factors.get(lifestyle_type.lower(), 1.2)

    def categorize_bmi(self, bmi: float) -> str:
        """Categorize BMI value."""
        if bmi < 18.5:
            return "Underweight"
        elif bmi < 25:
            return "Normal weight"
        elif bmi < 30:
            return "Overweight"
        else:
            return "Obese"

    # NEW: Protein calculation methods
    def calculate_user_protein_target(self, user_data: Dict) -> int:
        """Calculate daily protein target for user using DishFilter logic."""
        return int(self.dish_filter.calculate_user_protein_needs(user_data))

    def generate_ai_meal_description(
        self, user_data: Dict, meal_name: str, kcal: int, best_dish: Dict
    ) -> str:
        """Generate AI-powered meal description using the model."""
        if not self.model_loaded or not self.generator:
            logger.warning("AI model not available, using fallback description")
            return self.get_fallback_description(meal_name, best_dish)

        try:
            # Build prompt using your existing prompt builder
            prompt = build_prompt(user_data, meal_name, kcal, best_dish)

            logger.info(f"Generating AI meal description for {meal_name}")
            logger.debug(f"Prompt: {prompt}")

            # Generate using AI model
            model_output = self.generator(prompt)

            if not model_output or "generated_text" not in model_output[0]:
                logger.warning("AI model returned no valid output, using fallback")
                return self.get_fallback_description(meal_name, best_dish)

            result = model_output[0]["generated_text"].strip()

            # Clean up the result if needed
            if result:
                logger.info(f"Successfully generated AI description for {meal_name}")
                return result
            else:
                logger.warning("AI generated empty result, using fallback")
                return self.get_fallback_description(meal_name, best_dish)

        except Exception as e:
            logger.error(f"Error in AI generation for {meal_name}: {e}")
            return self.get_fallback_description(meal_name, best_dish)

    def get_fallback_description(self, meal_name: str, best_dish: Dict) -> str:
        """Get fallback meal description when AI fails."""
        if best_dish and isinstance(best_dish, dict):
            return best_dish.get(
                "cultural_significance",
                best_dish.get("name", f"Recommended {meal_name.replace('_', ' ')}"),
            )

        # Last resort fallbacks
        fallback_descriptions = {
            "breakfast": "Nutritious breakfast with balanced macronutrients to start your day",
            "lunch": "Satisfying midday meal with lean protein and complex carbohydrates",
            "dinner": "Well-balanced evening meal with vegetables and quality protein",
            "snack_1": "Healthy snack to maintain energy levels",
            "snack_2": "Light snack to curb hunger between meals",
        }

        return fallback_descriptions.get(
            meal_name, f"Nutritious {meal_name.replace('_', ' ')}"
        )

    # UPDATED: Generate meal plan with protein tracking
    def generate_meal_plan(self, user_data: Dict, target_calories: int) -> tuple:
        """Generate AI-powered meal plan with protein tracking."""
        try:
            normalized_user_data = self.normalize_user_data(user_data)

            # Split calories across meals using your existing logic
            meal_freq = normalized_user_data.get("Meal_Frequency", "3 meals + 2 snacks")
            meal_calories = split_calories(target_calories, meal_freq)

            logger.info(f"Calorie Distribution: {meal_calories}")

            formatted_plan = {}
            actual_calories = {}
            actual_proteins = {}  # NEW: Track protein per meal

            for meal_name, kcal in meal_calories.items():
                # Determine dish type
                dish_type = "snack" if meal_name.startswith("snack") else meal_name

                # Filter dishes by type
                filtered_dishes = [
                    dish for dish in self.dishes if dish.get("meal_type") == dish_type
                ]

                if not filtered_dishes:
                    logger.warning(f"No dishes found for {dish_type}")
                    formatted_plan[meal_name] = (
                        f"No suitable {meal_name.replace('_', ' ')} available"
                    )
                    actual_calories[meal_name] = 0
                    actual_proteins[meal_name] = 0  # NEW
                    continue

                # Find best dish using your existing filter
                best_dish = find_best_dish(filtered_dishes, normalized_user_data)

                if not best_dish:
                    formatted_plan[meal_name] = (
                        f"No suitable {meal_name.replace('_', ' ')} found for your preferences"
                    )
                    actual_calories[meal_name] = 0
                    actual_proteins[meal_name] = 0  # NEW
                    continue

                # Handle case where find_best_dish returns a list
                if isinstance(best_dish, list):
                    best_dish = best_dish[0] if best_dish else None

                if not best_dish:
                    formatted_plan[meal_name] = (
                        f"No suitable {meal_name.replace('_', ' ')} found"
                    )
                    actual_calories[meal_name] = 0
                    actual_proteins[meal_name] = 0  # NEW
                    continue

                # Generate AI-powered meal description
                ai_description = self.generate_ai_meal_description(
                    normalized_user_data, meal_name, kcal, best_dish
                )

                formatted_plan[meal_name] = ai_description
                actual_calories[meal_name] = best_dish.get("calories", kcal)
                actual_proteins[meal_name] = best_dish.get("protein_grams", 0)  # NEW

                logger.info(
                    f"Generated {meal_name}: {ai_description[:100]}... (Protein: {actual_proteins[meal_name]}g)"
                )

            return (
                formatted_plan,
                actual_calories,
                actual_proteins,
            )  # Return protein data too

        except Exception as e:
            logger.error(f"Error in generate_meal_plan: {e}")
            # Enhanced fallback with protein estimates
            fallback_plan = {
                "breakfast": "Balanced breakfast with whole grains, protein, and fresh fruits",
                "lunch": "Nutritious lunch with lean protein, vegetables, and complex carbohydrates",
                "dinner": "Wholesome dinner with quality protein, vegetables, and healthy fats",
                "snack_1": "Healthy mid-morning snack with protein and fiber",
                "snack_2": "Light evening snack to maintain energy levels",
            }
            fallback_calories = {
                "breakfast": target_calories // 4,
                "lunch": int(target_calories * 0.35),
                "dinner": int(target_calories * 0.3),
                "snack_1": target_calories // 10,
                "snack_2": target_calories // 20,
            }
            fallback_proteins = {
                "breakfast": 15,
                "lunch": 25,
                "dinner": 20,
                "snack_1": 5,
                "snack_2": 3,
            }
            return fallback_plan, fallback_calories, fallback_proteins

    def generate_nutritional_summary(
        self, user_data: Dict, meal_calories: Dict[str, int]
    ) -> Dict[str, str]:
        """Generate nutritional summary and recommendations."""
        total_calories = sum(meal_calories.values())
        primary_goal = user_data.get("primary_goal", "")

        summary = {
            "total_daily_calories": f"{total_calories} kcal",
            "meal_distribution": f"Breakfast: {meal_calories.get('breakfast', 0)} | Lunch: {meal_calories.get('lunch', 0)} | Dinner: {meal_calories.get('dinner', 0)}",
            "primary_focus": self.get_goal_recommendation(primary_goal),
            "dietary_notes": self.get_dietary_notes(user_data),
            "ai_generation": "Powered by AI meal planning model"
            if self.model_loaded
            else "Using fallback descriptions",
        }

        return summary

    def get_goal_recommendation(self, goal: str) -> str:
        """Get recommendation based on primary goal."""
        recommendations = {
            "Weight Loss": "Focus on portion control and nutrient-dense, low-calorie foods",
            "Muscle Gain": "Emphasize protein-rich foods and adequate caloric intake",
            "Maintenance": "Balanced macronutrient distribution for sustained energy",
            "Cardiac": "Heart-healthy foods low in sodium and saturated fats",
            "Diabetes": "Complex carbohydrates and fiber-rich foods for blood sugar control",
            "Recovery": "Anti-inflammatory foods and adequate protein for healing",
        }
        return recommendations.get(goal, "Balanced nutrition for overall health")

    def get_dietary_notes(self, user_data: Dict) -> str:
        """Generate dietary notes based on user preferences."""
        notes = []

        dietary_pref = user_data.get("dietary_strictness", "")
        if dietary_pref == "vegan":
            notes.append("Plant-based protein sources included")
        elif dietary_pref == "vegetarian":
            notes.append("Vegetarian options with dairy and eggs")
        elif dietary_pref == "gluten-free":
            notes.append("All gluten-containing ingredients avoided")

        if user_data.get("known_allergies"):
            notes.append(
                f"Avoided allergens: {', '.join(user_data['known_allergies'])}"
            )

        return "; ".join(notes) if notes else "No special dietary restrictions"


# Initialize the AI-enhanced meal service
meal_service = AIEnhancedMealPlannerService()


# Health check route with AI model status
@app.get("/health")
async def health_check():
    dish_count = len(meal_service.dishes) if meal_service.dishes else 0
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "dishes_loaded": dish_count,
        "ai_model_loaded": meal_service.model_loaded,
        "services": {
            "dish_filter": "active",
            "meal_planner": "active",
            "ai_generator": "active" if meal_service.model_loaded else "unavailable",
        },
    }


# UPDATED: Enhanced POST route with protein tracking
@app.post("/api/generate-meal-plan", response_model=EnhancedMealPlanResponse)
async def generate_meal_plan(user_data: UserInputData):
    try:
        logger.info(f"Generating AI-powered meal plan for user: {user_data.name}")

        # Calculate BMI and metabolic data
        height_m = user_data.height_cm / 100
        bmi = round(user_data.weight_kg / (height_m**2), 1)
        bmi_category = meal_service.categorize_bmi(bmi)

        # Calculate BMR and caloric intake
        bmr = meal_service.calculate_bmr(
            user_data.weight_kg, user_data.height_cm, user_data.age, user_data.gender
        )

        activity_factor = meal_service.get_activity_factor(user_data.lifestyle_type)
        caloric_intake = round(bmr * activity_factor)

        # Adjust calories based on primary goal
        goal_adjustments = {
            "Weight Loss": 0.85,
            "Muscle Gain": 1.15,
            "Maintenance": 1.0,
            "Recovery": 1.1,
        }

        adjustment = goal_adjustments.get(user_data.primary_goal, 1.0)
        adjusted_calories = int(caloric_intake * adjustment)

        calculated_data = CalculatedData(
            bmi=bmi,
            bmi_category=bmi_category,
            caloric_intake=adjusted_calories,
            bmr=round(bmr, 1),
            activity_factor=activity_factor,
        )

        # Convert to dict for meal planning
        user_dict = user_data.dict()
        user_dict["Caloric_Intake_kcal_day"] = adjusted_calories
        user_dict["BMI"] = bmi
        user_dict["BMR"] = bmr

        # NEW: Calculate user's daily protein target
        daily_protein_target = meal_service.calculate_user_protein_target(user_dict)

        # Generate AI-powered meal plan with protein tracking
        meal_plan_dict, meal_calories, meal_proteins = meal_service.generate_meal_plan(
            user_dict, adjusted_calories
        )

        # Create enhanced meal plan object
        meal_plan = EnhancedMealPlan(
            breakfast=meal_plan_dict.get("breakfast", "No breakfast planned"),
            breakfast_protein=meal_proteins.get("breakfast", 0),
            lunch=meal_plan_dict.get("lunch", "No lunch planned"),
            lunch_protein=meal_proteins.get("lunch", 0),
            dinner=meal_plan_dict.get("dinner", "No dinner planned"),
            dinner_protein=meal_proteins.get("dinner", 0),
            snack_1=meal_plan_dict.get("snack_1"),
            snack_1_protein=meal_proteins.get("snack_1", 0),
            snack_2=meal_plan_dict.get("snack_2"),
            snack_2_protein=meal_proteins.get("snack_2", 0),
        )

        # Calculate totals
        total_calories = sum(meal_calories.values())
        total_protein = sum(meal_proteins.values())

        # Enhanced nutritional summary with protein information
        nutritional_summary = meal_service.generate_nutritional_summary(
            user_dict, meal_calories
        )
        nutritional_summary["daily_protein_target"] = f"{daily_protein_target}g"
        nutritional_summary["total_protein_achieved"] = f"{total_protein}g"
        nutritional_summary["protein_adequacy"] = (
            f"{(total_protein / daily_protein_target * 100):.0f}%"
            if daily_protein_target > 0
            else "N/A"
        )

        response = EnhancedMealPlanResponse(
            user_data=user_data,
            calculated_data=calculated_data,
            meal_plan=meal_plan,
            meal_calories=meal_calories,
            meal_proteins=meal_proteins,  # NEW
            total_calories=total_calories,
            total_protein=total_protein,  # NEW
            daily_protein_target=daily_protein_target,  # NEW
            nutritional_summary=nutritional_summary,
            timestamp=datetime.now(),
        )

        logger.info(
            f"Successfully generated meal plan for {user_data.name} - Protein: {total_protein}g/{daily_protein_target}g"
        )
        return response

    except Exception as e:
        logger.error(f"Error generating meal plan: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Error generating meal plan",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            },
        )


# Additional utility endpoints
@app.get("/api/dish-stats")
async def get_dish_statistics():
    """Get statistics about available dishes."""
    if not meal_service.dishes:
        raise HTTPException(status_code=404, detail="No dishes loaded")

    stats = {
        "total_dishes": len(meal_service.dishes),
        "meal_types": {},
        "dietary_options": {},
        "regions": {},
        "ai_model_status": meal_service.model_loaded,
    }

    for dish in meal_service.dishes:
        # Count by meal type
        meal_type = dish.get("meal_type", "unknown")
        stats["meal_types"][meal_type] = stats["meal_types"].get(meal_type, 0) + 1

        # Count dietary options
        for diet_tag in dish.get("diet_tags", []):
            stats["dietary_options"][diet_tag] = (
                stats["dietary_options"].get(diet_tag, 0) + 1
            )

        # Count regions
        region = dish.get("region", "unknown")
        stats["regions"][region] = stats["regions"].get(region, 0) + 1

    return stats


@app.get("/api/model-status")
async def get_model_status():
    """Get AI model status and information."""
    return {
        "model_loaded": meal_service.model_loaded,
        "model_name": "MBZUAI/LaMini-Flan-T5-783M",
        "model_type": "text2text-generation",
        "status": "active" if meal_service.model_loaded else "failed_to_load",
        "timestamp": datetime.now(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
