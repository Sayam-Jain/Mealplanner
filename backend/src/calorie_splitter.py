def split_calories(total_calories, meal_frequency):
    """
    Splits total daily calories into specified meal frequency.

    Args:
        total_calories: Total daily caloric intake (integer)
        meal_frequency: Either "3 meals" or "3 meals + 2 snacks" (string)

    Returns:
        Dictionary with meal names as keys and calorie values as values
    """
    if not isinstance(total_calories, (int, float)) or total_calories <= 0:
        raise ValueError("Total calories must be a positive number")
    if meal_frequency not in ["3 meals", "3 meals + 2 snacks"]:
        raise ValueError(
            "Meal frequency must be either '3 meals' or '3 meals + 2 snacks'"
        )

    calorie_distribution = {}

    # Set standard percentages
    breakfast_pct = 0.275
    lunch_pct = 0.325
    dinner_pct = 0.275

    # Calculate and round to nearest 10 kcal
    breakfast_cal = round(total_calories * breakfast_pct / 10) * 10
    lunch_cal = round(total_calories * lunch_pct / 10) * 10
    dinner_cal = round(total_calories * dinner_pct / 10) * 10

    calorie_distribution["breakfast"] = breakfast_cal
    calorie_distribution["lunch"] = lunch_cal
    calorie_distribution["dinner"] = dinner_cal

    if meal_frequency == "3 meals + 2 snacks":
        remaining_cal = total_calories - (breakfast_cal + lunch_cal + dinner_cal)
        snack_cal = round(remaining_cal / 2 / 10) * 10
        calorie_distribution["snack_1"] = snack_cal
        calorie_distribution["snack_2"] = snack_cal

    return calorie_distribution
