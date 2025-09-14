import { ImageStyle, AspectRatioValue, Filter, LightingStyle, CompositionRule, TechnicalModifier, ClipArtCategory } from "./types";

export const SUPPORTED_ASPECT_RATIOS: { name: string; value: AspectRatioValue }[] = [
    { name: 'Square (1:1)', value: '1:1' },
    { name: 'Landscape (4:3)', value: '4:3' },
    { name: 'Portrait (3:4)', value: '3:4' },
    { name: 'Widescreen (16:9)', value: '16:9' },
    { name: 'Tall (9:16)', value: '9:16' },
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

export const CLIP_ART_CATEGORIES: ClipArtCategory[] = [
    {
        name: 'Basic',
        shapes: [
            { name: 'Circle', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+' },
            { name: 'Square', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz48L3N2Zz4=' },
            { name: 'Triangle', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyIEwxIDIxIEwyMyAyMSBaIi8+PC9zdmc+' },
            { name: 'Star', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAuNTg3bDMuNjY4IDcuNTY4IDguMzMyIDEuMTUxLTYuMDY0IDUuODI4IDEuNDggOC4yNzlMMTIgMTkuNDQ5bC03LjQxNiA0Ljk2NCAxLjQ4LTguMjc5TDAgOS4zMDZsOC4zMzItMS4xNTF6Ii8+PC9zdmc+' },
            { name: 'Heart', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyMS4zNWwtMS40NS0xLjMyQzUuNCAxNS4zNiAyIDEyLjI4IDIgOC41IDIgNS40MiA0LjQyIDMgNy41IDNjMS43NCAwIDMuNDEuODEgNC41IDIuMDlDMTMuMDkgMy44MSAxNC43NiAzIDE2LjUgMyAxOS41OCAzIDIyIDUuNDIgMjIgOC41YzAgMy43OC0zLjQgNi44Ni04LjU1IDExLjU0TDEyIDIxLjM1eiIvPjwvc3ZnPg==' },
            { name: 'Arrow', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiA0bC0xLjQxIDEuNDFMMTYuMTcgMTFINGwtLjAxIDJoMTIuMTZsLTUuNTcgNS41OUwxMiAyMGw4LTh6Ii8+PC9zdmc+' },
        ],
    },
    {
        name: 'Material - UI',
        shapes: [
            { name: 'Settings', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOS40MyAxMi45OGMuMDQtLjMyLjA3LS42NC4wNy0uOThzLS4wMy0uNjYtLjA3LS45OGwyLjExLTEuNjVjLjE5LS4xNS4yNC0uNDIuMTItLjY0bC0yLTMuNDZjLS4xMi0uMjItLjM5LS4zLS42MS0uMjJsLTIuNDkgMWMtLjUyLS40LTEuMDgtLjczLTEuNjktLjk4bC0uMzgtMi42NUMxNC40NiAyLjE4IDE0LjI1IDIyIDE0IDJoLTRjLS4yNSAwLS40Ni4xOC0uNDkuNDJsLS4zOCAyLjY1Yy0uNjEuMjUtMS4xNy41OS0xLjY5Ljk4bC0yLjQ5LTFjLS4yMy0uMDktLjQ5IDAtLjYxLjIybC0yIDMuNDZjLS4xMy4yMi0uMDcuNDkuMTIuNjRsMi4xMSAxLjY1Yy0uMDQuMzItLjA3LjY1LS4wNy45OHMuMDMuNjYuMDcuOThsLTIuMTEgMS42NWMtLjE5LjE1LS4yNC40Mi0uMTIuNjRsMiAzLjQ2Yy4xMi4yMi4zOS4zLjYxLjIybDIuNDktMWMuNTIuNCAxLjA4LjczIDEuNjkuOThsLjM4IDIuNjVjLjAzLjI0LjI0LjQyLjQ5LjQyaDRjLjI1IDAgLjQ2LS4xOC40OS0uNDJsLjM4LTIuNjVjLjYxLS4yNSAxLjE3LS41OSAxLjY5LS45OGwyLjQ5IDFjLjIzLjA5LjQ5IDAgLjYxLS4yMmwyLTMuNDZjLjEyLS4yMi4wNy0uNDktLjEyLS42NGwtMi4xMS0xLjY1ek0xMiAxNS41Yy0xLjkzIDAtMy41LTEuNTctMy41LTMuNXMxLjU3LTMuNSAzLjUtMy41IDMuNSAxLjU3IDMuNSAzLjUtMS41NyAzLjUtMy41IDMuNXoiLz48L3N2Zz4=' },
            { name: 'Delete', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik02IDE5YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY3SDZ2MTJ6TTE5IDRoLTMuNWwtMS0xaC01bC0xIDFINGMtMS4xIDAtMiAuOS0yIDJ2MmgxNlY2YzAtMS4xLS45LTItMi0yeiIvPjwvc3ZnPg==' },
            { name: 'Search', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xNS41IDE0aC0uNzlsLS4yOC0uMjdDMTUuNDEgMTIuNTkgMTYgMTEuMTEgMTYgOS41IDE2IDUuOTEgMTMuMDkgMyA5LjUgM1M0IDUuOTEgNCA5LjUgNCAxMy4wOSA0IDE2YzEuMzkgMCAyLjc2LS41OSA1LjIzLTEuNTZoLjg1djFjMCAuNzUuMzEgMS40MS44MiAxLjkxbDMuNCAzLjRjLjU0LjU0IDEuNDEuNTQgMS45NSAwcy41NC0xLjQxIDAtMS45NWwtMy40LTMuNGMtLjUtLjUtMS4xNi0uODItMS45MS0uODJ2LTEuMjNsLjI3LjI4eiBNOS41IDE0QzcuMDIgMTQgNSAxMS45OCA1IDEwYTUtNSAwIDExNy41IDIuNUwxNi41IDE2eiIvPjwvc3ZnPg==' },
            { name: 'Favorite', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyMS4zNWwtMS40NS0xLjMyQzUuNCAxNS4zNiAyIDEyLjI4IDIgOC41IDIgNS40MiA0LjQyIDMgNy41IDNjMS43NCAwIDMuNDEuODEgNC41IDIuMDlDMTMuMDkgMy44MSAxNC43NiAzIDE2LjUgMyAxOS41OCAzIDIyIDUuNDIgMjIgOC41YzAgMy43OC0zLjQgNi44Ni04LjU1IDExLjU0TDEyIDIxLjM1eiIvPjwvc3ZnPg==' },
            { name: 'Visibility', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiA0LjVDNyAyIDIgNyAyIDEyczUgMTAuNSAxMCAxMC41UzIyIDE3IDIyIDEycy01LTcuNS0xMC03LjV6TTEyIDE3Yy0yLjc2IDAtNS0yLjI0LTUtNXMzLjc0LTUgOC4yMy01Yy40MSAwIDEuMDQuMDQgMS40OS4xMUMxOS4yMSA4LjQxIDE5LjggMTAuMiAxOS44IDEyYzAgMi43Ni0yLjI0IDUtNSA1ek0xMiA5YTMgMyAwIDExMCA2IDMgMyAwIDAxMC02eiIvPjwvc3ZnPg==' },
            { name: 'Lock', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOCAxMHYtMmMwLTIuNzYtMi4yNC01LTUtNVM4IDUuMjQgOCA4djJINGMvMS4xIDAvMiAuOS0yIDJ2OGMwIDEuMS45IDIgMiAyaDE2YzEuMSAwIDItLjkgMi0ydi04YzAtMS4xLS45LTItMi0yem0tNi4wMSAxMGgtMmwtLjAxLTMuMDFjLS41NC0uMjctLjk5LS43OC0uOTktMS40OUM5IDExLjg3IDkuODcgMTEgMTAuODcgMTFoLjI2Yy41NyAwIDEuMDQuNDcgMS4wNCAxLjA0IDAgLjc1LS40NiAxLjI3LTEgMS41MXYyLjk2ek0xNiA4djJoLTlWOGMwLTEuMzguOS0yLjUgMi4yMS0yLjQ4IDEuNTUuMDMgMi43OSAxLjM5IDIuNzkgMi45OFY4aDR6Ii8+PC9zdmc+' },
            { name: 'Menu', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0zIDE4aDE4di0ySDN2MnptMC01aDE4di0ySDN2MnptMC03djJoMThWNkgzeiIvPjwvc3ZnPg==' },
            { name: 'Close', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOSAxMy40MWwtMy41OS0zLjU5TDE5IDYuNDEgMTcuNTkgNSA0IDExLjU5IDQgMTMgMTcuNTkgMTcgMTkgMTUuNTkgMTAuNDEgMTIgMTMgMTRaIi8+PC9zdmc+' },
            { name: 'Add', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOSA3LjQxTDE3LjU5IDYgMTIgMTEuNTkgNi40MSA2IDUgNy40MSAxMC41OSAxMiA1IDE2LjU5IDYuNDEgMTggMTIgMTMuNDEgMTcuNTkgMTggMTkgMTYuNTkgMTMuNDEgMTJaIi8+PC9zdmc+' },
            { name: 'Remove', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOSA3LjQxTDE3LjU5IDYgMTIgMTEuNTkgNi40MSA2IDUgNy40MSAxMC41OSAxMiA1IDE2LjU5IDYuNDEgMTggMTIgMTMuNDEgMTcuNTkgMTggMTkgMTYuNTkgMTMuNDEgMTJaIi8+PC9zdmc+' },
        ]
    },
    {
        name: 'FontAwesome - Objects',
        shapes: [
            { name: 'Anchor', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyQzkuMjQgMiA3IDQuMjQgNyA3djVjLTIuNzYgMC01IDIuMjQtNSA1czIuMjQgNSA1IDVoMTBjMi43NiAwIDUtMi4yNCA1LTVzLTIuMjQtNS01LTV2LTRjMC0yLjc2LTIuMjQtNS01LTV6bTAgM2MxLjY2IDAgMyAxLjM0IDMgM3MtMS4zNCAzLTMgMy0zLTEuMzQtMy0zIDEuMzQtMyAzLTN6bS04IDEyaDJ2M2gxMnYtM2gyYzEuMSAwIDItLjkgMi0ydi00YzAtMS4xLS45LTItMi0ySDZ2NnoiLz48L3N2Zz4=' },
            { name: 'Bomb', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMCAySDhDNC42OSA0LjQzIDIgNy40NCAyIDExLjA3VjE3YzAgMS4xLjkgMiAyIDJoMTJjMS4xIDAgMi0uOSAyLTJ2LTdoMWMxLjEgMCAyLS45IDItMnYtM2MwLTEuMS0uOS0yLTItMnpNMTYgN2MwIDEuNjUtMS4zNSA0LTMgNGgtM3YtNGgxLjVjMS42NSAwIDMtMS4zNSA0LTMuNXoiLz48L3N2Zz4=' },
            { name: 'Book', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOCA0SDZjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoMTJjMS4xIDAgMi0uOSAyLTJWNmMwLTEuMS0uOS0yLTItMnpNOCAxOEg2di0yaDJ2MnptMC00SDZ2LTJoMnYyem0wLThINnYtMmgxMHYySDh6bTYgNGgtMnYtMmgxMHYyaC0yem0wIDRoLTJ2LTJoMnYyem00LTJoLTJ2LTJoMnYyem0wIDRoLTJ2LTJoMnYyeiIvPjwvc3ZnPg==' },
            { name: 'Briefcase', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMCA2SDZ2MTRoNHYtNmg0djZoNHYtOGgtNHYtNGMwLTEuMS0uOS0yLTItMmgtNHptLTQgMTR2LTZoOHY2SDZ6bTEwLTJoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyeiIvPjwvc3ZnPg==' },
            { name: 'Bug', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMCA4aC0yLjgxYy0uNDUtMS43Ny0xLjUtMy4yNS0yLjktNC4wM0wxNiA0bDItMkwxNiAxbC0xLjk3IDEuOUMxMi42OCA0LjE4IDExIDYgMTEgOEg0Yy0xLjEgMC0yIC45LTIgMnYyYzAgMS4xLjkgMiAyIDJoN2MwIDIgMS4zMiAzLjgyIDMuMDMgNC45N0wxNiAyM2wyLTJMMTYgMmMtMi45IDEuNDEtNC45NyA0LjAzLTQuOTcgNy4wM3YxYzAgMS42NSAxLjM1IDMgMyAzczMtMS4zNSAzLTN2LTFoLTN6bTAtMmgydjJoLTJ2LTJ6bS00IDRoMnYyaC0ydjR6Ii8+PC9zdmc+' },
            { name: 'Car', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOC45MiA2LjAxQzE4LjcxIDUuNDIgMTguMTEgNSAxNy40NiA1SDYuNTRjLS42NSAwLTEuMjUuNDItMS40NiAxLjAxTDQgMTFoMWMwIDEuNjYgMS4zNCAzIDMgM3MzLTEuMzQgMy0zaDEwbDIgMmgtMmMwIDEuNjYgMS4zNCAzIDMgM3MzLTEuMzQgMy0zdi00LjVsLTItM3ptLTYuOTIgOWMtLjU1IDAtMS0uNDUtMS0xcy40NS0xIDEtMSAxIC40NSAxIDEgLjQ1IDEtMSAxem0tOCA2Yy0uNTUgMC0xLS40NS0xLTFzLjQ1LTEgMS0xIDEgLjQ1IDEgMSA0LjQ1IDEtMSAxek0xNSAxMmgtNmwtMi0zLjVoMTBsLTIgMy41eiIvPjwvc3ZnPg==' },
            { name: 'Coffee', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMCAzSDZjLTEuMSAwLTIgLjktMiAydjZoMWMwIDIuMjEgMS43OSA0IDQgNGgxYzIuMjEgMCA0LTEuNzkgNC00di0xLjVjMS45My0uMTQgMy41LTIuNDYgMy41LTQuNXYtMWMxLjY1IDAgMy0xLjM1IDMtM3YtMWMwLS41NS0uNDUtMS0xLTF6TTE4IDEwYy0uODYgMC0xLjU3LS41My0xLjg3LTEuMjVoMy43NGMtLjMtLjcyLTEuMDEtMS4yNS0xLjg3LTEuMjVoLS4wMXptMi0zYzAgLjU1LS40NSAxLTEgMWgtMWMwLTEuNjUtMS4zNS0zLTMtM0g4di0zaDEwdiJ6Ii8+PC9zdmc+' },
            { name: 'Gamepad', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMi41IDljLTEuMTIgMC0yLjE0LS4zMS0zLTguMjVDMTguNjggMy4yNSAxNy40MSAyIDE2IDJIMThDNC42OSA0LjQzIDIgNy40NCAyIDExLjA3VjE3YzAgMS4xLjkgMiAyIDJoMTJjMS4xIDAgMi0uOSAyLTJ2LTdoMWMxLjEgMCAyLS45IDItMnYtM2MwLS41NS0uNDUtMS0xLTF6TTE1IDVoMi41bC0yIDEtMS0yek05IDloMnYyaC0yeiIvPjwvc3ZnPg==' },
            { name: 'Guitar', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOC43NCAxMi40M2wtMS4xMSAxLjExYy0uNDQtLjE1LTktLjMxLTEuMzYtLjQ2bC0uMS0uMDQtMS4zNC0uNDktMS4xMSAxLjExYy0uODkuODktMi4zNC44OS0zLjIzIDBsLTEuNjgtMS42OGMtLjg5LS44OS0uODktMi4zNCAwLTMuMjNsMS42OC0xLjY4YzAuODktLjg5IDIuMzQtLjg5IDMuMjMgMGwxLjExIDEuMTFjLjQ1LS4xNS45LS4zMSAxLjM2LS40NmwuMS0uMDQgMS4zNC0uNDkgMS4xMS0xLjExYzAuODktLjg5IDIuMzQtLjg5IDMuMjMgMGwxLjY4IDEuNjggMC44OS44OSAyLjM0LjgzIDMuMjMgMCAuODkuODl6Ii8+PC9zdmc+' },
            { name: 'Laptop', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMCAxOEg0Yy0xLjEgMC0yLS45LTItMlY4YzAtMS4xLjktMiAyLTJoMTZjMS4xIDAgMiAuOSAyIDJ2OGMwIDEuMS0uOSAyLTItMnpNNC4wMSAxOEgyMHYxYzAgLjU1LS40NSAxLTEgMWgtMTRjLS41NSAwLTEtLjQ1LTEtMVYxOHoiLz48L3N2Zz4=' },
            { name: 'Leaf', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xNy40MyA0LjM2Yy0xLjA0LS44My0yLjQyLTEuMy0zLjg2LTEuM0MxMS42NCAzLjA2IDkuMjQgNS4xOCA4LjUgNy41Yy0uMzIgMS0xLjI1IDEuNjQtMi4yMyAxLjY0LS4zNSAwLS43LS4xLTEtLjI4LTEuMDUtLjY2LTEuNDUtMS45OS0uOS0zLjA0LjQ2LS44OCAxLjQyLTEuNDcgMi40NS0xLjQ3IDEuMzggMCAyLjUgMS4xMiAyLjUgMi41IDAgLjE5LS4wMi4zNy0uMDYuNTUgMS40My0xLjczIDMuNTgtMi45OCA2LjAzLTMuMjYgMi44LS4zMiA1LjUxIDEuNTggNi4wNiA0LjMyLjU1IDIuNzQtLjczIDUuNDQtMy4wOCA2LjY3LTEuMDQuNTUtMi4yMy42OC0zLjM4LjQ2IDEuNDYtMS43MyAyLjM2LTMuODUgMi4zNi02LjE4IDAtMS4xLS4xOC0yLjE2LS41MS0zLjE0eiIvPjwvc3ZnPg==' },
            { name: 'Plane', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0yMSAzSDNjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoN3YySDd2MmgxMHYtMmgtM3YtMmgxMWMxLjEgMCAyLS45IDItMlY1YzAtMS4xLS45LTItMi0yem0tMS41IDEySDYuMThsMS45Ny03LjQyTDkuNSA1aDVsMS4zNSAyLjU4TDE3LjUgMTV6Ii8+PC9zdmc+' },
            { name: 'Rocket', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyQzkuMjQgMiA3IDQuMjQgNyA3djVjLTIuNzYgMC01IDIuMjQtNSA1czIuMjQgNSA1IDVoMTBjMi43NiAwIDUtMi4yNCA1LTVzLTIuMjQtNS01LTV2LTRjMC0yLjc2LTIuMjQtNS01LTV6bTAgM2MxLjY2IDAgMyAxLjM0IDMgM3MtMS4zNCAzLTMgMy0zLTEuMzQtMy0zIDEuMzQtMyAzLTN6bS04IDEyaDJ2M2gxMnYtM2gyYzEuMSAwIDItLjkgMi0ydi00YzAtMS4xLS45LTItMi0ySDZ2NnoiLz48L3N2Zz4=' },
        ]
    },
    {
        name: 'FontAwesome - Brands',
        shapes: [
            { name: 'Apple', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xNy41IDBDMTQuNzQgMCAxMi41MiAyLjI0IDEyLjUyIDVjMCAyLjc2IDIuMjIgNSA0Ljk4IDUgMi43NiAwIDUtMi4yNCA1LTVzLTIuMjQtNS01LTV6bS0xMSA2LjVjLTEuOTMgMC0zLjUgMS41Ny0zLjUgMy41czEuNTcgMy41IDMuNSAzLjVoMWMxLjkzIDAgMy41LTEuNTcgMy41LTMuNVM5LjQzIDYuNSA3LjUgNi41aC0xek0xOC41IDE3Yy0yLjQ5IDAtNC41IDIuMDEtNC41IDQuNXMzLjAxIDQuNSA1LjUgNC41YzEuNTIgMCAyLjg5LS43NCAzLjgxLTEuODkgMS4yOSAxLjQ3IDMuMjMgMi4zOSA1LjE5IDIuMzkgMy41OSAwIDYuNS0yLjkxIDYuNS02LjVTMTkuMDkgMTcgMTUuNSAxN3oiLz48L3N2Zz4=' },
            { name: 'Android', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik02LjUgOWgydjYuNUg2LjV6bS0zLTFoOHYxLjVoLTh6bTExIDBoMnY2LjVoLTJ6bS0zLTFoOHYxLjVoLTh6bS0yLjA5IDYuODljLjAyLS4wMi4wNS0uMDQuMDgtLjA3bDIuMzgtMi4zOGMuNDktLjQ5IDEuMjgtLjQ5IDEuNzcgMGwuNzEuNzFjLjQ5LjQ5LjQ5IDEuMjggMCAxLjc3bC0zLjIgMy4yYy0uNDkuNDktMS4yOC40OS0xLjc3IDBsLTYuMi02LjJjLS40OS0uNDktLjQ5LTEuMjggMC0xLjc3bC43MS0uNzFjLjQ5LS40OSAxLjI4LS40OSAxLjc3IDBMMTIgMTMuMTd6Ii8+PC9zdmc+' },
            { name: 'GitHub', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem00LjQyIDExLjQyYy0uMjcuNDYtLjc0LjY1LTEuMjguNDEtMS40Ny0uNjQtMi40Ny0xLjkzLTIuNDctMy4zNyAwLS40Mi4wNi0uODIuMTktMS4yMS4xOC0uNTQtLjA5LTEuMTMtLjY0LTEuMzEtLjU0LS4xOC0xLjEzLjA5LTEuMzEuNjRzLjA5IDEuMTMuNjQgMS4zMWMuNDYuMTcgMS4wMy40NCAxLjIzLjkxLjM0LjgyLjM0IDEuOCAwIDIuNjMtLjE5LjM5LS40NC43NS0uNzUgMS4wNi0uNDIuNDItMS4wNC42NS0xLjY3LjU0LS41NC0uMDktLjk5LS40Ni0xLjEtMS0uMTgtLjgxLjE2LTEuNjcuNzktMi4xOC42NC0uNTIgMS41NS0uNjIgMi4zLS4zNS41Ny4xOS44OS43My43IDEuMy0uMTkuNTctLjczLjg5LTEuMy43LS44Ni0uMy0xLjU1Ljc2LTEuMjUgMS42Mi4yOC44MSAxLjE4IDEuMiAxLjk4Ljg4LjUxLS4yMS44OC0uNzEuNzctMS4yMi0uMTQtLjU4LS43MS0uOTItMS4yNy0uNzUtLjYuMTctLjkyLjgtLjcyIDEuNC4xNC42LjcyIDEuMDQgMS4zNi45LjUxLS4xMi44OS0uNjEgMS0xLjExLjIxLS45Ni0uNDQtMS45NS0xLjQtMi4xOC0uODEtLjE4LTEuNjIuMTYtMi4xLjczLS41LjU4LS43MiAxLjM3LS41MyAyLjEzLjE4Ljc0Ljc3IDEuMjggMS41NCAxLjM0LjQ0LjA0Ljg4LS4xIDEuMjMtLjM3LjQ5LS4zNy44MS0uOTQuODEtMS41NiAwLS41My0uMjItMS4wNi0uNjEtMS40NC0uNDktLjUtMS4yMy0uNjQtMS44Ni0uMzUtLjYuMjYtLjkuODktLjY0IDEuNDkuMjYuNi44OS45IDEuNDkuNjQuNDYtLjIgMS4wOC0uNTUgMS40Ni0xLjA0LjQ0LS41Ny42OC0xLjI4LjY4LTIgMC0xLjE4LS42Mi0yLjItMS41LTIuNjEtLjY5LS4zMi0xLjQ3LS4yNi0yLjEuMTUtLjYuMzgtLjkxIDEuMDItLjggMS42OC4xMS42NC42NSAxLjEgMS4yNy45Ny42LS4xNCAxLS42Ny44NS0xLjI1LS4xMy0uNTgtLjY3LS45LTEuMjUtLjc3LS41Ny4xMy0uOTUuNjUtLjgxIDEuMjIuMTMuNTQuNjUuODYgMS4xOC43LjY3LjE0IDEuMy0uMjYgMS42LTEuMTYtLjAzIDEuMDQgMS4wMSAyLjI0IDIuNSAydi4wMWMxLjA3LjY0IDEuNjcgMS44NCAxLjY3IDMuMDggMCAuNjQtLjI1IiAxLjI1LS42NyAxLjY3eiIvPjwvc3ZnPg==' },
            { name: 'Twitter (X)', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xOC4yNDQgMi4yNDRsLTMuNTM2IDMuNTM2TDEyIDEwLjQ4NWwtMi43MDcgMi43MDcgMy41MzYgMy41MzYgMy41MzYtMy41MzYgMi43MDctMi43MDctMy41MzYtMy41MzZ6TTUuNzU2IDE4LjI0NGwzLjUzNi0zLjUzNkwxMiAxMC40ODVsMi43MDcgMi43MDctMy41MzYgMy41MzYtMy41MzYtMy41MzYtMi43MDctMi43MDcgMy41MzYtMy41MzZ6Ii8+PC9zdmc+' },
            { name: 'Facebook', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik01IDNoMTRjMS4xIDAgMiAuOSAyIDJ2MTRjMCAxLjEtLjkgMi0yIDJIMThWOS41aDJMNjIgMTFINjB2MTFINGMtMS4xIDAtMi0uOS0yLTJ2LTdoMWMxLjEgMCAyLS45IDItMnYtM2MwLS41NS0uNDUtMS0xLTF6TTE1IDVoMi41bC0yIDEtMS0yek05IDloMnYyaC0yeiIvPjwvc3ZnPg==' },
            { name: 'Instagram', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik03LjggMmMtMS40OCAwLTIuNjggMS4yLTIuNjggMi42OHYxNC42NGMwIDEuNDggMS4yIDIuNjggMi42OCAyLjY4aDguNGMxLjQ4IDAgMi42OC0xLjIgMi42OC0yLjY4VjQuNjhjMC0xLjQ4LTEuMi0yLjY4LTIuNjgtMi42OEg3Ljh6bS0uMzIgNGgxMy4wNGwuMDEgMTEuMDVjMCAuMzUtLjI4LjYzLS42My42M0g4LjEyYy0uMzUgMC0uNjMtLjI4LS42My0uNjNWNnoiLz48L3N2Zz4=' },
            { name: 'Windows', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0zIDNoOHY4SDN6bTAgMTBoOHY4SDN6bTEwLTBoOHY4aC04em0wIDEwaDh2OGgtOHoiLz48L3N2Zz4=' },
            { name: 'Bitcoin', dataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0xIDE1SDExdi0yaDJ2MnptMC00SDExVjloMnYyem0tMS4yNS00LjI1aDIuNWMuODMgMCAxLjUuNjcgMS41IDEuNXMtLjY3IDEuNS0xLjUgMS41aC0yLjV2LTN6bS0zLjUgOGgyLjVjLjgzIDAgMS41LjY3IDEuNSAxLjVzLS42NyAxLjUtMS41IDEuNWgtMi41di0zeiIvPjwvc3ZnPg==' },
        ]
    }
];
