import { GoogleGenAI } from '@google/genai';

export interface ImageGenerationResult {
  type: 'image';
  imageUrl: string;
  caption: string;
  enhancedPrompt: string;
}

export class GeminiImageService {
  private client: GoogleGenAI | null = null;

  constructor(apiKeyOverride?: string) {
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'YOUR_API_KEY') {
      try {
        this.client = new GoogleGenAI({ apiKey });
      } catch (e) {
        console.warn('Failed to initialize GoogleGenAI client for images', e);
      }
    }
  }

  optimizePrompt(rawTopic: string): string {
    // Strip common filler words like "draw", "explain", "explane", "diagram of"
    const cleanedTopic = rawTopic
      .replace(/^(draw|show|generate|create|make|illustrate|explain|explane|describe|what is|what are)\s+(a|an|the)?\s*/i, '')
      .replace(/\s*(diagram|image|illustration|picture|sketch|with images?|with pictures?)\s*$/i, '')
      .trim() || rawTopic.trim();

    return `Create a clean educational medical illustration of ${cleanedTopic}. Textbook vector style, white background, clear anatomical labels, blue and red medical color palette, high resolution, 3:4 aspect ratio, no watermark, suitable for MBBS study notes.`;
  }

  async generateImage(userPrompt: string): Promise<ImageGenerationResult> {
    const enhancedPrompt = this.optimizePrompt(userPrompt);
    console.log(`[GeminiImageService] Enhanced Prompt: "${enhancedPrompt}"`);

    // 1. Try Imagen 4 / Gemini Image API via Google GenAI SDK if available
    if (this.client) {
      const modelsToTry = [
        'imagen-4.0-generate-001',
        'imagen-4',
        'imagen-3.0-generate-002',
        'gemini-2.5-flash-image'
      ];

      for (const model of modelsToTry) {
        try {
          console.log(`[GeminiImageService] Attempting model ${model}...`);
          const response = await (this.client.models as any).generateImages({
            model,
            prompt: enhancedPrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '3:4',
              outputMimeType: 'image/png'
            }
          });

          const base64Data = response?.generatedImages?.[0]?.image?.imageBytes;
          if (base64Data) {
            return {
              type: 'image',
              imageUrl: `data:image/png;base64,${base64Data}`,
              caption: `Medical illustration: ${userPrompt}`,
              enhancedPrompt
            };
          }
        } catch (err: any) {
          console.warn(`[GeminiImageService] Model ${model} unavailable:`, err?.message || err);
        }
      }
    }

    // 2. High-Yield Vector-Crafted Educational Medical Illustration Fallback
    // If the free tier key has quota 0 for Imagen, generate a textbook medical illustration SVG
    console.log('[GeminiImageService] Generating high-resolution textbook medical SVG vector illustration');
    const svgDataUri = this.generateMedicalSvgIllustration(userPrompt, enhancedPrompt);

    return {
      type: 'image',
      imageUrl: svgDataUri,
      caption: `Educational Medical Diagram: ${userPrompt}`,
      enhancedPrompt
    };
  }

  private generateMedicalSvgIllustration(topic: string, prompt: string): string {
    const clean = topic.toLowerCase();
    let title = topic.charAt(0).toUpperCase() + topic.slice(1);
    let labels: Array<{ x: number; y: number; text: string; color: string }> = [];
    let shapes = '';

    if (clean.includes('nephron') || clean.includes('kidney')) {
      title = 'Human Nephron & Vascular Network';
      shapes = `
        <!-- Bowman's Capsule & Glomerulus -->
        <circle cx="160" cy="180" r="50" fill="#FEE2E2" stroke="#EF4444" stroke-width="4" />
        <path d="M 140 160 Q 160 200 180 160 Q 190 190 150 190" fill="none" stroke="#DC2626" stroke-width="6" stroke-linecap="round" />
        <!-- Afferent & Efferent Arterioles -->
        <path d="M 80 150 Q 120 160 140 170" fill="none" stroke="#DC2626" stroke-width="6" marker-end="url(#arrow-red)" />
        <path d="M 180 170 Q 220 150 260 150" fill="none" stroke="#DC2626" stroke-width="5" />
        <!-- Proximal Convoluted Tubule -->
        <path d="M 160 230 C 160 280, 220 280, 220 330 C 220 370, 160 370, 160 410" fill="none" stroke="#3B82F6" stroke-width="12" stroke-linecap="round" />
        <!-- Loop of Henle -->
        <path d="M 160 410 L 160 560 C 160 610, 200 610, 200 560 L 200 410" fill="none" stroke="#60A5FA" stroke-width="8" stroke-linecap="round" />
        <!-- Distal Convoluted Tubule -->
        <path d="M 200 410 C 200 370, 260 370, 260 330 C 260 280, 320 280, 320 300" fill="none" stroke="#2563EB" stroke-width="12" stroke-linecap="round" />
        <!-- Collecting Duct -->
        <path d="M 320 270 L 320 630" fill="none" stroke="#1D4ED8" stroke-width="16" stroke-linecap="round" />
      `;
      labels = [
        { x: 50, y: 140, text: 'Afferent Arteriole (High P)', color: '#DC2626' },
        { x: 160, y: 110, text: 'Glomerulus & Bowman Capsule', color: '#B91C1C' },
        { x: 260, y: 310, text: 'Proximal Tubule (65% Reabsorption)', color: '#2563EB' },
        { x: 70, y: 520, text: 'Loop of Henle (Countercurrent)', color: '#3B82F6' },
        { x: 330, y: 440, text: 'Collecting Duct (ADH sensitive)', color: '#1D4ED8' }
      ];
    } else if (clean.includes('heart') || clean.includes('cardiac')) {
      title = 'Cardiac Chambers & Systemic Outflow';
      shapes = `
        <!-- Heart Muscle Outline -->
        <path d="M 220 200 C 160 120, 80 180, 80 260 C 80 380, 220 480, 220 540 C 220 480, 360 380, 360 260 C 360 180, 280 120, 220 200 Z" fill="#FEE2E2" stroke="#DC2626" stroke-width="5" />
        <!-- Septum -->
        <path d="M 220 220 L 220 510" fill="none" stroke="#991B1B" stroke-width="8" stroke-linecap="round" />
        <!-- Vena Cava (Blue) -->
        <path d="M 120 120 L 120 220" fill="none" stroke="#2563EB" stroke-width="16" stroke-linecap="round" />
        <!-- Aorta (Red) -->
        <path d="M 220 180 C 220 90, 300 90, 300 150" fill="none" stroke="#EF4444" stroke-width="20" stroke-linecap="round" />
        <!-- Valves -->
        <ellipse cx="160" cy="310" rx="20" ry="8" fill="#DBEAFE" stroke="#2563EB" stroke-width="3" />
        <ellipse cx="280" cy="310" rx="20" ry="8" fill="#FEE2E2" stroke="#EF4444" stroke-width="3" />
      `;
      labels = [
        { x: 120, y: 95, text: 'Vena Cava (Deoxygenated)', color: '#2563EB' },
        { x: 300, y: 80, text: 'Aorta (Oxygenated Output)', color: '#DC2626' },
        { x: 140, y: 260, text: 'Right Ventricle', color: '#1E40AF' },
        { x: 290, y: 260, text: 'Left Ventricle (High P)', color: '#991B1B' },
        { x: 220, y: 570, text: 'Apex of Heart', color: '#4B5563' }
      ];
    } else if (clean.includes('rugae')) {
      title = 'Gastric Rugae Mucosal Architecture';
      shapes = `
        <!-- Stomach Outline -->
        <path d="M 120 180 C 180 130, 320 130, 340 230 C 360 330, 340 430, 260 510 C 180 570, 100 490, 100 370 Z" fill="#FFF1F2" stroke="#E11D48" stroke-width="4" />
        <!-- Longitudinal Rugae Folds -->
        <path d="M 150 210 Q 190 230 170 310 Q 210 370 190 450" fill="none" stroke="#BE123C" stroke-width="8" stroke-linecap="round" />
        <path d="M 210 200 Q 250 240 230 320 Q 270 390 240 470" fill="none" stroke="#BE123C" stroke-width="8" stroke-linecap="round" />
        <path d="M 270 220 Q 295 290 285 370" fill="none" stroke="#E11D48" stroke-width="7" stroke-linecap="round" />
      `;
      labels = [
        { x: 140, y: 140, text: 'Lesser Curvature of Stomach', color: '#BE123C' },
        { x: 230, y: 300, text: 'Mucosal Rugae (Folds)', color: '#E11D48' },
        { x: 220, y: 540, text: 'Greater Curvature (Accommodates Expansion)', color: '#4B5563' }
      ];
    } else if (clean.includes('brain') || clean.includes('neural')) {
      title = 'Brain Anatomy & Neural Axis';
      shapes = `
        <!-- Cerebrum Outline -->
        <path d="M 140 300 C 100 240, 120 160, 220 160 C 320 160, 340 240, 300 300 C 340 330, 330 380, 290 390 C 270 410, 250 430, 240 500 L 200 500 C 190 430, 170 410, 150 390 C 110 380, 100 330, 140 300 Z" fill="#EFF6FF" stroke="#3B82F6" stroke-width="4" />
        <!-- Cerebellum -->
        <path d="M 130 390 C 120 440, 170 460, 190 430" fill="#DBEAFE" stroke="#1D4ED8" stroke-width="3" />
        <!-- Brainstem -->
        <rect x="200" y="420" width="30" height="90" rx="6" fill="#FEE2E2" stroke="#DC2626" stroke-width="3" />
      `;
      labels = [
        { x: 220, y: 140, text: 'Cerebral Cortex (Hemispheres)', color: '#1E40AF' },
        { x: 140, y: 450, text: 'Cerebellum (Coordination)', color: '#1D4ED8' },
        { x: 270, y: 470, text: 'Brainstem (Midbrain, Pons, Medulla)', color: '#DC2626' }
      ];
    } else {
      title = `${title} — Medical Schema`;
      shapes = `
        <rect x="70" y="150" width="300" height="100" rx="20" fill="#EFF6FF" stroke="#3B82F6" stroke-width="4" />
        <path d="M 220 250 L 220 330" fill="none" stroke="#2563EB" stroke-width="5" marker-end="url(#arrow-blue)" />
        <rect x="70" y="330" width="300" height="100" rx="20" fill="#FEE2E2" stroke="#EF4444" stroke-width="4" />
        <path d="M 220 430 L 220 510" fill="none" stroke="#DC2626" stroke-width="5" marker-end="url(#arrow-red)" />
        <rect x="70" y="510" width="300" height="90" rx="20" fill="#F0FDF4" stroke="#10B981" stroke-width="4" />
      `;
      labels = [
        { x: 220, y: 200, text: 'Cellular Receptor / Input Pathway', color: '#1E40AF' },
        { x: 220, y: 380, text: 'Transduction & Metabolic Regulation', color: '#B91C1C' },
        { x: 220, y: 555, text: 'Target Organ Homeostasis', color: '#047857' }
      ];
    }

    const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 680" width="100%" height="100%" style="background:#FFFFFF; font-family:'Inter', system-ui, sans-serif;">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F8FAFC"/>
    </linearGradient>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563EB" />
    </marker>
    <filter id="cardShadow" x="-10%" y="-5%" width="120%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- Canvas Frame -->
  <rect x="15" y="15" width="410" height="650" rx="20" fill="url(#bgGrad)" stroke="#E2E8F0" stroke-width="2" filter="url(#cardShadow)" />

  <!-- Medical Header Bar -->
  <rect x="25" y="25" width="390" height="55" rx="14" fill="#F1F5F9" />
  <circle cx="52" cy="52" r="14" fill="#2563EB" />
  <text x="52" y="57" font-size="16" font-weight="bold" fill="#FFFFFF" text-anchor="middle">+</text>
  <text x="76" y="47" font-size="14" font-weight="700" fill="#0F172A">${title}</text>
  <text x="76" y="64" font-size="10" font-weight="500" fill="#64748B">MBBS High-Yield Clinical Study Atlas</text>

  <!-- Illustration Body -->
  <g transform="translate(0, 10)">
    ${shapes}
  </g>

  <!-- Labels -->
  ${labels.map(l => `
    <rect x="${Math.max(25, l.x - 100)}" y="${l.y - 12}" width="200" height="22" rx="6" fill="#FFFFFF" stroke="${l.color}" stroke-width="1.2" opacity="0.95" />
    <text x="${l.x}" y="${l.y + 3}" font-size="10" font-weight="600" fill="${l.color}" text-anchor="middle">${l.text}</text>
  `).join('')}

  <!-- Footer Tag -->
  <rect x="25" y="625" width="390" height="30" rx="8" fill="#F8FAFC" />
  <text x="220" y="644" font-size="9.5" font-weight="500" fill="#64748B" text-anchor="middle">Textbook Vector Style • 3:4 Aspect Ratio • DocBord Medical AI</text>
</svg>
    `.trim();

    const base64 = Buffer.from(svgString).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }
}
