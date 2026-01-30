# Solución Simple: Ejecutar la App de Escritorio

El problema actual es que la configuración de Electron con Vite es compleja. Aquí está la solución más simple:

## Opción 1: Usar el navegador (RECOMENDADO para ahora)

La aplicación funciona perfectamente en el navegador con todas las funcionalidades de generación de guiones:

1. **Detén todos los procesos** (Ctrl+C en todas las terminales)

2. **Ejecuta**:
   ```bash
   npm run dev
   ```

3. **Abre**: http://localhost:5173/ (o el puerto que muestre)

4. **Configura tu API key** en `.env`:
   ```env
   VITE_GEMINI_API_KEY=tu_clave_aqui
   ```

5. **¡Listo!** Puedes generar guiones con Gemini AI

**Limitación**: No genera video completo (solo guion), pero la interfaz funciona perfectamente.

## Opción 2: Configuración Manual de Electron (Avanzado)

Si realmente necesitas la app de escritorio con generación completa de video:

### Paso 1: Instalar electron-builder
```bash
npm install --save-dev electron-builder
```

### Paso 2: Crear script de inicio simple

Crea `electron-start.js` en la raíz:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Paso 3: Actualizar package.json
```json
{
  "scripts": {
    "dev": "vite",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron electron-start.js\""
  }
}
```

### Paso 4: Instalar wait-on
```bash
npm install --save-dev wait-on
```

### Paso 5: Ejecutar
```bash
npm run electron:dev
```

## Opción 3: Usar Electron Forge (Más robusto)

```bash
# Crear nuevo proyecto con Electron Forge
npx create-electron-app video-remaker-electron --template=webpack-typescript

# Copiar tus archivos src/ al nuevo proyecto
# Configurar según la documentación de Electron Forge
```

## Recomendación

**Para desarrollo rápido**: Usa Opción 1 (navegador)
- ✅ Funciona inmediatamente
- ✅ Hot reload
- ✅ Genera guiones con Gemini
- ❌ No genera video completo

**Para producción**: Usa Opción 2 o 3
- ✅ App de escritorio completa
- ✅ Generación de video con FFmpeg
- ❌ Requiere más configuración

¿Qué opción prefieres?
