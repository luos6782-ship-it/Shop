import { useEffect, useRef, useState } from 'react'
import './CrearVideo.css'

/**
 * «Crear video»: arma un video vertical de verdad aquí mismo, en el teléfono, sin conectar ninguna IA ni gastar créditos.
 * Se escribe la idea (o se pega un guion), y la pantalla se dibuja cuadro a cuadro en un lienzo de 1080×1920 y se graba
 * con el grabador del propio navegador (`MediaRecorder`), que devuelve un archivo WebM que se puede ver, bajar y volver a
 * abrir: queda guardado en el teléfono (`IndexedDB`), así que sigue ahí al cerrar la app.
 *
 * El servidor publicado no lleva ffmpeg (metía glib y bloqueaba la imagen), así que el video no se puede armar allí: se
 * arma en el teléfono, que es justo donde se va a ver.
 */

const ANCHO = 1080
const ALTO = 1920
const FPS = 30
/** Lo que dura cada escena y el mínimo/máximo del video entero. */
const POR_ESCENA = 2.6
const MINIMO = 6
const MAXIMO = 30

type Guardado = { id: string; titulo: string; fecha: number; blob: Blob }
type Hecho = Guardado & { url: string }

/** Parte la idea en frases cortas: una escena es lo que cabe de un vistazo en la pantalla del teléfono. */
export function enEscenas(idea: string, titulo: string): string[] {
  const limpio = idea.replace(/\s+/g, ' ').trim()
  const frases = limpio.split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean)
  const trozos: string[] = []
  for (const frase of frases) {
    const palabras = frase.split(' ')
    let linea = ''
    for (const palabra of palabras) {
      const prueba = linea ? `${linea} ${palabra}` : palabra
      // Cada escena son dos renglones cortos; más largo no se lee en el teléfono.
      if (prueba.length > 44 && linea) {
        trozos.push(linea)
        linea = palabra
      } else linea = prueba
    }
    if (linea) trozos.push(linea)
  }
  const escenas = trozos.slice(0, 10)
  return escenas.length ? [titulo.trim() || 'Mi video', ...escenas] : [titulo.trim() || 'Mi video']
}

function envolver(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let actual = ''
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual)
      actual = palabra
    } else actual = prueba
  }
  if (actual) lineas.push(actual)
  return lineas.slice(0, 5)
}

