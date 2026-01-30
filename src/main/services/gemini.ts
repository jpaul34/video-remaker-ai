import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Initialize the new client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface VideoGenerationResult {
  guion_mejorado: string;
  prompts_imagen: string[];
  imagenes_generadas: string[];
  duracion_estimada: string;
  escenas: { texto: string; descripcion_visual: string }[];
}

// Helper for exponential backoff
const generateContentWithRetry = async (
  model: string,
  contents: string,
  config: any,
  onRetry?: (attempt: number, delay: number) => void,
) => {
  let attempt = 0;
  const maxRetries = 5;
  let delay = 2000; // Start with 2 seconds

  while (attempt < maxRetries) {
    try {
      return await genAI.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (error: any) {
      // Check for quota errors (429 or RESOURCE_EXHAUSTED)
      const isQuotaError =
        error.message?.includes("429") ||
        error.message?.includes("RESOURCE_EXHAUSTED") ||
        error.status === 429 ||
        error.code === 429;

      if (isQuotaError) {
        attempt++;
        if (attempt >= maxRetries) throw error;

        if (onRetry) onRetry(attempt, delay);
        console.log(
          `Gemini API quota exceeded. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries exceeded");
};

export const generateVideoContent = async (
  theme: string,
  duration: number,
  outputDir: string,
  onProgress?: (message: string) => void,
  useMock: boolean = false,
): Promise<VideoGenerationResult> => {
  if (useMock) {
    if (onProgress) onProgress("Modo Prueba: Cargando datos simulados...");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay

    const mockPath = path.join(__dirname, "mock_response.json");
    let mockData;

    if (fs.existsSync(mockPath)) {
      mockData = JSON.parse(fs.readFileSync(mockPath, "utf-8"));
    } else {
      // Fallback if file doesn't exist (e.g. in production build structure)
      mockData = {
        guion_mejorado:
          "Escuché un rasguño bajo mi cama. Bajé la mano para calmar a mi perro. Unas manos frías la sujetaron. Mi perro estaba rascando la puerta del pasillo.",
        escenas: [
          {
            texto: "Escuché un rasguño bajo mi cama.",
            descripcion_visual:
              "Cinematic horror scene, dark bedroom at night, a pale demonic hand reaching from under the bed",
          },
          {
            texto: "Bajé la mano para calmar a mi perro.",
            descripcion_visual:
              "A person lowering their hand towards the floor in a dark room",
          },
          {
            texto: "Unas manos frías la sujetaron.",
            descripcion_visual:
              "Pale cold hands grabbing a human hand under a bed",
          },
          {
            texto: "Mi perro estaba rascando la puerta del pasillo.",
            descripcion_visual:
              "A dog scratching a door in a dimly lit hallway",
          },
        ],
      };
    }

    // Generate dummy image prompts
    const imagePrompts: string[] = mockData.escenas.map(
      (escena: any) => `MOCK PROMPT: ${escena.descripcion_visual}`,
    );

    // Generate dummy image files
    const generatedImages: string[] = [];
    for (let i = 0; i < imagePrompts.length; i++) {
      const imagePath = path.join(outputDir, `imagen-escena-${i + 1}.txt`);
      fs.writeFileSync(imagePath, imagePrompts[i]);
      generatedImages.push(imagePath);
    }

    return {
      guion_mejorado: mockData.guion_mejorado,
      prompts_imagen: imagePrompts,
      imagenes_generadas: generatedImages,
      duracion_estimada: `${duration} segundos`,
      escenas: mockData.escenas || [],
    };
  }

  // Step 1: Generate script based on theme and duration
  const scriptPrompt = `
    Crea un guion viral de exactamente ${duration} segundos sobre: "${theme}".
    
    El guion debe ser:
    - Enganchador desde el primer segundo
    - Perfecto para video corto estilo TikTok/Reels
    - Con estructura clara: Gancho → Desarrollo → Cierre con CTA
    - Dividido en ${Math.ceil(duration / 5)} escenas (aproximadamente 5 segundos por escena)
    
    Responde en formato JSON:
    {
      "guion_mejorado": "texto completo del guion",
      "escenas": [
        {
          "texto": "texto de la escena",
          "descripcion_visual": "descripción detallada para generar imagen"
        }
      ]
    }
  `;

  try {
    const response = await generateContentWithRetry(
      "gemini-3-flash-preview",
      scriptPrompt,
      { responseMimeType: "application/json" },
      (attempt, delay) => {
        if (onProgress) {
          onProgress(
            `Esperando cuota API... (${attempt}/5) - ${delay / 1000}s`,
          );
        }
      },
    );

    const scriptText = response.text || "{}";
    // Clean potential markdown code blocks
    const cleanJson = scriptText.replace(/```json\n?|\n?```/g, "").trim();
    const scriptData = JSON.parse(cleanJson);

    // Artificial delay to respect rate limits
    if (onProgress) onProgress("Pausando para respetar límites de API...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Generate image prompts for each scene
    const imagePrompts: string[] = scriptData.escenas.map(
      (escena: any) =>
        `Imagen fotorrealista de alta calidad: ${escena.descripcion_visual}. Estilo cinematográfico, iluminación profesional, 4K.`,
    );

    // Step 3: Generate images (simulated for now, as per original code)
    const generatedImages: string[] = [];

    for (let i = 0; i < imagePrompts.length; i++) {
      const imagePath = path.join(outputDir, `imagen-escena-${i + 1}.txt`);
      fs.writeFileSync(imagePath, imagePrompts[i]);
      generatedImages.push(imagePath);
    }

    return {
      guion_mejorado: scriptData.guion_mejorado,
      prompts_imagen: imagePrompts,
      imagenes_generadas: generatedImages,
      duracion_estimada: `${duration} segundos`,
      escenas: scriptData.escenas || [],
    };
  } catch (error) {
    console.error("Error generating video content:", error);
    throw error;
  }
};

export const analyzeTrend = async (
  text: string,
  onProgress?: (message: string) => void,
) => {
  const prompt = `
    Analiza el siguiente tema y genera:
    1. Un guion mejorado y más enganchador
    2. 3 prompts para generación de imágenes que describan visualmente el contenido
    
    Responde ÚNICAMENTE en formato JSON:
    {
      "guion_mejorado": "texto del guion",
      "prompts_imagen": ["prompt 1", "prompt 2", "prompt 3"]
    }

    Tema: ${text}
  `;

  try {
    const response = await generateContentWithRetry(
      "gemini-3-flash-preview",
      prompt,
      { responseMimeType: "application/json" },
      (attempt, delay) => {
        if (onProgress) {
          onProgress(
            `Esperando cuota API... (${attempt}/5) - ${delay / 1000}s`,
          );
        }
      },
    );

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Error parsing Gemini response:", e);
    return { guion_mejorado: text, prompts_imagen: [] };
  }
};
