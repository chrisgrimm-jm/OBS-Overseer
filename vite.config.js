import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'

// Strips type="module" from inline scripts so OBS CEF loads them via file://
function removeModuleType() {
  return {
    name: 'remove-module-type',
    closeBundle() {
      const outFile = path.resolve('dist/index.html')
      if (!fs.existsSync(outFile)) return
      const html = fs.readFileSync(outFile, 'utf8')
      const fixed = html
        .replace(/<script type="module" crossorigin>/g, '<script defer>')
        .replace(/<script type="module" crossorigin /g, '<script defer ')
        .replace(/<script type="module"/g, '<script defer')
        .replace(/<script crossorigin>/g, '<script defer>')
        .replace(/<script crossorigin /g, '<script defer ')
      fs.writeFileSync(outFile, fixed)
    }
  }
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), removeModuleType()],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'OBSOverseer',
      }
    }
  }
})
