
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
      model: 'gemini-2.5-flash-image',
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

export async function remixImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  preservation: number // 0-100
): Promise<{ text?: string; image?: string }> {
  return handleApiCall(async () => {
    const strength = 100 - preservation;
    let strengthInstruction = '';
    if (strength <= 20) {
      strengthInstruction = "Stick VERY closely to the source image. The text prompt should only introduce minor details or stylistic nuances. The original composition, subjects, and colors must be almost entirely preserved.";
    } else if (strength <= 50) {
      strengthInstruction = "Create a balanced blend. Integrate the prompt's concepts while respecting the original image's composition and general mood. Some transformation is expected.";
    } else if (strength <= 80) {
        strengthInstruction = "Heavily favor the creative direction of the text prompt. Use the source image for compositional and color palette inspiration, but feel free to radically transform the subject and style.";
    } else {
        strengthInstruction = "Almost completely disregard the source image's subject matter. Use it only as a vague reference for color and basic shapes. The text prompt is the primary driver of the final output. Be extremely creative and transformative.";
    }

    const fullPrompt = `
      **Task**: Perform an image-to-image generation (a "remix").
      **Source Image**: Provided as input.
      **Text Prompt**: "${prompt}"

      **Instructions**:
      1. Creatively merge the artistic style, subject, and composition of the source image with the concepts described in the text prompt.
      2. The "Creative Strength" for this task is ${strength}%. ${strengthInstruction}
      3. Ensure all new elements from the prompt are seamlessly and naturally integrated into the scene, matching the lighting, perspective, and style.
      4. The output must be an image only, with the exact same dimensions as the input image. Do not output text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          { text: fullPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: { text?: string; image?: string } = {};
    const candidate = response.candidates?.[0];

    if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
            if (part.text) {
                result.text = part.text;
            } else if (part.inlineData) {
                result.image = part.inlineData.data;
            }
        }
    }

    if (!result.image && candidate?.finishReason && candidate.finishReason !== 'STOP') {
        const reason = candidate.finishReason.charAt(0).toUpperCase() + candidate.finishReason.slice(1).toLowerCase().replace(/_/g, ' ');
        result.text = `Image remix failed. Reason: ${reason}. Please adjust your prompt.`;
    }

    return result;
  });
}

export async function findAndMaskObjects(
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<{ text?: string; image?: string }> {
  return handleApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          { text: `Please identify the '${prompt}' in the image. Create a clean, hard-edged, binary mask. The identified object must be solid white (#FFFFFF) and the background must be solid black (#000000). The output should be an image of the mask only, with the exact same dimensions as the original.` },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: { text?: string; image?: string } = {};
    const candidate = response.candidates?.[0];

    if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
            if (part.text) {
                result.text = part.text;
            } else if (part.inlineData) {
                result.image = part.inlineData.data;
            }
        }
    }
     if (!result.image && candidate?.finishReason && candidate.finishReason !== 'STOP') {
        const reason = candidate.finishReason.charAt(0).toUpperCase() + candidate.finishReason.slice(1).toLowerCase().replace(/_/g, ' ');
        result.text = `Mask generation failed. Reason: ${reason}. Please adjust your prompt.`;
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

export async function rewritePrompt(prompt: string, part: PromptPart | 'edit'): Promise<string> {
    if (!prompt.trim()) {
      return prompt;
    }

    return handleApiCall(async () => {
        const instructionMap: Record<PromptPart | 'edit', string> = {
          subject: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a subject to be more vivid, descriptive, and detailed. Focus on enhancing the subject's appearance, characteristics, actions, and emotions, while keeping the core concept intact. Only return the rewritten prompt, with no preamble or explanation.",
          background: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's description of a background to create a rich and immersive environment. Focus on describing the setting, atmosphere, lighting, and surrounding elements in greater detail. Keep the core idea of the background intact. Only return the rewritten prompt, with no preamble or explanation.",
          edit: "You are an expert prompt engineer for generative AI image models. Your task is to rewrite the user's editing instruction to be clearer, more descriptive, and more likely to produce a good result from an inpainting or masked editing model. Focus on specifying the change, the style, and how it should blend with the rest of the image. Keep the core instruction intact. Only return the rewritten prompt, with no preamble or explanation."
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
                temperature: 1,
            },
        });

        return response.text.trim().replace(/^"|"$/g, ''); // Trim quotes if model adds them
    });
}

export async function applyStyleTransfer(
  contentImageB64: string,
  contentMime: string,
  styleImageB64: string,
  styleMime: string,
  strength: number
): Promise<{ text?: string; image?: string }> {
  return handleApiCall(async () => {
    let strengthInstruction = '';
    if (strength <= 30) {
      strengthInstruction = "Subtly influence the content image with the style reference. Introduce elements of the style's color palette and texture, but the content image's original form and details should remain dominant and clearly recognizable.";
    } else if (strength <= 70) {
      strengthInstruction = "Create a balanced fusion. The content image's composition and subjects should be clear, but rendered with the distinct brushstrokes, color grading, and mood of the style reference. This is a true artistic blend.";
    } else if (strength <= 90) {
      strengthInstruction = "Strongly apply the style reference. The content image's structure should be used as a blueprint, but completely reinterpret it with the style's visual language. The final image should feel much closer to the style reference than the original content.";
    } else {
      strengthInstruction = "Completely transform the content image into the style reference. Deconstruct the original content and rebuild it using only the artistic elements of the style image. The original composition may be altered to better fit the new style. The result should be as if the artist of the style reference created the content image from scratch.";
    }

    const fullPrompt = `
      **Task**: Perform a style transfer.
      **Content Image**: The first image provided.
      **Style Reference**: The second image provided.

      **Instructions**:
      1. Analyze the artistic style of the style reference image. This includes its color palette, brushstrokes, texture, lighting, and overall mood.
      2. Recreate the content image, preserving its core composition and subject matter, but render it entirely in the style of the style reference.
      3. The desired "Style Strength" is approximately ${strength}%. ${strengthInstruction}
      4. The output MUST be an image only, with the exact same dimensions as the content image. Do not output text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: contentImageB64, mimeType: contentMime } },
          { inlineData: { data: styleImageB64, mimeType: styleMime } },
          { text: fullPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    const result: { text?: string; image?: string } = {};
    const candidate = response.candidates?.[0];

    if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        for (const part of candidate.content.parts) {
            if (part.text) {
                result.text = part.text;
            } else if (part.inlineData) {
                result.image = part.inlineData.data;
            }
        }
    }

    if (!result.image && candidate?.finishReason && candidate.finishReason !== 'STOP') {
        const reason = candidate.finishReason.charAt(0).toUpperCase() + candidate.finishReason.slice(1).toLowerCase().replace(/_/g, ' ');
        result.text = `Style transfer failed. Reason: ${reason}. Please try a different style image or strength.`;
    }

    return result;
  });
}

// Fix: Renamed function to correct typo from searchPelsPhotos to searchPexelsPhotos.
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
    return data.photos || [];
  });
}
