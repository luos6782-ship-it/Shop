import { useEffect, useState } from 'react'

/**
 * En el teléfono la barra lateral es un cajón: este botón la abre y la cierra. En la computadora no se ve
 * (`movil.css`), donde la barra está siempre a la vista. Se cierra sola al elegir un hilo o al tocar fuera.
 */
export function BotonMenu() {
  const [abierto, setAbierto] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('menu-abierto', abierto)
    if (!abierto) return
    // Un toque fuera de la barra (el fondo oscuro o la conversación) la cierra.
    const fuera = (evento: Event) => {
      const destino = evento.target
      if (!(destino instanceof Element) || !destino.closest('.sidebar')) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])
  // Al cambiar de vista (elegir un hilo, abrir Opciones) el cajón se cierra: la conversación queda a la vista.
  useEffect(() => {
    const cerrar = () => setAbierto(false)
    window.addEventListener('hashchange', cerrar)
    return () => window.removeEventListener('hashchange', cerrar)
  }, [])
  return (
    <>
      <button className="boton-menu" onClick={() => setAbierto((v) => !v)} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={abierto}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {abierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div className="menu-fondo" hidden={!abierto} />
    </>
  )
}