/** Dibuja el cuadro del segundo `t`: fondo con halo, el texto de su escena entrando y saliendo, la marca y el avance. */
export function dibujar(ctx: CanvasRenderingContext2D, escenas: string[], t: number, total: number): void {
  const por = total / escenas.length
  const i = Math.min(escenas.length - 1, Math.max(0, Math.floor(t / por)))
  const local = Math.min(1, Math.max(0, (t - i * por) / por))

  const fondo = ctx.createLinearGradient(0, 0, ANCHO, ALTO)
  fondo.addColorStop(0, '#0f0722')
  fondo.addColorStop(0.55, '#1b1040')
  fondo.addColorStop(1, '#2a1160')
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  const halo = ctx.createRadialGradient(ANCHO / 2, ALTO * 0.42, 40, ANCHO / 2, ALTO * 0.42, ALTO * 0.55)
  halo.addColorStop(0, `rgba(155,123,255,${0.22 + 0.06 * Math.sin(t * 2)})`)
  halo.addColorStop(1, 'rgba(155,123,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  const entrada = Math.min(1, local / 0.18)
  const salida = Math.min(1, (1 - local) / 0.18)
  const esTitulo = i === 0
  const cuerpo = esTitulo ? 96 : 72
  ctx.save()
  ctx.globalAlpha = Math.min(entrada, salida)
  ctx.translate(0, (1 - entrada) * 60)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = esTitulo ? '#ffffff' : '#f2ecff'
  ctx.font = `${esTitulo ? 800 : 700} ${cuerpo}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  const lineas = envolver(ctx, escenas[i], ANCHO - 180)
  const alto = lineas.length * cuerpo * 1.24
  lineas.forEach((linea, n) => {
    ctx.fillText(linea, ANCHO / 2, ALTO / 2 - alto / 2 + cuerpo * 0.62 + n * cuerpo * 1.24)
  })
  ctx.restore()

  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#c9b8ff'
  ctx.font = '600 40px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Sloth', ANCHO / 2, ALTO - 150)
  ctx.globalAlpha = 1

  ctx.fillStyle = 'rgba(255,255,255,.16)'
  ctx.fillRect(80, 92, ANCHO - 160, 10)
  ctx.fillStyle = '#9b7bff'
  ctx.fillRect(80, 92, (ANCHO - 160) * Math.min(1, t / total), 10)
}

const BD = 'sloth-videos-caseros'

function abrirBase(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BD, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('videos', { keyPath: 'id' })
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rechazar(pedido.error)
  })
}

async function guardarEnDisco(dato: Guardado): Promise<void> {
  const base = await abrirBase()
  await new Promise<void>((resolver, rechazar) => {
    const tx = base.transaction('videos', 'readwrite')
    tx.objectStore('videos').put(dato)
    tx.oncomplete = () => resolver()
    tx.onerror = () => rechazar(tx.error)
  })
  base.close()
}

async function leerDelDisco(): Promise<Guardado[]> {
  const base = await abrirBase()
  const todos = await new Promise<Guardado[]>((resolver, rechazar) => {
    const tx = base.transaction('videos', 'readonly')
    const pedido = tx.objectStore('videos').getAll()
    pedido.onsuccess = () => resolver(pedido.result as Guardado[])
    pedido.onerror = () => rechazar(pedido.error)
  })
  base.close()
  return todos.sort((a, b) => b.fecha - a.fecha)
}

async function borrarDelDisco(id: string): Promise<void> {
  const base = await abrirBase()
  await new Promise<void>((resolver, rechazar) => {
    const tx = base.transaction('videos', 'readwrite')
    tx.objectStore('videos').delete(id)
    tx.oncomplete = () => resolver()
    tx.onerror = () => rechazar(tx.error)
  })
  base.close()
}

export function CrearVideo() {
  const [titulo, setTitulo] = useState('')
  const [idea, setIdea] = useState('')
  const [grabando, setGrabando] = useState(false)
  const [pct, setPct] = useState(0)
  const [fallo, setFallo] = useState('')
  const [hechos, setHechos] = useState<Hecho[]>([])
  const [ultimo, setUltimo] = useState<string | null>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let vivo = true
    leerDelDisco()
      .then((todos) => vivo && setHechos(todos.map((g) => ({ ...g, url: URL.createObjectURL(g.blob) }))))
      .catch(() => {}) // sin IndexedDB (modo privado) se puede crear igual; solo no queda guardado
    return () => {
      vivo = false
    }
  }, [])

  async function crear() {
    const canvas = lienzo.current
    if (!canvas || grabando) return
    const escenas = enEscenas(idea, titulo)
    if (escenas.length < 2) {
      setFallo('Escribe tu idea: con una frase ya sale un video.')
      return
    }
    setFallo('')
    setGrabando(true)
    setPct(0)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setGrabando(false)
      return setFallo('Este navegador no deja dibujar el video.')
    }
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setGrabando(false)
      return setFallo('Este navegador no sabe grabar video. Prueba con Chrome o con la app en tu teléfono.')
    }

    const total = Math.min(MAXIMO, Math.max(MINIMO, escenas.length * POR_ESCENA))
    const flujo = canvas.captureStream(FPS)
    const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t))
    const grabador = new MediaRecorder(flujo, tipo ? { mimeType: tipo, videoBitsPerSecond: 4_000_000 } : undefined)
    const trozos: Blob[] = []
    grabador.ondataavailable = (e) => {
      if (e.data.size) trozos.push(e.data)
    }
    const terminado = new Promise<Blob>((resolver) => {
      grabador.onstop = () => resolver(new Blob(trozos, { type: tipo ?? 'video/webm' }))
    })

    dibujar(ctx, escenas, 0, total)
    grabador.start()
    const inicio = performance.now()
    await new Promise<void>((resolver) => {
      const paso = () => {
        const t = (performance.now() - inicio) / 1000
        dibujar(ctx, escenas, Math.min(t, total), total)
        setPct(Math.min(100, Math.round((t / total) * 100)))
        if (t >= total) return resolver()
        requestAnimationFrame(paso)
      }
      requestAnimationFrame(paso)
    })
    grabador.stop()
    const blob = await terminado
    flujo.getTracks().forEach((pista) => pista.stop())

    const dato: Guardado = { id: Math.random().toString(36).slice(2, 10), titulo: titulo.trim() || 'Mi video', fecha: Date.now(), blob }
    const hecho: Hecho = { ...dato, url: URL.createObjectURL(blob) }
    setHechos((todos) => [hecho, ...todos])
    setUltimo(hecho.url)
    setGrabando(false)
    setPct(100)
    if (!blob.size) return setFallo('La grabación salió vacía. Vuelve a intentarlo.')
    guardarEnDisco(dato).catch(() => setFallo('El video se hizo, pero este navegador no lo guardó: bájalo ahora.'))
  }

  return (
    <div className="crear">
      <header className="crear-head">
        <h1>Crear video</h1>
        <p className="muted">
          Escribe tu idea y sale un video vertical con tus frases. Se arma aquí mismo, en tu teléfono: no gasta créditos ni necesita conectar una IA.
        </p>
      </header>

      <label className="crear-campo">
        <span>Título</span>
        <input value={titulo} maxLength={60} placeholder="Cómo ahorrar en el súper" onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="crear-campo">
        <span>Tu idea o guion</span>
        <textarea
          value={idea}
          rows={5}
          placeholder="Cada frase es una escena. Por ejemplo: El 70% de lo que compras no lo necesitas. Antes de pagar, espera un día. Lo que sigas queriendo, cómpralo."
          onChange={(e) => setIdea(e.target.value)}
        />
      </label>

      <div className="crear-acciones">
        <button className="crear-boton" onClick={crear} disabled={grabando}>
          {grabando ? `Grabando… ${pct}%` : 'Crear video'}
        </button>
        {grabando && <span className="crear-pista">Se graba en tiempo real: no cierres esta pantalla.</span>}
      </div>
      {fallo && <p className="bad small">{fallo}</p>}

      {/* Se ve mientras se graba, y así el navegador tiene de dónde copiar los cuadros. */}
      <canvas ref={lienzo} className="crear-lienzo" width={ANCHO} height={ALTO} />

      {ultimo && (
        <section className="crear-resultado">
          <h2>Tu video</h2>
          <video src={ultimo} controls autoPlay loop playsInline />
          <a className="crear-bajar" href={ultimo} download={`${(titulo.trim() || 'mi-video').replace(/[^\w\- ]+/g, '')}.webm`}>
            Descargar el video
          </a>
        </section>
      )}

      {hechos.length > 0 && (
        <section className="crear-hechos">
          <h2>Los que hiciste aquí</h2>
          <div className="crear-rejilla">
            {hechos.map((h) => (
              <div key={h.id} className="crear-ficha">
                <video src={h.url} controls preload="metadata" playsInline />
                <div className="crear-ficha-pie">
                  <span title={h.titulo}>{h.titulo}</span>
                  <button
                    className="crear-borrar"
                    title="Borrar"
                    onClick={async () => {
                      await borrarDelDisco(h.id).catch(() => {})
                      URL.revokeObjectURL(h.url)
                      setHechos((todos) => todos.filter((x) => x.id !== h.id))
                      if (ultimo === h.url) setUltimo(null)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="crear-nota muted">
        Para videos con voz, imágenes y edición automática, conecta una IA en <b>Opciones → Agentes</b>; esto de aquí es el video rápido, hecho con tu guion.
      </p>
    </div>
  )
}
