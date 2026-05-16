// Pigsmith — paint scheme generator
// Calls Gemini 2.0 Flash with optional reference image, returns a structured paint recipe.

const GEMINI_MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are Pigsmith, an expert miniature paint scheme advisor. You generate detailed, layer-by-layer paint recipes for tabletop miniatures (Warhammer, Bolt Action, D&D, Star Wars Legion, etc.).

CRITICAL OUTPUT RULES:
1. Return ONLY a single JSON object — no markdown fences, no commentary, no preamble.
2. Schema:
{
  "eyebrow": "1-3 word category, e.g. 'Roman legionary' or 'Crimson space marine'",
  "title": "Catchy scheme name, 2-5 words",
  "summary": "1-2 sentence description of the overall feel",
  "zones": [
    {
      "name": "Zone name (Armour, Cloth, Skin, Weapon, Base, etc.)",
      "description": "What this zone covers on the mini",
      "swatch_hex": "#RRGGBB — the dominant colour for this zone",
      "layers": [
        {
          "step": "Basecoat" | "Wash" | "Layer" | "Highlight" | "Edge",
          "name": "Descriptive name of this layer's colour",
          "note": "Optional — 1 short sentence on how to apply",
          "brands": [
            {"brand": "Citadel", "paint": "Macragge Blue"},
            {"brand": "Vallejo", "paint": "Magic Blue (72.021)"},
            {"brand": "Army Painter", "paint": "Crystal Blue"},
            {"brand": "Scale75", "paint": "Mediterranean Blue"}
          ]
        }
      ],
      "technique": "1-2 sentence technique note for this zone (drybrush, glaze, wet-blend, etc.)"
    }
  ]
}

