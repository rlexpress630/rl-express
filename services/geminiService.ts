
import { GoogleGenAI, Type } from "@google/genai";

// Always use process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractAddressesFromImages = async (base64Images: string[]): Promise<string[]> => {
  if (base64Images.length === 0) return [];

  const parts = base64Images.map(img => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: img.includes('base64,') ? img.split(',')[1] : img
    }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        ...parts,
        { text: "Extraia todos os endereços de entrega destas imagens (faturas, etiquetas, invoices). Procure por formatos típicos brasileiros (Rua, Av, CEP, Bairro, Cidade). Retorne APENAS um array JSON de strings, onde cada string é um endereço completo formatado. Se não encontrar endereços, retorne []. Não inclua markdown." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    const text = response.text?.trim() || '[]';
    // Limpar possíveis blocos de código se o modelo ignorar a instrução
    const sanitized = text.startsWith('```') ? text.replace(/```json|```/g, '').trim() : text;
    return JSON.parse(sanitized);
  } catch (e) {
    console.error("Erro no processamento OCR", e);
    return [];
  }
};

export const optimizeRoute = async (addresses: string[]): Promise<string[]> => {
  if (addresses.length <= 1) return addresses;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise estes endereços e retorne-os na sequência de entrega mais lógica para um motoboy, visando minimizar a distância e o tempo total de viagem. Comece de um ponto central e proceda de forma eficiente. Retorne APENAS um array JSON de strings com os endereços originais. \nEndereços: ${JSON.stringify(addresses)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    const text = response.text?.trim() || '[]';
    const sanitized = text.startsWith('```') ? text.replace(/```json|```/g, '').trim() : text;
    return JSON.parse(sanitized);
  } catch (e) {
    console.error("Erro na otimização de rota", e);
    return addresses;
  }
};
