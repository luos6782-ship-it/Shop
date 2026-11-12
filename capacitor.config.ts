import type { CapacitorConfig } from '@capacitor/cli'

/**
 * El APK de Sloth es la misma interfaz dentro de una ventana Android (WebView). Sloth trabaja en la computadora —los
 * agentes, FFmpeg, Python y Remotion corren ahí—, así que el APK no trae el servidor: se conecta al que ya corre.
 *
 * - Con `SLOTH_URL=http://192.168.1.10:4848 npx cap sync android`, el APK abre Sloth directo.
 * - Sin ella, el APK abre la pantalla de `android-web/`, donde se escribe la dirección una vez y queda guardada.
 *
 * El servidor tiene que aceptar esa dirección (`SLOTH_HOSTS` en `server/origen.ts`): la app de escritorio lo pone sola
 * cuando abres el acceso desde el teléfono.
 */
const servidor = (process.env.SLOTH_URL ?? '').trim()

const config: CapacitorConfig = {
  appId: 'org.vancci.sloth',
  appName: 'Sloth',
  webDir: 'android-web',
  android: { allowMixedContent: true },
  ...(servidor ? { server: { url: servidor, cleartext: true, androidScheme: 'http' } } : {})
}

export default config
