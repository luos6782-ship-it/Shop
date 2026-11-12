// Arma la interfaz para el servidor de la nube: `dist/web`, que `server/index.ts` sirve tal cual (sin Vite) cuando existe.
// Es lo que se despliega para entrar a Sloth desde el teléfono. La app de escritorio no lo usa: `npm start` sirve `web/`
// con Vite en el repo y la compilada trae la suya.
import react from '@vitejs/plugin-react'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
// Compilada desde un hilo de Sloth, heredaría el `development` de su Vite, y React saldría en modo desarrollo.
process.env.NODE_ENV = 'production'

await build({
  root: join(REPO, 'web'),
  configFile: false,
  mode: 'production',
  logLevel: 'warn',
  plugins: [react()],
  build: { outDir: join(REPO, 'dist', 'web'), emptyOutDir: true, chunkSizeWarningLimit: 4000 }
})
console.log('Interfaz armada en dist/web')
