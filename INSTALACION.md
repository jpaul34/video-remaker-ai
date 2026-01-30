# Guía de Instalación - Aplicación de Escritorio

## 1. Dependencias de Node.js (Ya instaladas)

✅ Las siguientes dependencias ya están instaladas:
- electron
- vite-plugin-electron
- vite-plugin-electron-renderer
- electron-vite
- concurrently

## 2. Dependencias del Sistema

### A. Python y edge-tts (Para síntesis de voz)

1. **Instalar Python** (si no lo tienes):
   - Descarga desde: https://www.python.org/downloads/
   - Durante la instalación, marca "Add Python to PATH"

2. **Instalar edge-tts**:
   ```bash
   pip install edge-tts
   ```

3. **Verificar instalación**:
   ```bash
   edge-tts --list-voices
   ```

### B. FFmpeg (Para procesamiento de video)

1. **Descargar FFmpeg**:
   - Ve a: https://github.com/BtbN/FFmpeg-Builds/releases
   - Descarga: `ffmpeg-master-latest-win64-gpl.zip`

2. **Extraer y configurar**:
   - Extrae el archivo ZIP
   - Copia `ffmpeg.exe` de la carpeta `bin/`
   - Pégalo en: `c:\jx\onixdev\antigravity-projects\video-generation\video-remaker-ai\resources\`

3. **Crear carpeta resources** (si no existe):
   ```bash
   mkdir resources
   ```

### C. yt-dlp (Opcional - Para descargar audio de TikTok)

1. **Descargar**:
   - Ve a: https://github.com/yt-dlp/yt-dlp/releases
   - Descarga: `yt-dlp.exe`

2. **Colocar en resources**:
   - Mueve `yt-dlp.exe` a la carpeta `resources/`

## 3. Configuración de Variables de Entorno

Crea o edita el archivo `.env` en la raíz del proyecto:

```env
# API Key de Gemini (para generación de guiones e imágenes)
GEMINI_API_KEY=tu_clave_aqui
VITE_GEMINI_API_KEY=tu_clave_aqui

# Modo de desarrollo
NODE_ENV=development
```

**Obtener API Key de Gemini**:
1. Ve a: https://makersuite.google.com/app/apikey
2. Click en "Create API Key"
3. Copia la clave y pégala en el archivo `.env`

## 4. Estructura de Carpetas Requerida

```
video-remaker-ai/
├── resources/
│   ├── ffmpeg.exe          ← Requerido
│   └── yt-dlp.exe          ← Opcional
├── temp/                   ← Se crea automáticamente
├── .env                    ← Crear manualmente
└── ...
```

## 5. Ejecutar la Aplicación

### Modo Desarrollo (Recomendado):
```bash
npm run dev:electron
```

Esto iniciará:
- El servidor de desarrollo de Vite
- La ventana de Electron
- Hot reload automático

### Modo Producción:
```bash
npm run build:electron
npm run electron
```

## 6. Verificar que Todo Funciona

### Checklist:

- [ ] Python instalado: `python --version`
- [ ] edge-tts instalado: `edge-tts --version`
- [ ] FFmpeg en resources: Verificar que existe `resources/ffmpeg.exe`
- [ ] API Key configurada: Verificar archivo `.env`
- [ ] Aplicación inicia: `npm run dev:electron`

## 7. Solución de Problemas

### Error: "edge-tts no encontrado"
```bash
# Reinstalar edge-tts
pip uninstall edge-tts
pip install edge-tts
```

### Error: "FFmpeg no encontrado"
- Verifica que `ffmpeg.exe` esté en la carpeta `resources/`
- Verifica que la ruta sea correcta en el código

### Error: "Gemini API Key inválida"
- Verifica que la clave esté correctamente copiada en `.env`
- Asegúrate de que no haya espacios antes o después
- Reinicia la aplicación después de editar `.env`

### La ventana de Electron no abre
```bash
# Limpiar y reinstalar
rm -rf node_modules dist
npm install
npm run dev:electron
```

## 8. Comandos Útiles

```bash
# Desarrollo
npm run dev:electron          # Ejecutar en modo desarrollo

# Producción
npm run build:electron        # Compilar para producción
npm run electron              # Ejecutar versión compilada

# Solo navegador (sin Electron)
npm run dev                   # Desarrollo web (solo interfaz)
```

## 9. Próximos Pasos

Una vez que todo esté configurado:

1. Ejecuta: `npm run dev:electron`
2. La ventana de Electron se abrirá automáticamente
3. Configura los parámetros del video
4. Click en "Generar Video"
5. El video se guardará en tu carpeta de Videos

## 10. Notas Importantes

- **Primera ejecución**: Puede tardar más mientras se compilan los módulos
- **Hot reload**: Los cambios en el código se reflejan automáticamente
- **Logs**: Abre DevTools en Electron (Ctrl+Shift+I) para ver logs
- **Videos generados**: Se guardan en `C:\Users\[usuario]\Videos\video-remaker-ai\`
