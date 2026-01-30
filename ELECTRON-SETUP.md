# Cómo ejecutar la aplicación en modo Electron

## Problema actual
La aplicación se está ejecutando en el navegador (`npm run dev`) en lugar de Electron, por lo que la API de Electron no está disponible.

## Solución temporal: Usar API Web en lugar de Electron

Dado que el proyecto está configurado para ejecutarse en el navegador, he actualizado el código para que funcione sin Electron usando la API de Gemini directamente desde el navegador.

### Para ejecutar:

```bash
npm run dev
```

Luego abre http://localhost:5173/

### Configuración necesaria:

1. **Crea archivo `.env` en la raíz del proyecto:**
   ```env
   VITE_GEMINI_API_KEY=tu_clave_aqui
   ```

2. **Obtén tu API key de Gemini:**
   - Ve a: https://makersuite.google.com/app/apikey
   - Crea una API key
   - Cópiala al archivo `.env`

3. **Reinicia el servidor:**
   ```bash
   # Presiona Ctrl+C
   npm run dev
   ```

## Solución completa: Configurar Electron (Opcional)

Si quieres ejecutar como aplicación de escritorio con todas las funcionalidades (FFmpeg, edge-tts, etc.):

### 1. Instalar dependencias adicionales:
```bash
npm install --save-dev electron-vite concurrently
```

### 2. Actualizar scripts en `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron ."
  }
}
```

### 3. Ejecutar en modo Electron:
```bash
npm run dev:electron
```

## Modo actual: Navegador (Recomendado para desarrollo rápido)

La aplicación funciona perfectamente en el navegador con las siguientes limitaciones:

✅ **Funciona:**
- Generación de guiones con Gemini AI
- Configuración de todos los parámetros
- Interfaz completa

❌ **No funciona (requiere Electron):**
- Generación real de video con FFmpeg
- Síntesis de voz con edge-tts
- Descarga de audio de TikTok

Para desarrollo y pruebas de la interfaz, el modo navegador es suficiente.
