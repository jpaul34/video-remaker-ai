# Video Remaker AI 🎬✨

Aplicación de escritorio para crear videos virales con IA, usando Gemini AI para generar guiones optimizados.

## 🚀 Características

- **Generación de Guiones con IA**: Gemini AI crea guiones optimizados para TikTok/Reels
- **Configuración Automática**: Color de subtítulos, tamaño de fuente y voz se ajustan automáticamente
- **Interfaz Moderna**: Diseño glassmorphism con gradientes y animaciones suaves
- **Historial de Videos**: Rastrea todos los videos creados con opciones de descarga y ubicación
- **Terminal en Tiempo Real**: Feedback visual de todos los procesos

## 📋 Requisitos Previos

- Node.js 18+ instalado
- API Key de Gemini AI (gratuita)

## 🔧 Instalación

1. **Clona o descarga el proyecto**

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura tu API Key de Gemini**:
   - Obtén tu clave gratis en: https://makersuite.google.com/app/apikey
   - Copia el archivo `.env.example` a `.env`
   - Agrega tu API key en el archivo `.env`:
     ```
     VITE_GEMINI_API_KEY=tu_clave_aqui
     ```

4. **Inicia la aplicación**:
   ```bash
   npm run dev
   ```

5. **Abre tu navegador**:
   - Ve a: http://localhost:5175/

## 🎯 Cómo Usar

### 1. Generar un Guion

1. Ingresa una idea o texto en el campo "Link de TikTok o Texto Base"
   - Ejemplo: "Cómo hacer pasta carbonara perfecta"
   
2. Click en "✨ Analizar con Gemini AI"

3. Espera a que Gemini genere:
   - Guion optimizado para video corto
   - Configuración de subtítulos (color y tamaño)
   - Voz recomendada
   - Prompts para generar imágenes

### 2. Personalizar

- **Edita el guion** en el textarea si lo deseas
- **Cambia la voz** en el selector
- **Ajusta el color** de los subtítulos con el color picker
- **Modifica el tamaño** de la fuente

### 3. Crear Video

1. Click en "🚀 CREAR VIDEO FINAL"
2. El video se guardará en `C:\videos-ia\`
3. Aparecerá en el historial con opciones de descarga

## 📁 Estructura del Proyecto

```
video-remaker-ai/
├── src/
│   ├── main/              # Proceso principal de Electron
│   │   ├── index.ts       # Entry point
│   │   └── services/      # Servicios backend
│   │       ├── gemini.ts  # Integración Gemini AI
│   │       └── videoService.ts  # Procesamiento de video
│   ├── preload/           # Script de preload
│   │   └── index.ts
│   └── renderer/          # Frontend React
│       ├── index.html
│       └── src/
│           ├── App.tsx    # Componente principal
│           └── index.css  # Estilos Tailwind
├── .env                   # Variables de entorno (API keys)
├── package.json
├── vite.config.js
└── TESTING.md            # Guía de pruebas
```

## 🧪 Pruebas

Consulta el archivo [TESTING.md](./TESTING.md) para una guía completa de pruebas.

### Prueba Rápida

```bash
# 1. Asegúrate de tener tu API key configurada
# 2. Inicia la app
npm run dev

# 3. En el navegador:
# - Ingresa: "Receta de brownies sin horno"
# - Click en "Analizar con Gemini AI"
# - Verifica que el guion se genere automáticamente
```

## 🎨 Tecnologías Utilizadas

- **Frontend**: React + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **Desktop**: Electron (preparado para integración)
- **IA**: Google Gemini Pro API
- **Video Processing**: FFmpeg (backend)

## 🔑 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# API Key de Gemini AI
VITE_GEMINI_API_KEY=tu_clave_aqui
```

## 🐛 Solución de Problemas

### "VITE_GEMINI_API_KEY no configurada"
- Verifica que el archivo `.env` esté en la raíz del proyecto
- Asegúrate de que la variable se llame exactamente `VITE_GEMINI_API_KEY`
- Reinicia el servidor después de editar el `.env`

### "API Error: 400"
- Tu API key es inválida
- Verifica que no haya espacios antes/después de la clave

### El servidor no inicia
```bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 📝 Notas

- La API de Gemini es **gratuita** con límites generosos
- Los videos se guardan en `C:\videos-ia\`
- El guion generado es único en cada análisis
- Puedes editar manualmente cualquier configuración después de generarla

## 🤝 Contribuir

Este es un proyecto en desarrollo. Sugerencias y mejoras son bienvenidas.

## 📄 Licencia

MIT

---

**Hecho con ❤️ y IA**
