import { ImageStyle, AspectRatioValue, Filter, LightingStyle, CompositionRule, ClipArtShape } from "./types";

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

export const INITIAL_SHAPES: ClipArtShape[] = [
    {
        name: 'Star',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAuNTg3bDMuNjY4IDcuNTY4IDguMzMyIDEuMTUxLTYuMDY0IDUuODI4IDEuNDggOC4yNzlMMTIgMTkuNDQ5bC03LjQxNiA0Ljk2NCAxLjQ4LTguMjc5TDAgOS4zMDZsOC4zMzItMS4xNTF6Ii8+PC9zdmc+'
    },
    {
        name: 'Heart',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyMS4zNWwtMS40NS0xLjMyQzUuNCAxNS4zNiAyIDEyLjI4IDIgOC41IDIgNS40MiA0LjQyIDMgNy41IDNjMS43NCAwIDMuNDEuODEgNC41IDIuMDlDMTMuMDkgMy44MSAxNC43NiAzIDE2LjUgMyAxOS41OCAzIDIyIDUuNDIgMjIgOC41YzAgMy43OC0zLjQgNi44Ni04LjU1IDExLjU0TDEyIDIxLjM1eiIvPjwvc3ZnPg=='
    },
    {
        name: 'Arrow',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiA0bC0xLjQxIDEuNDFMMTYuMTcgMTFINGwtLjAxIDJoMTIuMTZsLTUuNTcgNS41OUwxMiAyMGw4LTh6Ii8+PC9zdmc+'
    },
    {
        name: 'Circle',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+'
    },
    {
        name: 'Square',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz48L3N2Zz4='
    },
    {
        name: 'Triangle',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyIEwxIDIxIEwyMyAyMSBaIi8+PC9zdmc+'
    },
    {
        name: 'Person',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAxMmMxLjY2IDAgMy0xLjM0IDMtMyBjMC0xLjY2LTEuMzQtMy0zLTMgcy0zIDEuMzQtMyAzYzAgMS42NiAxLjM0IDMgMyAzIHogTTEyIDE0Yy0yLjMzIDAtNyAyLjI1LTcgNSBjMC4yMSAxLjE1IDIuNDIgMiA3IDIgNC41OCAwIDYuNzktMC44NSA3LTJjMC0yLjc1LTQuNjctNS03LTUgeiIvPjwvc3ZnPg=='
    },
    {
        name: 'Speech Bubble',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMCAySDJDMC45IDIgMCAyLjkgMCA0djEyaDIwbDIgM1Y0YzAtMS4xLTAuOS0yLTItMnogbS0yIDEySDZWOGgxMHY2eiIvPjwvc3ZnPg=='
    },
    {
        name: 'Cloud',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOS4zNSAxMC4wNGMtMS40My0xLjU0LTMuNTQtMi40OS01Ljg1LTIuNDktMS4yNSAwLTIuNDUuMjctMy41My43NUM4LjY4IDYuNjQgNi45NiA1LjUgNSA1LjVjLTIuNzYgMC01IDIuMjQtNSA1IDAgMC41MS4xIDEgMC4yOCAxLjQ2QzAuMTIgMTIuNDYgMCAxMy4yMSAwIDE0YzAgMy4zMSAyLjY5IDYgNiA2aDEzYzIuNzYgMCA1LTIuMjQgNS01IDAtMi42My0xLjk0LTQuNzgtNC40OC00Ljk2LTEuNzQtMi4wMy00LjM4LTMuMjYtNy4xNy0zLjI2eiIvPjwvc3ZnPg=='
    },
    {
        name: 'Lightbulb',
        dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik05IDE5aDZ2Mkg5di0yek0xMiAyQy41IDIgMiA2LjUgMiAxMmMwIDMuMDQgMi40NyA1LjUgNS41IDUuNWgwQzEwLjUzIDE3LjUgMTIgMTQuNTMgMTIgMTJjMC0yLjUzIDIuNDctNS41IDUuNS01LjVoMEMyMS41MyA2LjUgMjQgMi4wNCAyNCA4YzAtNS41LTQuNS02LTExLTYgMS0xIDEuNS0xLjUgMS41LTIuNUMxMy41IDQuNDcgMTIuNTMgMiAxMiAyIi8+PC9zdmc+'
    }
];