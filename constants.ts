
import { ImageStyle, AspectRatioValue, Filter, LightingStyle, CompositionRule, TechnicalModifier, ImageAdjustments, ComfyUIWorkflow } from "./types";

export const SUPPORTED_ASPECT_RATIOS: { name: string; value: AspectRatioValue }[] = [
    { name: 'Square (1:1)', value: '1:1' },
    { name: 'Landscape (4:3)', value: '4:3' },
    { name: 'Portrait (3:4)', value: '3:4' },
    { name: 'Widescreen (16:9)', value: '16:9' },
    { name: 'Tall (9:16)', value: '9:16' },
];

export const BLEND_MODES: { name: string; value: string }[] = [
    { name: 'Normal', value: 'source-over' },
    { name: 'Multiply', value: 'multiply' },
    { name: 'Screen', value: 'screen' },
    { name: 'Overlay', value: 'overlay' },
    { name: 'Darken', value: 'darken' },
    { name: 'Lighten', value: 'lighten' },
    { name: 'Color Dodge', value: 'color-dodge' },
    { name: 'Color Burn', value: 'color-burn' },
    { name: 'Hard Light', value: 'hard-light' },
    { name: 'Soft Light', value: 'soft-light' },
    { name: 'Difference', value: 'difference' },
    { name: 'Exclusion', value: 'exclusion' },
    { name: 'Hue', value: 'hue' },
    { name: 'Saturation', value: 'saturation' },
    { name: 'Color', value: 'color' },
    { name: 'Luminosity', value: 'luminosity' },
];

export const INITIAL_STYLES: ImageStyle[] = [
    { name: "None", prompt: "" },
    { name: "Abstract Expressionism", prompt: "abstract expressionism, spontaneous, energetic brushstrokes, non-representational" },
    { name: "Anime", prompt: "anime style, vibrant colors, detailed background, trending on pixiv" },
    { name: "Charcoal Drawing", prompt: "charcoal drawing, expressive, textured paper, dramatic contrast, black and white" },
    { name: "Collage", prompt: "mixed media collage, torn paper, textures, abstract, layered" },
    { name: "Cyberpunk", prompt: "cyberpunk art, neon lighting, futuristic cityscape, dystopian, synthwave" },
    { name: "Daguerreotype", prompt: "daguerreotype, early photography, silver plate, detailed, monochrome, vintage" },
    { name: "Fantasy", prompt: "epic fantasy art, magical, ethereal, detailed, high fantasy concept art" },
    { name: "Flat Design", prompt: "flat design, minimalist, 2D, vector art, simple shapes, vibrant colors" },
    { name: "Impasto", prompt: "impasto painting, thick visible brushstrokes, oil on canvas, textured" },
    { name: "Impressionism", prompt: "impressionist painting, visible brushstrokes, soft light, Claude Monet style" },
    { name: "Illustration", prompt: "digital illustration, detailed, clean lines, vibrant color palette" },
    { name: "Kinetic Art", prompt: "kinetic art, op art, creates an impression of movement, geometric abstraction" },
    { name: "Low-poly", prompt: "low-poly style, geometric shapes, polygons, minimalist, 3d render" },
    { name: "Mid-Century Modern", prompt: "mid-century modern illustration, clean lines, organic shapes, retro color palette" },
    { name: "Minimalist", prompt: "minimalist design, clean lines, simple color palette, vector art" },
    { name: "Modern Design", prompt: "modern design, sleek, simple forms, functional, contemporary" },
    { name: "Oil Painting", prompt: "oil painting, rich colors, detailed brushwork, classic, realistic" },
    { name: "Old Photography", prompt: "old photograph, faded colors, film grain, scratches, vintage, sepia tone" },
    { name: "Patchwork", prompt: "patchwork style, stitched fabrics, quilt-like, textured, colorful patterns" },
    { name: "Photorealistic", prompt: "photorealistic, 8k, sharp focus, detailed, professional photography" },
    { name: "Pixelate", prompt: "pixel art, 8-bit, 16-bit, retro video game style, limited color palette" },
    { name: "Pixar Style", prompt: "Pixar animation style, 3D render, vibrant, expressive characters, detailed textures" },
    { name: "Rococo", prompt: "Rococo painting, ornate, pastel colors, elegant, elaborate detail, 18th-century French style" },
    { name: "Sketch", prompt: "pencil sketch, detailed, charcoal drawing, black and white, hand-drawn" },
    { name: "Surrealism", prompt: "surrealism, dreamlike, bizarre, unexpected juxtapositions, Salvador Dali style" },
    { name: "3D Render", prompt: "3D render, octane render, trending on artstation, cinematic lighting, hyperrealistic" },
    { name: "Vintage", prompt: "vintage aesthetic, retro, faded photograph, nostalgic" },
    { name: "Watercolor", prompt: "watercolor painting, soft edges, vibrant washes of color, paper texture" },
].sort((a, b) => a.name.localeCompare(b.name));

