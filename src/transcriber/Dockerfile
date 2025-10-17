FROM python:3.11-slim

# Install ffmpeg for audio extraction
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Railway will set PORT via environment variable
# Start command is defined in railway.json
