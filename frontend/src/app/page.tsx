'use client';

import React, { useState, useEffect } from 'react';

// Enhanced type definitions for protein-aware API integration
interface FormData {
  name: string;
  age: number | '';
  gender: string;
  height_cm: number | '';
  weight_kg: number | '';
  primary_goal: string;
  Region: string;
  lifestyle_type: string;
  dietary_strictness: string;
  known_allergies: string[];
  preferred_meal_times: string[];
  flavor_preferences: string;
  prep_skill_level: string;
  affordability_preference: string;
  persona_tags: string[];
}

interface CalculatedData {
  bmi: number | null;
  bmi_category: string | null;
  caloric_intake: number | null;
  bmr: number | null;
  activity_factor: number | null;
}

// UPDATED: Enhanced meal plan with protein tracking
interface EnhancedMealPlan {
  breakfast: string;
  breakfast_protein: number;
  lunch: string;
  lunch_protein: number;
  dinner: string;
  dinner_protein: number;
  snack_1: string | null;
  snack_1_protein: number;
  snack_2: string | null;
  snack_2_protein: number;
}

// UPDATED: Enhanced nutritional summary with protein info
interface EnhancedNutritionalSummary {
  total_daily_calories: string;
  meal_distribution: string;
  primary_focus: string;
  dietary_notes: string;
  daily_protein_target: string;
  total_protein_achieved: string;
  protein_adequacy: string;
  ai_generation: string;
}

// UPDATED: Enhanced API response with protein data
interface EnhancedApiResponse {
  user_data: FormData;
  calculated_data: CalculatedData;
  meal_plan: EnhancedMealPlan;
  meal_calories: Record<string, number>;
  meal_proteins: Record<string, number>;
  total_calories: number;
  total_protein: number;
  daily_protein_target: number;
  nutritional_summary: EnhancedNutritionalSummary;
  timestamp: string;
}

interface ApiError {
  error: string;
  message: string;
  timestamp: string;
}

