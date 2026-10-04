# Imagen oficial de Playwright: trae Chromium, Firefox y WebKit y sus dependencias del sistema.
# La etiqueta debe coincidir con la versión de @playwright/test del package.json (1.63.0).
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

# better-sqlite3 es un módulo nativo: si no hay binario precompilado para la versión de Node
# de la imagen, se compila localmente y necesita make, g++ y python3.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential python3 \
    && rm -rf /var/lib/apt/lists/*

# Se copian primero los manifiestos para aprovechar la caché de capas de Docker.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# El contenedor se ejecuta con el UID/GID del anfitrión (ver docker-compose.yml) para que los reportes
# generados en los volúmenes montados no queden como propiedad de root. Por eso /app debe ser escribible.
RUN mkdir -p db reports playwright-report allure-results test-results .auth && chmod -R a+rwX /app

# CI=1 activa 2 reintentos y 2 workers (ver playwright.config.ts).
ENV CI=1 \
    BUGS=on \
    TEST_PORT=3101 \
    ENTORNO_VISUAL=docker

# Por defecto ejecuta toda la suite; el comando se puede sobrescribir (ver docker-compose.yml).
CMD ["npm", "test"]
