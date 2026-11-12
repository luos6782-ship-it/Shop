/**
 * El service worker solo hace que Sloth se pueda instalar desde Chrome en Android (y que el armazón de la interfaz
 * abra sin red). No toca `/api/`: ahí vive el trabajo del servidor y nunca se guarda.
 */
const CACHE = 'sloth-ui-1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  evento.respondWith(
    fetch(request)
      .then((respuesta) => {
        if (respuesta.ok && respuesta.type === 'basic') {
          const copia = respuesta.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copia)).catch(() => {})
        }
        return respuesta
      })
      .catch(() => caches.match(request).then((guardada) => guardada ?? caches.match('/')))
  )
})
