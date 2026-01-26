
import { GoogleGenAI, Type } from "@google/genai";

export interface LinkMetadata {
  description: string;
  category: string;
  icon: string;
}

export const suggestMetadata = async (url: string): Promise<LinkMetadata | null> => {
  try {
    // Obtaining the key directly from the environment variable as per guidelines
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.warn("API_KEY is not defined in the environment.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise a URL ${url} e sugira metadados profissionais para um hub corporativo. Retorne descrição, categoria e um nome de ícone da biblioteca Lucide (ex: Box, Globe, Shield, Terminal).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'Uma descrição curta e profissional (max 80 caracteres).' },
            category: { type: Type.STRING, description: 'Uma categoria lógica (ex: Ferramentas, RH, TI).' },
            icon: { type: Type.STRING, description: 'Nome do ícone Lucide adequado.' },
          },
          required: ['description', 'category', 'icon']
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as LinkMetadata;
    }
    return null;
  } catch (error) {
    console.error("Gemini suggestion failed:", error);
    return null;
  }
};
