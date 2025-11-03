
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
      prompt,
      config: {
        numberOfImages: config.numberOfImages,
        aspectRatio: config.aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        outputMimeType: 'image/png',
      },
    });

    return response.generatedImages.map(img => img.image.imageBytes);
  });
}

export async function describeImage(
  imageDataBase64: string,
  mimeType: string
): Promise<string> {
  return handleApiCall(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageDataBase64,
              mimeType,
            },
          },
          { text: "Describe this image in detail, focusing on the main subject, background elements, and overall style. Be descriptive but concise." },
        ],
      },
    });
    return response.text;
  });
}

export async function editImage(
  imageDataBase64: string,
  mimeType: string,
  prompt: string,
  maskDataBase64?: string
): Promise<{ image: string | null; text: string | null }> {
  return handleApiCall(async () => {
    const parts: any[] = [
      {
        inlineData: {
          data: imageDataBase64,
          mimeType,
        },
      },
      { text: prompt },
    ];

    if (maskDataBase64) {
      parts.push({
        inlineData: {
          data: maskDataBase64,
          mimeType: 'image/png', // Masks are usually PNG
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { image: part.inlineData.data, text: null };
      }
    }
    return { image: null, text: response.text };
  });
}

export async function remixImage(
  imageDataBase64: string,
  mimeType: string,
  prompt: string,
  remixPreservation: number
): Promise<{ image: string | null; text: string | null }> {
  return handleApiCall(async () => {
    let preservationPrompt = '';
    if (remixPreservation > 80) {
      preservationPrompt = 'Make very subtle changes based on the prompt, preserving the original image as much as possible.';
    } else if (remixPreservation > 50) {
      preservationPrompt = 'Make moderate changes based on the prompt, but keep the core elements and composition of the original image.';
    } else if (remixPreservation > 20) {
      preservationPrompt = 'Reimagine the image significantly based on the prompt, using the original image as loose inspiration.';
    } else {
      preservationPrompt = 'Completely transform the image based on the prompt, only using the original for basic color and shape ideas.';
    }

    const finalPrompt = `${prompt}. ${preservationPrompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageDataBase64,
              mimeType,
            },
          },
          { text: finalPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { image: part.inlineData.data, text: null };
      }
    }
    return { image: null, text: response.text };
  });
}

export async function findAndMaskObjects(
  imageDataBase64: string,
  mimeType: string,
  prompt: string
): Promise<{ image: string | null; text: string | null }> {
  return handleApiCall(async () => {
    const finalPrompt = `Analyze the provided image. Your task is to generate a segmentation mask for the object(s) described as: "${prompt}". The output image must be a mask where the specified object(s) are pure white (#FFFFFF) and everything else is pure black (#000000). Do not include any other colors, shades, or anti-aliasing.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageDataBase64,
              mimeType,
            },
          },
          { text: finalPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { image: part.inlineData.data, text: null };
      }
    }
    return { image: null, text: response.text };
  });
}

export async function searchPexelsPhotos(
    apiKey: string,
    query: string,
    page: number
): Promise<PexelsPhoto[]> {
    try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=15`, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!res.ok) {
            if (res.status === 403) {
                throw new Error("Invalid Pexels API Key.");
            }
            throw new Error(`Failed to fetch from Pexels. Status: ${res.status}`);
        }
        const data = await res.json();
        return data.photos;
    } catch (e: any) {
        console.error("Pexels API Error:", e);
        throw new Error(e.message || "An unknown error occurred while searching for photos on Pexels.");
    }
}

export async function applyStyleTransfer(
  contentImageData: string,
  contentMimeType: string,
  styleImageData: string,
  styleMimeType: string,
  styleStrength: number,
): Promise<{ image: string | null; text: string | null }> {
  return handleApiCall(async () => {
    let strengthPrompt = '';
    if (styleStrength > 80) {
      strengthPrompt = 'Apply the style very strongly, prioritizing the style image over the content image.';
    } else if (styleStrength > 50) {
      strengthPrompt = 'Apply the style with a good balance between the style and content images.';
    } else if (styleStrength > 20) {
      strengthPrompt = 'Apply the style subtly, preserving more of the original content image.';
    } else {
      strengthPrompt = 'Apply only a hint of the style, keeping the content image mostly unchanged.';
    }

    const prompt = `Perform a style transfer. Use the first image as the content reference and the second image as the style reference. ${strengthPrompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: contentImageData, mimeType: contentMimeType } },
          { inlineData: { data: styleImageData, mimeType: styleMimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return { image: part.inlineData.data, text: null };
      }
    }
    return { image: null, text: response.text };
  });
}

export async function rewritePrompt(
  prompt: string,
  part: PromptPart | 'edit'
): Promise<string> {
  return handleApiCall(async () => {
    let instruction = '';
    switch (part) {
      case 'subject':
        instruction = 'Rewrite the following image subject prompt to be more descriptive, evocative, and detailed. Focus on visual elements.';
        break;
      case 'background':
        instruction = 'Rewrite the following image background description to be more vivid and atmospheric. Add details about lighting and environment.';
        break;
      case 'negativePrompt':
        instruction = 'Expand upon the following negative prompt for an AI image generator. Add more common terms to avoid bad quality images, but keep it concise.';
        break;
      case 'edit':
        instruction = 'Rewrite the following image editing instruction to be clearer and more direct for an AI. Focus on a single, actionable change.';
        break;
    }

    const fullPrompt = `${instruction}\n\nPrompt: "${prompt}"\n\nRewritten Prompt:`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        stopSequences: ['"']
      }
    });
    return response.text.trim().replace(/^"/, '').replace(/"$/, '');
  });
}

export async function getPromptSuggestions(
  prompt: string,
  part: PromptPart
): Promise<string[]> {
  return handleApiCall(async () => {
    let instruction = '';
    switch (part) {
      case 'subject':
        instruction = 'Based on the image subject, suggest 3-5 related concepts or details to add.';
        break;
      case 'background':
        instruction = 'Based on the image background description, suggest 3-5 related environmental details or lighting styles to add.';
        break;
      case 'negativePrompt':
        instruction = 'Based on the negative prompt keywords, suggest 3-5 more related terms to help improve image quality.';
        break;
    }
    const fullPrompt = `${instruction}\n\nCurrent prompt: "${prompt}"`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["suggestions"],
        },
      },
    });

    try {
      const jsonStr = response.text.trim();
      const json = JSON.parse(jsonStr);
      if (json.suggestions && Array.isArray(json.suggestions)) {
        return json.suggestions.slice(0, 5);
      }
      return [];
    } catch (e) {
      console.error("Failed to parse suggestions JSON:", e);
      return [];
    }
  });
}

export async function generateRandomPrompt(
  part: PromptPart | 'edit'
): Promise<string> {
  return handleApiCall(async () => {
    let instruction = '';
    switch (part) {
      case 'subject':
        instruction = 'Generate a random, creative, and visually interesting subject for an image. Be concise.';
        break;
      case 'background':
        instruction = 'Generate a random, creative, and visually interesting background for an image. Be concise.';
        break;
      case 'negativePrompt':
        instruction = 'Generate a standard, good-quality negative prompt for an AI image generator.';
        break;
      case 'edit':
        instruction = 'Generate a random, simple image editing instruction, like "add a hat" or "make it nighttime".';
        break;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: instruction,
    });
    return response.text.trim().replace(/^"/, '').replace(/"$/, '');
  });
}
