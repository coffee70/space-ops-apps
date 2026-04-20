FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/satnogs_adapter

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV VEHICLE_CONFIG_ROOT=/app/vehicle-configurations

CMD ["python", "-m", "satnogs_adapter.main", "--config", "/app/satnogs_adapter/config.example.yaml"]
