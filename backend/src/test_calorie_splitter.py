# test_prompt_import.py
import sys
import os

sys.path.insert(0, r"D:\meal_planner\datalumina-project-template\src")

try:
    from prompt_builder import build_prompt
    print("build_prompt imported successfully")
except ImportError as e:
    print(f"ImportError: {e}")
