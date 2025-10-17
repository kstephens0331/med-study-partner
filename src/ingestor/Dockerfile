FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start the application using PORT environment variable
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}