export const LIGHTING_STYLES: LightingStyle[] = [
    { name: "Backlit", prompt: "backlit, silhouette, lens flare" },
    { name: "Cinematic", prompt: "cinematic lighting, dramatic shadows" },
    { name: "Default", prompt: "" },
    { name: "Dramatic", prompt: "dramatic lighting, high contrast, chiaroscuro" },
    { name: "Natural", prompt: "natural light, golden hour" },
    { name: "Rim Lighting", prompt: "rim lighting, glowing edges" },
    { name: "Studio", prompt: "studio lighting, softbox, professional portrait" },
].sort((a, b) => a.name.localeCompare(b.name));

export const COMPOSITION_RULES: CompositionRule[] = [
    { name: "Close-Up", prompt: "close-up shot, macro, detailed" },
    { name: "Default", prompt: "" },
    { name: "Framing", prompt: "framed composition, natural frame" },
    { name: "Golden Ratio", prompt: "golden ratio, fibonacci spiral" },
    { name: "High Angle", prompt: "high angle shot, bird's eye view" },
    { name: "Leading Lines", prompt: "leading lines composition" },
    { name: "Low Angle", prompt: "low angle shot, worm's eye view" },
    { name: "Portrait", prompt: "portrait orientation, head and shoulders shot" },
    { name: "Rule of Thirds", prompt: "rule of thirds composition" },
    { name: "Symmetry", prompt: "symmetrical composition, balanced" },
    { name: "Wide Angle Shot", prompt: "wide angle shot, panoramic, expansive view" },
].sort((a, b) => a.name.localeCompare(b.name));

export const TECHNICAL_MODIFIERS: TechnicalModifier[] = [
    { name: "Default", prompt: "" },
    { name: "Bokeh", prompt: "bokeh, blurred background, shallow depth of field" },
    { name: "Double Exposure", prompt: "double exposure, layered images, blended" },
    { name: "Fisheye Lens", prompt: "fisheye lens, distorted, ultra-wide angle" },
    { name: "HDR (High Dynamic Range)", prompt: "HDR, high dynamic range, rich details in shadows and highlights" },
    { name: "Long Exposure", prompt: "long exposure, light trails, motion blur" },
    { name: "Macro Photography", prompt: "macro photography, extreme close-up, high detail" },
    { name: "Motion Blur", prompt: "motion blur, sense of speed, blurred movement" },
    { name: "Shallow Depth of Field", prompt: "shallow depth of field, focused subject, blurred background" },
    { name: "Soft Focus", prompt: "soft focus, dreamy, ethereal, slightly blurred" },
    { name: "Tilt-Shift", prompt: "tilt-shift photography, miniature faking, selective focus" },
].sort((a, b) => a.name.localeCompare(b.name));

