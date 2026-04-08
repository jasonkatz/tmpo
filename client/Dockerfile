FROM node:20-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN npm install --legacy-peer-deps

COPY index.html tsconfig.json vite.config.ts ./
COPY public/ public/
COPY src/ src/

# VITE_API_URL is inlined at build time. Default to /api so the nginx
# reverse proxy forwards API requests to the server container.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npx vite build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
