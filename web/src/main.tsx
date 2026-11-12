import { createRoot } from 'react-dom/client'
import { VENTA } from '../../shared/venta'
import { App } from './App'
import { Recordatorio } from './Licencia'
import { BotonMenu } from './Movil'
import './styles.css'
import './movil.css'

// La app que se vende recuerda, cada tantos inicios, que se puede apoyar a Sloth.
// El botón del cajón va antes: en el teléfono es la única forma de llegar a los hilos (en la computadora no se ve).
createRoot(document.getElementById('root')!).render(
  <>
    <BotonMenu />
    <App />
    {VENTA && <Recordatorio />}
  </>
)
