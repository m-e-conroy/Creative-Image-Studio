import { ImageStyle, AspectRatioValue, Filter, LightingStyle, CompositionRule } from "./types";

export const SUPPORTED_ASPECT_RATIOS: { name: string; value: AspectRatioValue }[] = [
    { name: 'Square (1:1)', value: '1:1' },
    { name: 'Landscape (4:3)', value: '4:3' },
    { name: 'Portrait (3:4)', value: '3:4' },
    { name: 'Widescreen (16:9)', value: '16:9' },
    { name: 'Tall (9:16)', value: '9:16' },
];

export const INITIAL_STYLES: ImageStyle[] = [
    { name: "Photorealistic", prompt: "photorealistic, 8k, sharp focus, detailed, professional photography" },
    { name: "Anime", prompt: "anime style, vibrant colors, detailed background, trending on pixiv" },
    { name: "Cyberpunk", prompt: "cyberpunk art, neon lighting, futuristic cityscape, dystopian, synthwave" },
    { name: "Impressionism", prompt: "impressionist painting, visible brushstrokes, soft light, Claude Monet style" },
    { name: "Fantasy", prompt: "epic fantasy art, magical, ethereal, detailed, high fantasy concept art" },
    { name: "Watercolor", prompt: "watercolor painting, soft edges, vibrant washes of color, paper texture" },
    { name: "Minimalist", prompt: "minimalist design, clean lines, simple color palette, vector art" },
    { name: "Illustration", prompt: "digital illustration, detailed, clean lines, vibrant color palette" },
    { name: "3D Render", prompt: "3D render, octane render, trending on artstation, cinematic lighting, hyperrealistic" },
    { name: "Impasto", prompt: "impasto painting, thick visible brushstrokes, oil on canvas, textured" },
    { name: "Sketch", prompt: "pencil sketch, detailed, charcoal drawing, black and white, hand-drawn" },
    { name: "Collage", prompt: "mixed media collage, torn paper, textures, abstract, layered" },
];

export const LIGHTING_STYLES: LightingStyle[] = [
    { name: "Default", prompt: "" },
    { name: "Cinematic", prompt: "cinematic lighting, dramatic shadows" },
    { name: "Studio", prompt: "studio lighting, softbox, professional portrait" },
    { name: "Natural", prompt: "natural light, golden hour" },
    { name: "Dramatic", prompt: "dramatic lighting, high contrast, chiaroscuro" },
    { name: "Rim Lighting", prompt: "rim lighting, glowing edges" },
    { name: "Backlit", prompt: "backlit, silhouette, lens flare" },
];

export const COMPOSITION_RULES: CompositionRule[] = [
    { name: "Default", prompt: "" },
    { name: "Rule of Thirds", prompt: "rule of thirds composition" },
    { name: "Golden Ratio", prompt: "golden ratio, fibonacci spiral" },
    { name: "Leading Lines", prompt: "leading lines composition" },
    { name: "Symmetry", prompt: "symmetrical composition, balanced" },
    { name: "Framing", prompt: "framed composition, natural frame" },
    { name: "Low Angle", prompt: "low angle shot, worm's eye view" },
    { name: "High Angle", prompt: "high angle shot, bird's eye view" },
];


export const FILTERS: Filter[] = [
    { name: "None", value: "none" },
    { name: "Noir", value: "grayscale(100%)" },
    { name: "Sepia", value: "sepia(100%)" },
    { name: "Vintage", value: "sepia(60%) contrast(110%) brightness(90%)" },
    { name: "High Contrast", value: "contrast(180%)" },
    { name: "Solarize", value: "invert(100%)" },
    { name: "Vibrant", value: "saturate(200%)" },
    { name: "Cyber Glow", value: "contrast(120%) saturate(180%) hue-rotate(290deg)" },
];