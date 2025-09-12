import { GoogleGenAI, Modality } from "@google/genai";
import { PromptPart } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateImage(
  prompt: string,
  config: { aspectRatio: string; numberOfImages: number }
): Promise<string[]> {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: config.numberOfImages,
          outputMimeType: 'image/jpeg',
          aspectRatio: config.aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages.map(img => img.image.imageBytes);
    }
    
    throw new Error("Image generation failed, no images returned.");
}

export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<{ text?: string; image?: string }> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });
  
  const result: { text?: string; image?: string } = {};

  if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          result.text = part.text;
        } else if (part.inlineData) {
          result.image = part.inlineData.data;
        }
      }
  }

  if(!result.image) {
      console.warn("Model response did not contain an image part.", response);
  }

  return result;
}

export async function rewritePrompt(prompt: string, part: PromptPart): Promise<string> {
    if (!prompt.trim()) {
      return prompt;
    }

    const instructionMap: Record<PromptPart, string> = {
      subject: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a subject to be more vivid, descriptive, and detailed. Focus on enhancing the subject's appearance, characteristics, actions, and emotions, while keeping the core concept intact. Only return the rewritten prompt, with no preamble or explanation.",
      background: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a background to create a rich and immersive environment. Focus on describing the setting, atmosphere, lighting, and surrounding elements in greater detail. Keep the core idea of the background intact. Only return the rewritten prompt, with no preamble or explanation.",
      foreground: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a foreground to add detail and depth to the scene. Focus on enhancing the objects, characters, or elements closest to the viewer. Keep the core idea of the foreground intact. Only return the rewritten prompt, with no preamble or explanation.",
    };

    const systemInstruction = instructionMap[part];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite this prompt for an image's ${part}: "${prompt}"`,
      config: {
        systemInstruction,
      },
    });

    return response.text.trim().replace(/^"|"$/g, ''); // Trim quotes if model adds them
  }
