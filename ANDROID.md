# Sloth en Android

## 0. Usarlo ahora en el teléfono (sin instalar nada)

Sloth ya está publicado y acepta el teléfono por HTTPS:

**https://qdppxqss2z.dev.onappjet.com**

Ábrela en Chrome del teléfono. Para que quede como una app (icono propio, pantalla completa, sin barra del navegador):
menú de Chrome → **Instalar aplicación** / **Añadir a pantalla de inicio**. Es la PWA: `web/public/manifest.webmanifest`,
`web/public/sw.js` (no guarda `/api/`) y los iconos 192/512 ya viajan en el despliegue.

En ese servidor no están las herramientas de la computadora (FFmpeg, Python, los agentes instalados), así que los estilos
que las necesitan avisan que faltan; las cuentas y llaves se conectan en **Opciones → Agentes**.

## El APK

El APK de Sloth es **la misma interfaz** dentro de una ventana Android (WebView, con Capacitor). Sloth trabaja en la
computadora —los agentes, FFmpeg, Python y Remotion corren ahí—, así que el APK no trae el servidor: se conecta al que
ya corre. Sin dirección propia abre la app publicada de arriba; con `SLOTH_URL` abre tu computadora.

## 1. Conseguir el APK

El APK necesita el SDK de Android y Gradle. Aquí no se compila (este entorno solo compila web), así que lo arma GitHub
Actions y lo deja listo para descargar:

1. En GitHub, **Actions → APK Android → Run workflow**. Ya viene con
   `https://qdppxqss2z.dev.onappjet.com` en `servidor`, así que el APK abre la app publicada. Si quieres que abra tu
   computadora, escribe ahí su dirección (por ejemplo `http://192.168.1.10:4848`).
2. Al terminar la ejecución, descarga el artefacto **`sloth-apk`** y descomprime `app-debug.apk`.
3. Pasa el archivo al teléfono e instálalo (Android pedirá permitir «instalar apps desconocidas» para esa app).

El workflow también se dispara solo cuando cambia `android-web/`, `capacitor.config.ts` o los iconos.

## 2. Compilarlo en tu computadora

Necesitas Node 24, JDK 21 y el SDK de Android (viene con Android Studio).

```bash
npm ci --ignore-scripts
npx cap add android                                        # solo la primera vez: crea android/
SLOTH_URL=http://192.168.1.10:4848 npx cap sync android    # copia la pantalla y fija la dirección
cd android && ./gradlew assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Sin `SLOTH_URL`, el APK abre la pantalla de
conexión de `android-web/`.

## 3. Conectar el teléfono con la computadora

1. El teléfono y la computadora en la **misma red Wi-Fi**.
2. Averigua la IP de la computadora (`ipconfig` en Windows, `ipconfig getifaddr en0` en Mac, `hostname -I` en Linux).
3. Arranca Sloth aceptando esa dirección:

   ```bash
   # Linux y Mac
   SLOTH_HOSTS=192.168.1.10:4848 npm start

   # Windows (PowerShell)
   $env:SLOTH_HOSTS="192.168.1.10:4848"; npm start
   ```

   Sin `SLOTH_HOSTS` el servidor solo atiende a su propia ventana (es su defensa contra otras páginas del navegador) y
   el APK recibiría un 403.
4. En el APK escribe `http://192.168.1.10:4848` y toca **Abrir Sloth**.

**Ojo:** `SLOTH_HOSTS` abre la API de Sloth —que puede lanzar agentes con permisos en tu equipo— a esa dirección. Úsalo
en una red de confianza y no lo pongas con la IP pública del router.

## 4. Alternativa sin APK: instalarla desde Chrome

`web/public/manifest.webmanifest` y `web/public/sw.js` hacen que la interfaz se pueda instalar como aplicación. Sirve
la interfaz por HTTPS (Chrome no deja instalar por `http://` salvo en `localhost`), abre la dirección en el teléfono y
elige **Instalar aplicación** en el menú. Queda con su icono, a pantalla completa, como el APK.

## Qué hace y qué no

- **Hace:** la interfaz completa —estilos, hilos, estudio, galerías, redes— contra el Sloth de tu computadora.
- **No hace:** no ejecuta el servidor ni los agentes en el teléfono. Si la computadora está apagada o fuera de la red,
  el APK no tiene con qué trabajar.
- El APK de CI es de **depuración** (sin firmar para publicar). Para publicarlo en Play Store hay que firmarlo con un
  keystore y generar un `assembleRelease`.
