// A service for interacting with a ComfyUI backend.

import { ComfyUIGenerateSettings } from "../types";

async function handleApiCall<T>(apiCall: () => Promise<T>, serverAddress: string): Promise<T> {
  try {
    return await apiCall();
  } catch (e: unknown) {
    console.error(`ComfyUI API Error (${serverAddress}):`, e);
    if (e instanceof TypeError) { // Often a network error or CORS issue
        throw new Error(`Could not connect to the ComfyUI server at ${serverAddress}. Please ensure it's running and CORS is configured correctly if necessary.`);
    }
    if (e instanceof Error) {
        throw new Error(`ComfyUI API Error: ${e.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the ComfyUI service.");
  }
}

/**
 * Fetches available models (like checkpoints or LoRAs) from the ComfyUI server.
 * @param serverAddress - The base URL of the ComfyUI server.
 * @param modelType - The type of model to fetch.
 * @returns A promise that resolves to an array of model names.
 */
export async function getModels(serverAddress: string, modelType: 'checkpoints' | 'loras'): Promise<string[]> {
    return handleApiCall(async () => {
        const nodeClass = modelType === 'checkpoints' ? 'CheckpointLoaderSimple' : 'LoraLoader';
        const res = await fetch(`${serverAddress}/object_info/${nodeClass}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch model list for ${modelType}. Status: ${res.status}`);
        }
        const data = await res.json();
        const modelList = data?.input?.required?.ckpt_name?.[0] || data?.input?.required?.lora_name?.[0];

        if (!Array.isArray(modelList)) {
            console.warn(`Could not find a valid model list in the response for ${nodeClass}`, data);
            return [];
        }
        return modelList;
    }, serverAddress);
}


/**
 * Generates an image using the ComfyUI backend.
 * @param settings - The settings for the image generation request.
 * @returns A promise that resolves to a base64 encoded string of the generated image.
 */
export async function generateImage(settings: ComfyUIGenerateSettings): Promise<string> {
  const { serverAddress, workflow, positivePrompt, negativePrompt, checkpoint, lora, setLoadingMessage } = settings;
  
  return handleApiCall(async () => {
    // 1. Deep copy and modify the workflow
    const workflowCopy = JSON.parse(workflow);
    
    // Find node IDs by their class type (more robust than titles)
    const nodeMapping: { [key: string]: string } = {};
    for (const nodeId in workflowCopy) {
      const node = workflowCopy[nodeId];
      // Store the first found node of each type. Assumes simple workflows.
      if (!nodeMapping[node.class_type]) {
        nodeMapping[node.class_type] = nodeId;
      }
    }

    if (nodeMapping['CheckpointLoaderSimple']) {
      workflowCopy[nodeMapping['CheckpointLoaderSimple']].inputs.ckpt_name = checkpoint;
    }
    if (nodeMapping['LoraLoader'] && lora !== 'None') {
        workflowCopy[nodeMapping['LoraLoader']].inputs.lora_name = lora;
    }
    // Assumes the positive prompt is the first text encoder and negative is the second
    const clipTextEncodeNodes = Object.keys(workflowCopy).filter(id => workflowCopy[id].class_type === 'CLIPTextEncode');
    if (clipTextEncodeNodes[0]) {
      workflowCopy[clipTextEncodeNodes[0]].inputs.text = positivePrompt;
    }
    if (clipTextEncodeNodes[1]) {
      workflowCopy[clipTextEncodeNodes[1]].inputs.text = negativePrompt;
    }

    // Assign a random seed
    if (nodeMapping['KSampler']) {
        workflowCopy[nodeMapping['KSampler']].inputs.seed = Math.floor(Math.random() * 1_000_000_000);
    }
    
    // 2. Queue the prompt
    const clientId = crypto.randomUUID();
    const body = JSON.stringify({ prompt: workflowCopy, client_id: clientId });

    const promptRes = await fetch(`${serverAddress}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });
    const promptData = await promptRes.json();
    if (promptData.error) {
        throw new Error(`Workflow error: ${promptData.message} - ${JSON.stringify(promptData.node_errors)}`);
    }

    const promptId = promptData.prompt_id;

    // 3. Listen for the result via WebSocket
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${serverAddress.replace('http', 'ws')}/ws?clientId=${clientId}`);

        ws.onopen = () => {
            setLoadingMessage('Waiting for ComfyUI...');
        };

        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'progress') {
                const { value, max } = msg.data;
                const percent = Math.round((value / max) * 100);
                setLoadingMessage(`Sampling... ${percent}%`);
            }
            
            if (msg.type === 'execution_start' && msg.data.prompt_id === promptId) {
                setLoadingMessage('ComfyUI job started...');
            }

            if (msg.type === 'executed' && msg.data.prompt_id === promptId) {
                setLoadingMessage('Fetching image...');
                ws.close();
                
                const images = msg.data.output.images;
                if (!images || images.length === 0) {
                    reject(new Error("ComfyUI finished but returned no images."));
                    return;
                }
                const firstImage = images[0];
                const { filename, subfolder, type } = firstImage;

                const imageUrl = new URL(`${serverAddress}/view`);
                imageUrl.searchParams.append('filename', filename);
                imageUrl.searchParams.append('subfolder', subfolder);
                imageUrl.searchParams.append('type', type);
                
                const imageRes = await fetch(imageUrl);
                const imageBlob = await imageRes.blob();
                
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = (err) => reject(new Error("Failed to convert image blob to base64."));
                reader.readAsDataURL(imageBlob);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            reject(new Error("WebSocket connection to ComfyUI failed."));
        };
    });

  }, serverAddress);
}
