FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production PORT=10000
WORKDIR /app
COPY backend/requirements.lock.txt /app/backend/requirements.lock.txt
RUN pip install --no-cache-dir -r backend/requirements.lock.txt && useradd --create-home --uid 10001 ahabridge
COPY backend/ /app/backend/
COPY scripts/start.sh /app/scripts/start.sh
COPY --from=frontend /build/frontend/dist /app/frontend/dist
RUN chmod +x /app/scripts/start.sh && chown -R ahabridge:ahabridge /app
USER ahabridge
EXPOSE 10000
CMD ["/app/scripts/start.sh"]