REQUIREMENTS:
- Generate 3-5 zones depending on the subject.
- Each zone needs 3-5 layers (basecoat through edge highlight).
- ALWAYS include all 4 brand cross-references per layer. Use real paint names. If unsure, use closest match by hue.
- Use exact hex codes that match the colour you're describing.
- Be specific in technique notes — painters know terms like "stippling", "edge highlight", "glaze", "wet-blend", "two-thin-coats".`;

const FALLBACK_RECIPE = {
  eyebrow: 'Demo · Roman legionary',
  title: 'Bronze of the IX Legion',
  summary: 'A historically-inspired Roman legionary scheme. Weathered bronze armour, deep red tunic, and dusty leather — the look of marching for weeks, not parade-ground gloss.',
  zones: [
    {
      name: 'Lorica Segmentata',
      description: 'Plate armour banding across torso and shoulders.',
      swatch_hex: '#A58853',
      layers: [
        { step: 'Basecoat', name: 'Bronze Brown',
          note: 'Two thin coats over a black undercoat.',
          brands: [
            { brand: 'Citadel', paint: 'Hashut Copper' },
            { brand: 'Vallejo', paint: 'Brass (72.057)' },
            { brand: 'Army Painter', paint: 'Weapon Bronze' },
            { brand: 'Scale75', paint: 'Necro Gold' }
          ] },
        { step: 'Wash', name: 'Verdigris Wash',
          note: 'Thin and pool into recesses; do not flood.',
          brands: [
            { brand: 'Citadel', paint: 'Nihilakh Oxide' },
            { brand: 'Vallejo', paint: 'Game Color Green Wash' },
            { brand: 'Army Painter', paint: 'Soft Tone Ink' },
            { brand: 'Scale75', paint: 'Inkdal Tone (Verde)' }
          ] },
        { step: 'Highlight', name: 'Polished Bronze',
          note: 'Stipple onto raised plate edges.',
          brands: [
            { brand: 'Citadel', paint: 'Sycorax Bronze' },
            { brand: 'Vallejo', paint: 'Bright Bronze (72.058)' },
            { brand: 'Army Painter', paint: 'Greedy Gold' },
            { brand: 'Scale75', paint: 'Citrine Alchemy' }
          ] },
        { step: 'Edge', name: 'Pale Gold edge',
          note: 'Fine line on the very top edges of each band.',
          brands: [
            { brand: 'Citadel', paint: 'Liberator Gold' },
            { brand: 'Vallejo', paint: 'Old Gold (70.878)' },
            { brand: 'Army Painter', paint: 'Light Gold' },
            { brand: 'Scale75', paint: 'White Alchemy' }
          ] }
      ],
      technique: 'Drybrush the bronze highlight then come back with a fine edge highlight for that polished-where-it-rubs effect.'
    },
    {
      name: 'Tunic',
      description: 'Wool tunic under the armour, sleeves and skirt.',
      swatch_hex: '#7A2A24',
      layers: [
        { step: 'Basecoat', name: 'Oxblood Red',
          brands: [
            { brand: 'Citadel', paint: 'Khorne Red' },
            { brand: 'Vallejo', paint: 'Cavalry Brown (70.982)' },
            { brand: 'Army Painter', paint: 'Dragon Red' },
            { brand: 'Scale75', paint: 'Pyrrole Red' }
          ] },
        { step: 'Wash', name: 'Sepia Wash',
          brands: [
            { brand: 'Citadel', paint: 'Agrax Earthshade' },
            { brand: 'Vallejo', paint: 'Sepia Wash (76.519)' },
            { brand: 'Army Painter', paint: 'Strong Tone Ink' },
            { brand: 'Scale75', paint: 'Inkwood Tone' }
          ] },
        { step: 'Layer', name: 'Sun-faded Red',
          note: 'Brushed onto the upper flat areas, leaving recesses dark.',
          brands: [
            { brand: 'Citadel', paint: 'Wazdakka Red' },
            { brand: 'Vallejo', paint: 'Gory Red (72.011)' },
            { brand: 'Army Painter', paint: 'Pure Red' },
            { brand: 'Scale75', paint: 'Carmine Alchemy' }
          ] },
        { step: 'Highlight', name: 'Dusty Pink edge',
          brands: [
            { brand: 'Citadel', paint: 'Wild Rider Red' },
            { brand: 'Vallejo', paint: 'Salmon Rose (70.835)' },
            { brand: 'Army Painter', paint: 'Demonic Yellow + Dragon Red' },
            { brand: 'Scale75', paint: 'Skin Genesis' }
          ] }
      ],
      technique: 'Glaze the deepest folds with a thinned wash so the wool reads as worn, not new.'
    },
    {
      name: 'Leather Belts & Sandals',
      description: 'Belts, scabbard, and caligae sandals.',
      swatch_hex: '#5C3A22',
      layers: [
        { step: 'Basecoat', name: 'Saddle Brown',
          brands: [
            { brand: 'Citadel', paint: 'Mournfang Brown' },
            { brand: 'Vallejo', paint: 'Flat Brown (70.984)' },
            { brand: 'Army Painter', paint: 'Leather Brown' },
            { brand: 'Scale75', paint: 'Burnt Brown Red' }
          ] },
        { step: 'Wash', name: 'Earthshade',
          brands: [
            { brand: 'Citadel', paint: 'Agrax Earthshade' },
            { brand: 'Vallejo', paint: 'Umber Wash' },
            { brand: 'Army Painter', paint: 'Strong Tone Ink' },
            { brand: 'Scale75', paint: 'Inkwood Tone' }
          ] },
        { step: 'Highlight', name: 'Worn Tan',
          brands: [
            { brand: 'Citadel', paint: 'Skrag Brown' },
            { brand: 'Vallejo', paint: 'Cork Brown (70.843)' },
            { brand: 'Army Painter', paint: 'Tanned Flesh' },
            { brand: 'Scale75', paint: 'Heavy Skintone' }
          ] }
      ],
      technique: 'Drybrush very lightly — leather is matte, not glossy.'
    },
    {
      name: 'Skin',
      description: 'Face, arms, and lower legs.',
      swatch_hex: '#C49A6C',
      layers: [
        { step: 'Basecoat', name: 'Mediterranean Tan',
          brands: [
            { brand: 'Citadel', paint: 'Bugmans Glow' },
            { brand: 'Vallejo', paint: 'Tan Earth (70.874)' },
            { brand: 'Army Painter', paint: 'Tanned Flesh' },
            { brand: 'Scale75', paint: 'Heavy Skintone' }
          ] },
        { step: 'Wash', name: 'Reikland Wash',
          brands: [
            { brand: 'Citadel', paint: 'Reikland Fleshshade' },
            { brand: 'Vallejo', paint: 'Flesh Wash' },
            { brand: 'Army Painter', paint: 'Soft Tone Ink' },
            { brand: 'Scale75', paint: 'Inkflesh Tone' }
          ] },
        { step: 'Layer', name: 'Warm Flesh',
          brands: [
            { brand: 'Citadel', paint: 'Cadian Fleshtone' },
            { brand: 'Vallejo', paint: 'Medium Fleshtone (70.860)' },
            { brand: 'Army Painter', paint: 'Barbarian Flesh' },
            { brand: 'Scale75', paint: 'Mid Skintone' }
          ] },
        { step: 'Highlight', name: 'Sun-kissed Highlight',
          brands: [
            { brand: 'Citadel', paint: 'Kislev Flesh' },
            { brand: 'Vallejo', paint: 'Basic Skintone' },
            { brand: 'Army Painter', paint: 'Skeleton Bone' },
            { brand: 'Scale75', paint: 'Light Skintone' }
          ] }
      ],
      technique: 'Build up flesh in glazes — cheekbones, nose, brow ridge get the highest highlight.'
    },
    {
      name: 'Base',
      description: 'Roman road / dusty ground.',
      swatch_hex: '#8B7355',
      layers: [
        { step: 'Basecoat', name: 'Dust Brown',
          brands: [
            { brand: 'Citadel', paint: 'XV-88' },
            { brand: 'Vallejo', paint: 'English Uniform (70.921)' },
            { brand: 'Army Painter', paint: 'Desert Yellow' },
            { brand: 'Scale75', paint: 'Sand Yellow' }
          ] },
        { step: 'Drybrush', name: 'Pale Stone',
          brands: [
            { brand: 'Citadel', paint: 'Karak Stone' },
            { brand: 'Vallejo', paint: 'Iraqi Sand (70.819)' },
            { brand: 'Army Painter', paint: 'Skeleton Bone' },
            { brand: 'Scale75', paint: 'Light Sand' }
          ] }
      ],
      technique: 'Stipple a tiny amount of dust pigment onto the lower part of the legs to tie the mini to the base.'
    }
  ]
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return cors(204, '');
  }
  if (event.httpMethod !== 'POST') {
    return cors(405, JSON.stringify({ error: 'POST only' }));
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return cors(400, JSON.stringify({ error: 'Invalid JSON' })); }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return cors(200, JSON.stringify({ ...FALLBACK_RECIPE, _demo: true, _reason: 'GEMINI_API_KEY missing — returning demo recipe' }));
  }

  const notes = (body.notes || '').slice(0, 800);
  const brand = body.brand || 'any';
  const miniType = body.mini_type || 'generic';
  const imageDataUrl = body.image || null;

  const userPrompt = buildUserPrompt({ notes, brand, miniType, hasImage: !!imageDataUrl });

  const parts = [{ text: userPrompt }];
  if (imageDataUrl) {
    const inline = parseDataUrl(imageDataUrl);
    if (inline) parts.unshift({ inline_data: inline });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: 'user', parts }],
    systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = (data && data.error && data.error.message) || `Gemini HTTP ${res.status}`;
      console.error('Gemini error:', errMsg);
      return cors(200, JSON.stringify({ ...FALLBACK_RECIPE, _demo: true, _reason: errMsg }));
    }
    const text = extractText(data);
    let parsed;
    try { parsed = JSON.parse(text); }
    catch {
      console.error('JSON parse failed for Gemini output:', text && text.slice(0, 200));
      return cors(200, JSON.stringify({ ...FALLBACK_RECIPE, _demo: true, _reason: 'AI returned non-JSON; showing demo recipe' }));
    }
    if (!parsed || !Array.isArray(parsed.zones)) {
      return cors(200, JSON.stringify({ ...FALLBACK_RECIPE, _demo: true, _reason: 'AI returned unexpected shape; showing demo recipe' }));
    }
    return cors(200, JSON.stringify(parsed));
  } catch (err) {
    console.error('analyze error:', err);
    return cors(200, JSON.stringify({ ...FALLBACK_RECIPE, _demo: true, _reason: err.message || 'Network error' }));
  }
};

function buildUserPrompt({ notes, brand, miniType, hasImage }) {
  const brandPref = brand === 'any'
    ? 'Show paint cross-references across all 4 brands (Citadel, Vallejo, Army Painter, Scale75) for every layer.'
    : `The painter prefers ${brand}. Lead each layer with the ${brand} paint, but still include the other 3 brand cross-references.`;
  const miniHint = miniType !== 'generic' ? `The mini is a ${miniType.replace(/_/g, ' ')}. Tailor the zones accordingly.` : 'Identify the mini type from the reference.';
  const refSource = hasImage
    ? 'Use the uploaded reference image as the primary source of colour and composition.'
    : 'Use only the description below — no image was provided.';
  const notesLine = notes ? `\n\nPainter's notes: ${notes}` : '';
  return `${refSource}\n${miniHint}\n${brandPref}${notesLine}\n\nGenerate the paint scheme as a JSON object matching the schema. Do not include markdown fences.`;
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime_type: match[1], data: match[2] };
}

function extractText(data) {
  try {
    const cands = data.candidates || [];
    const parts = (cands[0] && cands[0].content && cands[0].content.parts) || [];
    return parts.map(p => p.text || '').join('');
  } catch { return ''; }
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body
  };
}