// Enhanced configuration object
const FORM_CONFIG = {
  gender_options: ['Female', 'Male', 'Other'],
  Region_options: ['north', 'south'],
  primary_goal_options: ['Cardiac', 'Diabetes', 'Maintenance', 'Medical Therapy', 'Muscle Gain', 'Recovery', 'Weight Loss'],
  lifestyle_type_options: ['active', 'athletic', 'elderly', 'sedentary'],
  dietary_strictness_options: ['diabetic-friendly', 'gluten-free', 'non-vegetarian', 'vegan', 'vegetarian'],
  known_allergies_options: ['dairy', 'eggs', 'fish', 'gluten', 'mustard', 'nuts', 'tree nuts'],
  preferred_meal_times_options: ['afternoon', 'evening', 'morning', 'night', 'snacks'],
  flavor_preferences_options: ['aromatic', 'creamy', 'earthy', 'mild', 'rich', 'spicy', 'sweet', 'tangy'],
  prep_skill_level_options: ['beginner', 'expert', 'intermediate'],
  affordability_preference_options: ['affordable', 'expensive', 'moderate'],
  persona_tags_options: ['budget-conscious', 'dairy-free', 'elderly-friendly', 'fitness-focused', 'general', 'health-focused', 'muscle-gain', 'quick-meal', 'vegetarian-friendly', 'weight-loss-friendly'],
  age_range: { min: 14, max: 75 },
  height_range: { min: 120, max: 225 },
  weight_range: { min: 40, max: 120 }
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Utility functions
const formatDisplayName = (value: string): string => {
  return value.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const getBMIColor = (bmi: number): string => {
  if (bmi < 18.5) return 'text-blue-600';
  if (bmi < 25) return 'text-green-600';
  if (bmi < 30) return 'text-yellow-600';
  return 'text-red-600';
};

const getBMIBackground = (bmi: number): string => {
  if (bmi < 18.5) return 'bg-blue-50';
  if (bmi < 25) return 'bg-green-50';
  if (bmi < 30) return 'bg-yellow-50';
  return 'bg-red-50';
};

// NEW: Protein adequacy color coding
const getProteinAdequacyColor = (adequacy: string): string => {
  const percentage = parseInt(adequacy.replace('%', ''));
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const getProteinAdequacyBackground = (adequacy: string): string => {
  const percentage = parseInt(adequacy.replace('%', ''));
  if (percentage >= 90) return 'bg-green-50';
  if (percentage >= 70) return 'bg-yellow-50';
  return 'bg-red-50';
};

// Protein calculation function
const calculateProteinNeeds = (weight: number, goal: string, lifestyle: string): string => {
  if (!weight || weight <= 0) return '0';
  
  let proteinPerKg = 0.8;
  
  switch (goal) {
    case 'Muscle Gain':
      proteinPerKg = 2.2;
      break;
    case 'Weight Loss':
      proteinPerKg = 1.6;
      break;
    case 'Recovery':
      proteinPerKg = 1.8;
      break;
    case 'Cardiac':
    case 'Diabetes':
      proteinPerKg = 1.2;
      break;
    default:
      proteinPerKg = 1.0;
  }
  
  if (lifestyle === 'athletic') {
    proteinPerKg += 0.4;
  } else if (lifestyle === 'active') {
    proteinPerKg += 0.2;
  }
  
  const totalProtein = weight * proteinPerKg;
  return Math.round(totalProtein).toString();
};

export default function Home() {
  // Enhanced state management
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    Region: '',
    primary_goal: '',
    lifestyle_type: '',
    dietary_strictness: '',
    known_allergies: [],
    preferred_meal_times: [],
    flavor_preferences: '',
    prep_skill_level: '',
    affordability_preference: '',
    persona_tags: []
  });

  const [calculatedData, setCalculatedData] = useState<CalculatedData>({
    bmi: null,
    bmi_category: null,
    caloric_intake: null,
    bmr: null,
    activity_factor: null
  });

  // UPDATED: Enhanced state for protein-aware responses
  const [mealPlan, setMealPlan] = useState<EnhancedMealPlan | null>(null);
  const [mealCalories, setMealCalories] = useState<Record<string, number> | null>(null);
  const [mealProteins, setMealProteins] = useState<Record<string, number> | null>(null);
  const [nutritionalSummary, setNutritionalSummary] = useState<EnhancedNutritionalSummary | null>(null);
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [totalProtein, setTotalProtein] = useState<number>(0);
  const [dailyProteinTarget, setDailyProteinTarget] = useState<number>(0);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiHealthy, setApiHealthy] = useState<boolean>(false);
  const [dishStats, setDishStats] = useState<any>(null);

  // Enhanced input handlers
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    if (field === 'height_cm' || field === 'weight_kg') {
      calculatePreviewBMI(field, value);
    }
  };

  const handleCheckboxChange = (field: 'known_allergies' | 'preferred_meal_times' | 'persona_tags', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const calculatePreviewBMI = (changedField: string, newValue: any) => {
    const currentHeight = changedField === 'height_cm' ? Number(newValue) : Number(formData.height_cm);
    const currentWeight = changedField === 'weight_kg' ? Number(newValue) : Number(formData.weight_kg);
    
    if (currentHeight > 0 && currentWeight > 0) {
      const heightM = currentHeight / 100;
      const bmi = currentWeight / (heightM ** 2);
      
      setCalculatedData(prev => ({
        ...prev,
        bmi: Number(bmi.toFixed(1)),
        bmi_category: bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese"
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.age) newErrors.age = 'Age is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.height_cm) newErrors.height_cm = 'Height is required';
    if (!formData.Region) newErrors.Region = 'Region is required';
    if (!formData.weight_kg) newErrors.weight_kg = 'Weight is required';
    if (!formData.primary_goal) newErrors.primary_goal = 'Primary goal is required';
    if (!formData.lifestyle_type) newErrors.lifestyle_type = 'Lifestyle type is required';
    if (!formData.dietary_strictness) newErrors.dietary_strictness = 'Dietary preference is required';
    if (!formData.flavor_preferences) newErrors.flavor_preferences = 'Flavor preference is required';
    if (!formData.prep_skill_level) newErrors.prep_skill_level = 'Cooking skill level is required';
    if (!formData.affordability_preference) newErrors.affordability_preference = 'Budget preference is required';

    if (formData.age && (Number(formData.age) < FORM_CONFIG.age_range.min || Number(formData.age) > FORM_CONFIG.age_range.max)) {
      newErrors.age = `Age must be between ${FORM_CONFIG.age_range.min} and ${FORM_CONFIG.age_range.max}`;
    }
    
    if (formData.height_cm && (Number(formData.height_cm) < FORM_CONFIG.height_range.min || Number(formData.height_cm) > FORM_CONFIG.height_range.max)) {
      newErrors.height_cm = `Height must be between ${FORM_CONFIG.height_range.min} and ${FORM_CONFIG.height_range.max} cm`;
    }
    
    if (formData.weight_kg && (Number(formData.weight_kg) < FORM_CONFIG.weight_range.min || Number(formData.weight_kg) > FORM_CONFIG.weight_range.max)) {
      newErrors.weight_kg = `Weight must be between ${FORM_CONFIG.weight_range.min} and ${FORM_CONFIG.weight_range.max} kg`;
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // UPDATED: Enhanced API call with protein data handling
  const generateMealPlan = async (): Promise<void> => {
    setIsLoading(true);
    setApiError(null);

    try {
      const requestData = {
        ...formData,
        age: Number(formData.age),
        height_cm: Number(formData.height_cm),
        weight_kg: Number(formData.weight_kg)
      };

      console.log('Sending request to API...', requestData);

      const response = await fetch(`${API_BASE_URL}/api/generate-meal-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: EnhancedApiResponse = await response.json();
      console.log('Received API response:', data);
      
      // UPDATED: Set all enhanced state with protein data
      console.log('Setting meal plan:', data.meal_plan);
      console.log('Setting meal proteins:', data.meal_proteins);
      console.log('Total protein:', data.total_protein);
      
      setCalculatedData(data.calculated_data);
      setMealPlan(data.meal_plan);
      setMealCalories(data.meal_calories);
      setMealProteins(data.meal_proteins);
      setNutritionalSummary(data.nutritional_summary);
      setTotalCalories(data.total_calories);
      setTotalProtein(data.total_protein);
      setDailyProteinTarget(data.daily_protein_target);

      setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Error generating meal plan:', error);
      setApiError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      await generateMealPlan();
    } else {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // API health check
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        if (healthResponse.ok) {
          setApiHealthy(true);
          setApiError(null);
          
          try {
            const statsResponse = await fetch(`${API_BASE_URL}/api/dish-stats`);
            if (statsResponse.ok) {
              const stats = await statsResponse.json();
              setDishStats(stats);
            }
          } catch (statsError) {
            console.warn('Could not load dish statistics');
          }
        } else {
          setApiError('API server is not responding properly');
          setApiHealthy(false);
        }
      } catch (error) {
        setApiError('Cannot connect to API server. Make sure the backend is running on http://localhost:8000');
        setApiHealthy(false);
      }
    };

    checkApiHealth();
    const healthCheckInterval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(healthCheckInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🍽️ FitFeast
          </h1>
          <p className="text-lg text-gray-600">
            Get AI-powered meal recommendations with optimized protein content
          </p>
        </header>

        {/* API Status Banner */}
        <div className="mb-6">
          {apiError ? (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-sm">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">❌</span>
                <div>
                  <strong>API Connection Error:</strong>
                  <p className="text-sm mt-1">{apiError}</p>
                </div>
              </div>
            </div>
          ) : apiHealthy ? (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  <span><strong>Connected to AI Meal Planning Service</strong></span>
                </div>
                {dishStats && (
                  <span className="text-sm">
                    {dishStats.total_dishes} protein-optimized dishes available
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg shadow-sm">
              <div className="flex items-center">
                <span className="text-yellow-500 mr-2">⚠️</span>
                <span>Checking API connection...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">👤</span> Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Name */}
              <div data-field="name">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.name}
                </p>}
              </div>

              {/* Age */}
              <div data-field="age">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age * ({FORM_CONFIG.age_range.min}-{FORM_CONFIG.age_range.max} years)
                </label>
                <input
                  type="number"
                  min={FORM_CONFIG.age_range.min}
                  max={FORM_CONFIG.age_range.max}
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value ? Number(e.target.value) : '')}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.age ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                  placeholder="Your age"
                />
                {errors.age && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.age}
                </p>}
              </div>

              {/* Gender */}
              <div data-field="gender">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select gender</option>
                  {FORM_CONFIG.gender_options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.gender && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.gender}
                </p>}
              </div>

              {/* Region */}
              <div data-field="Region">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region *
                </label>
                <select
                  value={formData.Region}
                  onChange={(e) => handleInputChange('Region', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.Region ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select region</option>
                  {FORM_CONFIG.Region_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.Region && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.Region}
                </p>}
              </div>

              {/* Height */}
              <div data-field="height_cm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height * ({FORM_CONFIG.height_range.min}-{FORM_CONFIG.height_range.max} cm)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={FORM_CONFIG.height_range.min}
                    max={FORM_CONFIG.height_range.max}
                    value={formData.height_cm}
                    onChange={(e) => handleInputChange('height_cm', e.target.value ? Number(e.target.value) : '')}
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.height_cm ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Height in cm"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 text-sm">cm</span>
                </div>
                {errors.height_cm && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.height_cm}
                </p>}
              </div>

              {/* Weight */}
              <div data-field="weight_kg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight * ({FORM_CONFIG.weight_range.min}-{FORM_CONFIG.weight_range.max} kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={FORM_CONFIG.weight_range.min}
                    max={FORM_CONFIG.weight_range.max}
                    step="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => handleInputChange('weight_kg', e.target.value ? Number(e.target.value) : '')}
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.weight_kg ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                    }`}
                    placeholder="Weight in kg"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 text-sm">kg</span>
                </div>
                {errors.weight_kg && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.weight_kg}
                </p>}
              </div>
            </div>

            {/* Real-time BMI and Protein Preview */}
            {calculatedData.bmi && formData.weight_kg && formData.primary_goal && formData.lifestyle_type && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${getBMIBackground(calculatedData.bmi)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Preview BMI:</span>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${getBMIColor(calculatedData.bmi)}`}>
                        {calculatedData.bmi?.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({calculatedData.bmi_category})
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-900">Daily Protein Target:</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-orange-600">
                        {calculateProteinNeeds(Number(formData.weight_kg), formData.primary_goal, formData.lifestyle_type)}g
                      </span>
                      <p className="text-sm text-orange-700">protein requirement</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Goals & Preferences Section */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">🎯</span> Goals & Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary Goal */}
              <div data-field="primary_goal">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Health Goal *
                </label>
                <select
                  value={formData.primary_goal}
                  onChange={(e) => handleInputChange('primary_goal', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.primary_goal ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select your primary goal</option>
                  {FORM_CONFIG.primary_goal_options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.primary_goal && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.primary_goal}
                </p>}
              </div>

              {/* Lifestyle Type */}
              <div data-field="lifestyle_type">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level *
                </label>
                <select
                  value={formData.lifestyle_type}
                  onChange={(e) => handleInputChange('lifestyle_type', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.lifestyle_type ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select activity level</option>
                  {FORM_CONFIG.lifestyle_type_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.lifestyle_type && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.lifestyle_type}
                </p>}
              </div>

              {/* Dietary Strictness */}
              <div data-field="dietary_strictness">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Preference *
                </label>
                <select
                  value={formData.dietary_strictness}
                  onChange={(e) => handleInputChange('dietary_strictness', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.dietary_strictness ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select dietary preference</option>
                  {FORM_CONFIG.dietary_strictness_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.dietary_strictness && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.dietary_strictness}
                </p>}
              </div>

              {/* Flavor Preferences */}
              <div data-field="flavor_preferences">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flavor Preference *
                </label>
                <select
                  value={formData.flavor_preferences}
                  onChange={(e) => handleInputChange('flavor_preferences', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.flavor_preferences ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select flavor preference</option>
                  {FORM_CONFIG.flavor_preferences_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.flavor_preferences && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.flavor_preferences}
                </p>}
              </div>

              {/* Prep Skill Level */}
              <div data-field="prep_skill_level">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cooking Skill Level *
                </label>
                <select
                  value={formData.prep_skill_level}
                  onChange={(e) => handleInputChange('prep_skill_level', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.prep_skill_level ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select skill level</option>
                  {FORM_CONFIG.prep_skill_level_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.prep_skill_level && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.prep_skill_level}
                </p>}
              </div>

              {/* Affordability Preference */}
              <div data-field="affordability_preference">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Preference *
                </label>
                <select
                  value={formData.affordability_preference}
                  onChange={(e) => handleInputChange('affordability_preference', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.affordability_preference ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <option value="">Select budget preference</option>
                  {FORM_CONFIG.affordability_preference_options.map(option => (
                    <option key={option} value={option}>
                      {formatDisplayName(option)}
                    </option>
                  ))}
                </select>
                {errors.affordability_preference && <p className="text-red-500 text-sm mt-1 flex items-center">
                  <span className="mr-1">⚠️</span>{errors.affordability_preference}
                </p>}
              </div>
            </div>
          </div>

          {/* Dietary Restrictions & Allergies Section */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">⚠️</span> Dietary Restrictions & Allergies
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Known Allergies <span className="text-gray-500">(Select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {FORM_CONFIG.known_allergies_options.map(allergy => (
                  <label key={allergy} className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.known_allergies.includes(allergy)}
                      onChange={() => handleCheckboxChange('known_allergies', allergy)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {formatDisplayName(allergy)}
                    </span>
                  </label>
                ))}
              </div>
              {formData.known_allergies.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Selected allergies:</strong> {formData.known_allergies.map(formatDisplayName).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Meal Preferences Section */}
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">🍽️</span> Meal Preferences
            </h2>
            
            <div className="space-y-6">
              {/* Preferred Meal Times */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Meal Times <span className="text-gray-500">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {FORM_CONFIG.preferred_meal_times_options.map(time => (
                    <label key={time} className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.preferred_meal_times.includes(time)}
                        onChange={() => handleCheckboxChange('preferred_meal_times', time)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {time}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Persona Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Lifestyle Tags <span className="text-gray-500">(Select all that apply)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {FORM_CONFIG.persona_tags_options.map(tag => (
                    <label key={tag} className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.persona_tags.includes(tag)}
                        onChange={() => handleCheckboxChange('persona_tags', tag)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {formatDisplayName(tag)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center py-6">
            <button
              type="submit"
              disabled={isLoading || !apiHealthy}
              className={`px-8 py-4 rounded-xl font-semibold text-white text-lg transition-all duration-200 transform ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : !apiHealthy
                  ? 'bg-red-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Your Protein-Optimized Meal Plan...
                </span>
              ) : !apiHealthy ? (
                'API Not Available'
              ) : (
                '🚀 Create My Protein-Optimized Meal Plan'
              )}
            </button>
            
            {!apiHealthy && (
              <p className="text-sm text-red-600 mt-2">
                Please check the API connection before submitting
              </p>
            )}
          </div>
        </form>

        {/* UPDATED: Display Results with Protein Information */}
        {calculatedData.bmi && calculatedData.caloric_intake && (
          <div id="results-section" className="mt-12 space-y-6">
            {/* UPDATED: Health Metrics with Protein Information */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">📊</span> Your Health & Nutrition Metrics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border-2 ${getBMIBackground(calculatedData.bmi)}`}>
                  <h3 className="font-medium text-gray-900">BMI</h3>
                  <p className={`text-3xl font-bold ${getBMIColor(calculatedData.bmi)}`}>
                    {calculatedData.bmi?.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600">{calculatedData.bmi_category}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h3 className="font-medium text-green-900">Daily Calories</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {calculatedData.caloric_intake?.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-700">kcal per day</p>
                </div>

                {calculatedData.bmr && (
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <h3 className="font-medium text-blue-900">BMR</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {calculatedData.bmr?.toFixed(0)}
                    </p>
                    <p className="text-sm text-blue-700">base metabolic rate</p>
                  </div>
                )}

                {/* NEW: Protein Target Display */}
                <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                  <h3 className="font-medium text-orange-900">Protein Target</h3>
                  <p className="text-3xl font-bold text-orange-600">
                    {dailyProteinTarget}g
                  </p>
                  <p className="text-sm text-orange-700">daily requirement</p>
                </div>
              </div>

              {/* NEW: Protein Achievement Summary */}
              {totalProtein > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900">Total Protein</h3>
                    <p className="text-2xl font-bold text-purple-600">{totalProtein}g</p>
                    <p className="text-sm text-purple-700">from meal plan</p>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${getProteinAdequacyBackground(nutritionalSummary?.protein_adequacy || '0%')}`}>
                    <h3 className="font-medium text-gray-900">Protein Adequacy</h3>
                    <p className={`text-2xl font-bold ${getProteinAdequacyColor(nutritionalSummary?.protein_adequacy || '0%')}`}>
                      {nutritionalSummary?.protein_adequacy}
                    </p>
                    <p className="text-sm text-gray-700">of daily target</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="font-medium text-indigo-900">Protein Gap</h3>
                    <p className="text-2xl font-bold text-indigo-600">
                      {dailyProteinTarget - totalProtein > 0 ? `${dailyProteinTarget - totalProtein}g` : '0g'}
                    </p>
                    <p className="text-sm text-indigo-700">
                      {dailyProteinTarget - totalProtein > 0 ? 'remaining needed' : 'goal achieved!'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* UPDATED: Meal Plan with Protein Display */}
            {mealPlan && (
              <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="mr-2">🍽️</span> Your Personalized Meal Plan
                </h2>
                
                <div className="space-y-4">
                  {/* Breakfast */}
                  {mealPlan.breakfast && (
                    <div className="border-l-4 border-indigo-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">Breakfast</h3>
                        <div className="flex gap-3">
                          {mealCalories && mealCalories['breakfast'] && (
                            <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealCalories['breakfast']} kcal
                            </span>
                          )}
                          {mealPlan.breakfast_protein > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealPlan.breakfast_protein}g protein
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{mealPlan.breakfast}</p>
                      
                      {/* Protein contribution bar */}
                      {dailyProteinTarget > 0 && mealPlan.breakfast_protein > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Protein contribution to daily target</span>
                            <span>{((mealPlan.breakfast_protein / dailyProteinTarget) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((mealPlan.breakfast_protein / dailyProteinTarget) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lunch */}
                  {mealPlan.lunch && (
                    <div className="border-l-4 border-green-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">Lunch</h3>
                        <div className="flex gap-3">
                          {mealCalories && mealCalories['lunch'] && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealCalories['lunch']} kcal
                            </span>
                          )}
                          {mealPlan.lunch_protein > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealPlan.lunch_protein}g protein
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{mealPlan.lunch}</p>
                      
                      {/* Protein contribution bar */}
                      {dailyProteinTarget > 0 && mealPlan.lunch_protein > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Protein contribution to daily target</span>
                            <span>{((mealPlan.lunch_protein / dailyProteinTarget) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((mealPlan.lunch_protein / dailyProteinTarget) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dinner */}
                  {mealPlan.dinner && (
                    <div className="border-l-4 border-purple-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">Dinner</h3>
                        <div className="flex gap-3">
                          {mealCalories && mealCalories['dinner'] && (
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealCalories['dinner']} kcal
                            </span>
                          )}
                          {mealPlan.dinner_protein > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealPlan.dinner_protein}g protein
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{mealPlan.dinner}</p>
                      
                      {/* Protein contribution bar */}
                      {dailyProteinTarget > 0 && mealPlan.dinner_protein > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Protein contribution to daily target</span>
                            <span>{((mealPlan.dinner_protein / dailyProteinTarget) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((mealPlan.dinner_protein / dailyProteinTarget) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Snacks */}
                  {mealPlan.snack_1 && (
                    <div className="border-l-4 border-yellow-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">Morning Snack</h3>
                        <div className="flex gap-3">
                          {mealCalories && mealCalories['snack_1'] && (
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealCalories['snack_1']} kcal
                            </span>
                          )}
                          {mealPlan.snack_1_protein > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealPlan.snack_1_protein}g protein
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{mealPlan.snack_1}</p>
                    </div>
                  )}

                  {mealPlan.snack_2 && (
                    <div className="border-l-4 border-pink-500 pl-6 py-4 bg-gray-50 rounded-r-lg">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 text-lg">Evening Snack</h3>
                        <div className="flex gap-3">
                          {mealCalories && mealCalories['snack_2'] && (
                            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealCalories['snack_2']} kcal
                            </span>
                          )}
                          {mealPlan.snack_2_protein > 0 && (
                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                              {mealPlan.snack_2_protein}g protein
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{mealPlan.snack_2}</p>
                    </div>
                  )}
                </div>

                {/* UPDATED: Total Summary with Protein */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-indigo-900">Total Daily Calories:</span>
                      <span className="text-2xl font-bold text-indigo-600">{totalCalories} kcal</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-orange-900">Total Daily Protein:</span>
                      <span className="text-2xl font-bold text-orange-600">{totalProtein}g</span>
                    </div>
                    <div className="text-sm text-orange-700 mt-1">
                      Target: {dailyProteinTarget}g ({nutritionalSummary?.protein_adequacy} achieved)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UPDATED: Enhanced Nutritional Summary with Protein Analysis */}
            {nutritionalSummary && (
              <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <span className="mr-2">📋</span> Nutritional Summary & Protein Analysis
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Daily Targets</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <p className="text-gray-700"><strong>Calories:</strong> {nutritionalSummary.total_daily_calories}</p>
                        <p className="text-gray-700"><strong>Protein:</strong> {nutritionalSummary.daily_protein_target}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Meal Distribution</h3>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {nutritionalSummary.meal_distribution}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Achievement Summary</h3>
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200 space-y-2">
                        <p className="text-gray-700"><strong>Protein Achieved:</strong> {nutritionalSummary.total_protein_achieved}</p>
                        <p className="text-gray-700"><strong>Adequacy:</strong> {nutritionalSummary.protein_adequacy}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Dietary Notes</h3>
                      <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        {nutritionalSummary.dietary_notes}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Primary Focus</h3>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    {nutritionalSummary.primary_focus}
                  </p>
                </div>

                {/* Protein Recommendations */}
                {dailyProteinTarget > totalProtein && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h3 className="font-medium text-orange-900 mb-2">💡 Protein Optimization Tips</h3>
                    <p className="text-orange-800 text-sm">
                      You're {dailyProteinTarget - totalProtein}g short of your daily protein target. 
                      Consider adding protein-rich snacks like Greek yogurt, nuts, or protein shakes to bridge this gap.
                    </p>
                  </div>
                )}

                {/* AI Generation Notice */}
                {nutritionalSummary.ai_generation && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 flex items-center">
                      <span className="mr-2">🤖</span>
                      {nutritionalSummary.ai_generation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">🖨️</span> Print Meal Plan
                </button>
                
                <button
                  onClick={() => {
                    const resultsElement = document.getElementById('results-section');
                    if (resultsElement) {
                      resultsElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">📋</span> View Summary
                </button>
                
                <button
                  onClick={() => {
                    setMealPlan(null);
                    setMealCalories(null);
                    setMealProteins(null);
                    setNutritionalSummary(null);
                    setTotalCalories(0);
                    setTotalProtein(0);
                    setDailyProteinTarget(0);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">🔄</span> Create New Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>© 2025 Personalized Meal Planner. Protein-optimized nutrition for your lifestyle.</p>
          {dishStats && (
            <p className="mt-1">
              Powered by {dishStats.total_dishes} carefully curated dishes with accurate protein data
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
