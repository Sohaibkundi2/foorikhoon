# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked in at build time — Next.js inlines NEXT_PUBLIC_* vars into the
# client bundle, so this must be passed as a build arg, not just a
# runtime env var (runtime env vars alone won't reach the browser bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# requires next.config.js to have `output: 'standalone'`
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