const unsortedFilters: Filter[] = [
    { name: "None", value: "none" },
    { name: "Blueprint", value: "grayscale(100%) contrast(200%) invert(100%) hue-rotate(180deg)" },
    { name: "Cool", value: "sepia(20%) hue-rotate(180deg) saturate(150%)" },
    { name: "Cyber Glow", value: "contrast(120%) saturate(180%) hue-rotate(290deg)" },
    { name: "Gritty", value: "contrast(160%) grayscale(50%)" },
    { name: "High Contrast", value: "contrast(180%)" },
    { name: "Infrared", value: "hue-rotate(280deg) saturate(200%) contrast(120%)" },
    { name: "Invert", value: "invert(100%)" },
    { name: "Noir", value: "grayscale(100%)" },
    { name: "Sepia", value: "sepia(100%)" },
    { name: "Vibrant", value: "saturate(200%)" },
    { name: "Vintage", value: "sepia(60%) contrast(110%) brightness(90%)" },
    { name: "Warm", value: "sepia(40%) saturate(150%) hue-rotate(-20deg)" },
];

export const FILTERS: Filter[] = [
    unsortedFilters.find(f => f.name === "None")!,
    ...unsortedFilters.filter(f => f.name !== "None").sort((a, b) => a.name.localeCompare(b.name))
];

export const INITIAL_COLOR_PRESETS: string[] = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'
];

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
    brightness: 100,
    contrast: 100,
    red: 100,
    green: 100,
    blue: 100,
    filter: 'None',
};


const BASIC_WORKFLOW_JSON = `{"3":{"inputs":{"seed":123,"steps":20,"cfg":8,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["4",0],"positive":["6",0],"negative":["7",0],"latent_image":["5",0]},"class_type":"KSampler"},"4":{"inputs":{"ckpt_name":"model.safetensors"},"class_type":"CheckpointLoaderSimple"},"5":{"inputs":{"width":512,"height":512,"batch_size":1},"class_type":"EmptyLatentImage"},"6":{"inputs":{"text":"positive prompt","clip":["4",1]},"class_type":"CLIPTextEncode"},"7":{"inputs":{"text":"negative prompt","clip":["4",1]},"class_type":"CLIPTextEncode"},"8":{"inputs":{"samples":["3",0],"vae":["4",2]},"class_type":"VAEDecode"},"9":{"inputs":{"filename_prefix":"ComfyUI","images":["8",0]},"class_type":"SaveImage"}}`;
const LORA_WORKFLOW_JSON = `{"3":{"inputs":{"seed":456,"steps":20,"cfg":8,"sampler_name":"euler","scheduler":"normal","denoise":1,"model":["10",0],"positive":["6",0],"negative":["7",0],"latent_image":["5",0]},"class_type":"KSampler"},"4":{"inputs":{"ckpt_name":"model.safetensors"},"class_type":"CheckpointLoaderSimple"},"5":{"inputs":{"width":512,"height":512,"batch_size":1},"class_type":"EmptyLatentImage"},"6":{"inputs":{"text":"positive prompt","clip":["10",1]},"class_type":"CLIPTextEncode"},"7":{"inputs":{"text":"negative prompt","clip":["10",1]},"class_type":"CLIPTextEncode"},"8":{"inputs":{"samples":["3",0],"vae":["4",2]},"class_type":"VAEDecode"},"9":{"inputs":{"filename_prefix":"ComfyUI","images":["8",0]},"class_type":"SaveImage"},"10":{"inputs":{"model":["4",0],"clip":["4",1],"lora_name":"lora.safetensors","strength_model":1,"strength_clip":1},"class_type":"LoraLoader"}}`;


export const COMFYUI_WORKFLOWS: ComfyUIWorkflow[] = [
    {
        name: "Basic Text-to-Image",
        description: "A simple workflow for generating an image from a text prompt.",
        json: BASIC_WORKFLOW_JSON,
    },
    {
        name: "Text-to-Image with LoRA",
        description: "Applies a LoRA model to the generation process for a specific style or character.",
        json: LORA_WORKFLOW_JSON,
    }
];
