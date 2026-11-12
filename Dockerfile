# Sloth en el servidor: la interfaz armada (`dist/web`) y el mismo servidor de la app de escritorio, sin Electron.
# Es a lo que entra el teléfono (APK o navegador). La app de escritorio se sigue armando con `npm start`.
FROM node:26-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
# Solo las dependencias de runtime: Electron (devDependency) no viaja al servidor.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server ./server
COPY web ./web
COPY shared ./shared
COPY skills ./skills
COPY python ./python
COPY licencias ./licencias
COPY nube ./nube
COPY scripts ./scripts
COPY assets ./assets
COPY docs ./docs
COPY cards.json tsconfig.json ./
RUN npm run build

FROM node:26-alpine
# La fecha renueva esta capa: sin ella, el builder reutiliza paquetes viejos del sistema.
RUN echo "os-refresh 2026-11-12" && apk upgrade --no-cache && apk add --no-cache ffmpeg python3
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
ENV PORT=3000
# El servidor escucha en 0.0.0.0 y acepta el host público (HTTPS del despliegue), solo desde su propia página.
ENV SLOTH_ABIERTO=1
EXPOSE 3000
CMD ["node", "--import", "tsx", "server/index.ts"]
