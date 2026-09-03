FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV/Pillow if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV TF_ENABLE_ONEDNN_OPTS=0

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

