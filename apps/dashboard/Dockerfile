# Build du dashboard React puis service via nginx.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/dashboard/package.json apps/dashboard/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/dashboard apps/dashboard
RUN npm run build --workspace=@accelyo/dashboard

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html
# ATTENTION: ce nginx tourne EN INTERNE - il n'expose pas SSL.
# Le SSL est gere par le nginx principal (infra/nginx).
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
