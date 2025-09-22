import { GoogleGenAI, Modality, Type } from "@google/genai";
import { PromptPart, PexelsPhoto } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A wrapper for all API calls to handle errors gracefully.
 * It catches specific GoogleGenAI errors and re-throws them with user-friendly messages.
 */
async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (e: unknown) {
    console.error("Gemini API Error:", e);
    if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
      // Check for specific error statuses from the API response message
      if (e.message.includes('429') || e.message.toUpperCase().includes('RESOURCE_EXHAUSTED')) {
        throw new Error("You've exceeded your current API quota. Please check your plan and billing details, or try again in a few minutes.");
      }
      if (e.message.includes('500') || e.message.toUpperCase().includes('INTERNAL')) {
        throw new Error("The AI service is currently experiencing issues. Please try again later.");
      }
    }
    // For other errors, throw a more generic message but still indicate it's an API issue.
    throw new Error("An unexpected error occurred while communicating with the AI service.");
  }
}


export async function generateImage(
  prompt: string,
  config: { aspectRatio: string; numberOfImages: number }
): Promise<string[]> {
  return handleApiCall(async () => {
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
  });
}

export async function editImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  base64MaskData?: string
): Promise<{ text?: string; image?: string }> {
  return handleApiCall(async () => {
    const parts: any[] = [];

    if (base64MaskData) {
      // For masked edits, the model expects the mask first to provide context.
      parts.push({
        inlineData: {
          data: base64MaskData,
          mimeType: 'image/png',
        },
      });
      parts.push({
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      });
    } else {
      // For non-masked edits, just send the image.
      parts.push({
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      });
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    const result: { text?: string; image?: string } = {};
    const candidate = response.candidates?.[0];

    // Safely access parts and ensure it's an array to prevent crashes.
    if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            result.text = part.text;
          } else if (part.inlineData) {
            result.image = part.inlineData.data;
          }
        }
    }

    // If no image was found, provide a more detailed error message if possible.
    if (!result.image && candidate) {
      if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'FINISH_REASON_UNSPECIFIED') {
        const reason = candidate.finishReason.charAt(0).toUpperCase() + candidate.finishReason.slice(1).toLowerCase().replace(/_/g, ' ');
        result.text = `Image generation failed. Reason: ${reason}. Please adjust your prompt or mask.`;
      }
    } else if (!result.image && !candidate) {
        result.text = "The model did not return a response. This may be due to a network issue or a problem with the input.";
    }

    if(!result.image) {
        console.warn("Model response did not contain an image part.", { response, result });
    }

    return result;
  });
}

export async function describeImage(
  base64ImageData: string,
  mimeType: string
): Promise<string> {
  return handleApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: 'Describe this image in detail. The description should be suitable to be used as a prompt for an AI image generation model. Focus on the subject, background, style, and composition. Do not include any preamble or explanation, only the prompt description.',
          },
        ],
      },
    });

    return response.text.trim();
  });
}

export async function rewritePrompt(prompt: string, part: PromptPart): Promise<string> {
    if (!prompt.trim()) {
      return prompt;
    }

    return handleApiCall(async () => {
        const instructionMap: Record<PromptPart, string> = {
          subject: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a subject to be more vivid, descriptive, and detailed. Focus on enhancing the subject's appearance, characteristics, actions, and emotions, while keeping the core concept intact. Only return the rewritten prompt, with no preamble or explanation.",
          background: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a background to create a rich and immersive environment. Focus on describing the setting, atmosphere, lighting, and surrounding elements in greater detail. Keep the core idea of the background intact. Only return the rewritten prompt, with no preamble or explanation.",
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
    });
}

export async function getPromptSuggestions(prompt: string, part: PromptPart): Promise<string[]> {
    return handleApiCall(async () => {
        const systemInstruction = `You are a creative assistant for an AI image generator. The user is writing a prompt for the '${part}' of their image. Based on their input, provide 3 short, inspiring phrases to help them add more detail. The suggestions MUST be additive statements or descriptive phrases, NOT questions. For example, if the user types 'a dog', you could suggest ['wearing a tiny hat', 'on a skateboard', 'in the style of Van Gogh']. Return the suggestions as a JSON array of strings.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user has typed: "${prompt}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });
        
        try {
            const jsonText = response.text.trim();
            const suggestions = JSON.parse(jsonText);
            if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
                return suggestions;
            }
            return [];
        } catch (e) {
            console.error("Failed to parse suggestions JSON:", e);
            return [];
        }
    });
}

export async function generateRandomPrompt(part: PromptPart | 'edit'): Promise<string> {
    return handleApiCall(async () => {
        const instructionMap: Record<PromptPart | 'edit', string> = {
            subject: "You are a creative idea generator for an AI image model. Generate a short, interesting, and visually rich subject for an image. Be imaginative. Provide only the subject description, with no preamble or explanation.",
            background: "You are a creative idea generator for an AI image model. Generate a short, evocative description of a background or setting for an image. Provide only the background description, with no preamble or explanation.",
            edit: "You are a creative idea generator for an AI image editing model. Generate a short, creative instruction for editing an existing image. For example, 'make the sky a galaxy' or 'add a small, sleeping fox in the corner'. Provide only the editing instruction, with no preamble or explanation."
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a random prompt for an image's ${part}.`,
            config: {
                systemInstruction: instructionMap[part],
            },
        });

        return response.text.trim().replace(/^"|"$/g, ''); // Trim quotes if model adds them
    });
}

export async function searchPexelsPhotos(apiKey: string, query: string, page: number = 1, perPage: number = 15): Promise<PexelsPhoto[]> {
  if (!apiKey) {
    throw new Error("Pexels API key is not configured. Please add it in the Settings tab.");
  }
  return handleApiCall(async () => {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Invalid Pexels API Key provided. Please check it in the settings.");
        }
      const errorData = await response.json();
      throw new Error(`Pexels API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    if (!data.photos || data.photos.length === 0) {
        throw new Error("No photos found for your search term.");
    }
    return data.photos;
  });
}