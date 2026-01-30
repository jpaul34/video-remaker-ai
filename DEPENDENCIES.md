# Instalación de Dependencias

## Dependencias principales ya instaladas
- ✅ @google/generative-ai
- ✅ fluent-ffmpeg
- ✅ electron
- ✅ react
- ✅ tailwindcss

## Dependencias adicionales necesarias

### 1. Edge-TTS (Síntesis de voz)
```bash
pip install edge-tts
```

### 2. FFmpeg (binario estático)
Descarga FFmpeg desde: https://ffmpeg.org/download.html
- Coloca `ffmpeg.exe` en la carpeta `resources/`

### 3. yt-dlp (opcional, para descargar audio de TikTok)
Descarga desde: https://github.com/yt-dlp/yt-dlp/releases
- Coloca `yt-dlp.exe` en la carpeta `resources/`

## Configuración de FFmpeg en fluent-ffmpeg

Si FFmpeg no está en el PATH del sistema, configúralo en el código:

```typescript
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

// Configurar ruta de FFmpeg
ffmpeg.setFfmpegPath(path.join(process.cwd(), 'resources', 'ffmpeg.exe'));
```

## Verificar instalación

```bash
# Verificar edge-tts
edge-tts --list-voices

# Verificar ffmpeg
ffmpeg -version

# Verificar yt-dlp
yt-dlp --version
```

## Notas importantes

1. **Edge-TTS**: Requiere Python instalado en el sistema
2. **FFmpeg**: Debe estar en PATH o configurado manualmente
3. **Generación de imágenes**: Actualmente usa placeholders. Para generación real de imágenes, necesitarías:
   - API de DALL-E, Midjourney, o Stable Diffusion
   - O usar Gemini Imagen (cuando esté disponible)

## Estructura de carpetas requerida

```
video-remaker-ai/
├── resources/
│   ├── ffmpeg.exe
│   └── yt-dlp.exe (opcional)
├── temp/ (se crea automáticamente)
└── output/ (se crea automáticamente)
```
