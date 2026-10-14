#!/bin/bash
# Automatically create virtual environment if missing
if [ ! -f "venv/bin/activate" ]; then
  echo "Virtual environment not found. Setting up venv..."
  python3 -m venv venv
  source venv/bin/activate
  echo "Installing dependencies from requirements.txt..."
  pip install --upgrade pip
  pip install -r requirements.txt
else
  # Activate the existing virtual environment
  source venv/bin/activate
fi

# Start the Uvicorn server
uvicorn app.main:app --reload --port 8001


