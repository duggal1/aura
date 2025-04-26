# Use an official Python runtime as a parent image
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install build dependencies (if any needed for specific packages)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc build-essential && rm -rf /var/lib/apt/lists/*

# Install pip dependencies
# Copy only requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# --- Final Stage ---
FROM python:3.11-slim

# Install runtime dependencies from wheels (installing before creating user)
WORKDIR /app # Temporarily work in /app for installation
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels \
    && rm requirements.txt

# Create non-root user
RUN useradd --user-group --system --no-log-init --create-home appuser

# Corrected: Set WORKDIR to the parent directory (/home/appuser)
WORKDIR /home/appuser

# Corrected: Copy the local 'app' directory into a subdirectory named 'app'
# inside the WORKDIR. This makes 'app' recognizable as a package.
COPY ./app ./app

# Corrected: Ensure the appuser owns the work directory and the 'app' subdir
RUN chown -R appuser:appuser /home/appuser

# Switch to the non-root user
USER appuser

# WORKDIR remains /home/appuser (parent of the 'app' package)

# Expose ports (FastAPI and Prometheus)
EXPOSE 8000
EXPOSE 8001

# Corrected: Tell Uvicorn to load 'app' from the 'app' module/package
# relative to the WORKDIR (/home/appuser).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# For production, consider using Gunicorn with Uvicorn workers:
# CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000"]