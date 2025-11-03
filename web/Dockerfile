FROM node:18-alpine AS build
WORKDIR /app

# Устанавливаем зависимости с кэшем npm
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Копируем только необходимые файлы для билда, чтобы не инвалидировать кэш лишний раз
COPY vite.config.js ./vite.config.js
COPY tailwind.config.js ./tailwind.config.js
COPY postcss.config.js ./postcss.config.js
COPY index.html ./index.html
COPY public ./public
COPY src ./src

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Кэш для Vite/Esbuild
RUN --mount=type=cache,target=/root/.cache --mount=type=cache,target=/app/node_modules/.vite npm run build

FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build /app/dist .
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


