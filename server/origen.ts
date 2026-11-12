import type { IncomingMessage } from 'node:http'

/**
 * Solo admite la ventana de Sloth y los scripts locales. Host corta el DNS rebinding; Sec-Fetch-Site y Origin impiden
 * que otra página use la API o abra el WebSocket. Google puede volver solo a YouTube OAuth como navegación de documento:
 * ese adaptador comprueba además el state único y PKCE antes de guardar una cuenta o sus permisos.
 */
export function peticionDeConfianza(req: Pick<IncomingMessage, 'headers' | 'method' | 'url'>, puerto: number | string): boolean {
  // `SLOTH_HOSTS` suma las direcciones desde las que se abre Sloth fuera de esta computadora: la del APK de Android o la
  // de otro equipo de la red (`SLOTH_HOSTS=192.168.1.10:4848`). Sin ella, solo la ventana de esta máquina.
  const extra = (process.env.SLOTH_HOSTS ?? '').split(',').map((host) => host.trim()).filter(Boolean)
  // En el servidor (`SLOTH_ABIERTO=1`, el despliegue al que entra el teléfono por HTTPS) no hay una dirección fija que
  // apuntar: vale el mismo host que sirve la página, y solo ese. Una página de otro sitio manda su `Origin`, que no
  // coincide, y sigue sin poder usar la API.
  if (process.env.SLOTH_ABIERTO === '1' && mismoSitio(req)) return true
  const propios = [`localhost:${puerto}`, `127.0.0.1:${puerto}`, ...extra]
  if (!propios.includes(req.headers.host ?? '')) return false
  const origen = req.headers.origin
  const propio = !origen || propios.some((p) => origen === `http://${p}`)
  const retornoYoutube = req.method === 'GET'
    && req.url?.split('?')[0] === '/api/youtube/oauth'
    && req.headers['sec-fetch-mode'] === 'navigate'
    && req.headers['sec-fetch-dest'] === 'document'
  if (retornoYoutube && (propio || origen === 'https://accounts.google.com')) return true
  // La vista en vivo del estudio (el motor o la de la skill) se abre desde la otra dirección de esta computadora
  // (`127.0.0.1` si la ventana es `localhost`): para el navegador es otro sitio y la carga en su propio proceso, sin
  // frenar la interfaz (web/src/Monitor.tsx). Solo como marco de la ventana de Sloth: lo dice su `Referer`.
  const marcoPropio = req.method === 'GET'
    && /^\/api\/sessions\/[\w-]+\/(motor|vivo)(\/|\?|$)/.test(req.url ?? '')
    && req.headers['sec-fetch-dest'] === 'iframe'
    && propios.some((p) => (req.headers.referer ?? '').startsWith(`http://${p}/`))
  if (marcoPropio) return true
  const sitio = req.headers['sec-fetch-site']
  if (sitio && sitio !== 'same-origin' && sitio !== 'none') return false
  return propio
}

/** La página y su `Origin` son el mismo host: es la propia app la que pide, no otra página abierta en el navegador. */
function mismoSitio(req: Pick<IncomingMessage, 'headers'>): boolean {
  const host = req.headers.host
  if (!host) return false
  const origen = req.headers.origin
  if (origen) {
    try {
      return new URL(origen).host === host
    } catch {
      return false
    }
  }
  const sitio = req.headers['sec-fetch-site']
  return !sitio || sitio === 'same-origin' || sitio === 'none'
}
