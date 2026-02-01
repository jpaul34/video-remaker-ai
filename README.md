# Video Remaker AI 🎬✨

Aplicación de escritorio para crear videos con IA, mediante la orquestación de modelos de lenguaje (LLMs) como Gemini AI, para generar guiones optimizados.

<p align="left">
  <img src="https://img.shields.io/badge/Architecture-Hybrid_Node_Python-black?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Frontend-React_TypeScript-black?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/AI-Gemini_Pro-black?style=for-the-badge&logo=google-gemini" />
</p>

## ⚡ Visión Técnica

Este proyecto es una **Proof of Concept (PoC)** avanzada que explora la automatización total de la cadena de producción de video. Implementa un flujo de trabajo optimizado para reducir la latencia de generación y maximizar la retención mediante ingeniería de prompts (Prompt Engineering).

### Características Core

- **LLM Orchestration**: Integración con Gemini AI para creación de guiones optimizados para algoritmos de TikTok/Reels.
- **Hybrid Rendering Engine**: Uso de FFmpeg para ensamblaje y Edge-TTS (Python) para síntesis de voz neural de alta fidelidad.
- **IPC Architecture**: Comunicación robusta entre procesos (Inter-Process Communication) para monitoreo en tiempo real.
- **UI Premium**: Interfaz construida con React y Tailwind CSS bajo estándares de diseño moderno.
- **Configuración Automática**: Color de subtítulos, tamaño de fuente y voz se ajustan automáticamente
- **Historial de Videos**: Rastrea todos los videos creados con opciones de descarga y ubicación
- **Terminal en Tiempo Real**: Feedback visual de todos los procesos

## 🏗️ Arquitectura del Sistema

El proyecto implementa una separación de responsabilidades clara entre el frontend y el proceso de sistema:

```text
video-remaker-ai/
├── src/
│   ├── main/                      # Proceso principal de Electron (Electron / Node.js)
│   │   ├── index.ts               # Entry point
│   │   └── services/              # Servicios backend
│   │       ├── gemini.ts          # Integración Gemini AI
│   │       └── videoService.ts    # Procesamiento de video
│   ├── utils/                     # Utilidades del sistema (IPC, Sistema de Archivos, etc.)
│   ├── preload/                   # Script de preload
│   └── renderer/          # Frontend React
│       ├── index.html
│       └── src/
│           ├── App.tsx    # Componente principal
│           └── index.css  # Estilos Tailwind
├── .env                   # Variables de entorno (API keys)
├── package.json
├── vite.config.js
```

## 🛠️ Stack Tecnológico

| Capa         | Tecnologías                     |
| :----------- | :------------------------------ |
| **Frontend** | React, TypeScript, Tailwind CSS |
| **Runtime**  | Electron, Node.js               |
| **Scripts**  | Python 3.10+ (Edge-TTS)         |
| **Media**    | FFmpeg                          |
| **AI**       | Google Gemini Pro API           |

## 📋 Requisitos Previos

- Node.js 18+ instalado
- API Key de Gemini AI (gratuita)

## 🚀 Configuración y Despliegue

### Requisitos

- Node.js 18+
- Python 3.10+
- FFmpeg configurado en el PATH global

### Instalación

1. **Clonación y Dependencias**:
   - Clona o descarga el proyecto

   - Dentro del proyecto ejecuta los siguientes comandos:

   ```bash
   npm install
   pip install edge-tts
   ```

2. **Variables de Entorno**:
   Agrega tu API key en el archivo `.env`:

   ```env
   VITE_GEMINI_API_KEY=tu_clave_aqui
   ```

   - Obtén tu clave gratis en: https://makersuite.google.com/app/apikey
   - Agrega tu API key en el archivo `.env`:

3. **Ejecución**:

   ```bash
   npm run dev
   ```

4. **Abre tu navegador**:
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

## 🎨 Tecnologías Utilizadas

- **Frontend**: React + TypeScript + Tailwind CSS
- **Build Tool**: Vite
- **Desktop**: Electron (preparado para integración)
- **IA**: Google Gemini Pro API
- **Video Processing**: FFmpeg (backend)

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

---

**Hecho con ❤️ y IA**
