FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

# gunicorn instead of Flask's dev server / debug=True — the audit flagged
# debug=True as unsafe to run in any deployed environment
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "app:app"]
