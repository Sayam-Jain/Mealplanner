# src/main.py
import uvicorn
from api import app
# src/main.py


if __name__ == "__main__":
    uvicorn.run(
        "api:app",  # Pass as an import string
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src"],
    )
