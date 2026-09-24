#!/bin/bash
# Activate the virtual environment
source venv/bin/activate
   
# Start the Uvicorn server
uvicorn app.main:app --reload --port 8001


