/**
 * KhanNetra PPE Vision — Gemini Vision Backend
 *
 * Uses Google Gemini 1.5 Flash Vision to analyse an image and
 * identify mine-worker PPE.  Returns a normalised DetectionResult.
 *
 * To swap this out for a local YOLO model, set MODEL_BACKEND=yolo_onnx
 * in your .env and place the model at YOLO_MODEL_PATH.
 */

'use strict';

const https  = require('https');
const { PPE_ITEMS } = require('../ppeConfig');

const MODEL_NAME    = 'gemini-3.6-flash';
const MODEL_VERSION = '3.6-flash';

/* ── Prompt ───────────────────────────────────────────────────────────────── */
const buildPrompt = () => `
You are an AI safety compliance system for Indian coal mines, built for the Directorate General of Mines Safety (DGMS).

Analyse the provided image and detect all mine workers and their Personal Protective Equipment (PPE).

For EACH distinct worker visible in the image, output a JSON block.

PPE items to detect (use EXACTLY these IDs):
- helmet           → hard hat / mining helmet
- safety_vest      → high-visibility vest or reflective jacket
- safety_boots     → safety boots / gumboots (may be partially visible)
- goggles          → safety goggles / face shield / eye protection
- gloves           → safety gloves (any colour)
- ear_protection   → earmuffs or earplugs
- respiratory_mask → dust mask, N95, half-face or full-face respirator
- safety_lamp      → mine cap lamp or hand-held safety lamp

Rules:
1. DO NOT identify or describe the worker's face, identity, race, gender or age.
2. If no workers are visible, return an empty workers array.
3. Assign a confidence score (0.0–1.0) for each PPE item you detect.
4. Only include items you are reasonably confident (>0.40) are present.
5. If the image is blurry, poorly lit, or the worker is partially visible, reflect this in lower confidence scores.
6. Output ONLY valid JSON — no markdown, no explanation, no extra text.

Response format (strict JSON):
{
  "scene_description": "brief 1-sentence description of the scene (no faces/identities)",
  "lighting_quality": "good|fair|poor",
  "worker_count": <number>,
  "workers": [
    {
      "worker_id": 1,
      "position_in_frame": "left|center|right|full_frame",
      "visibility": "full|partial|obscured",
      "detected_ppe": ["helmet", "safety_vest"],
      "confidence_scores": {
        "helmet": 0.95,
        "safety_vest": 0.88
      }
    }
  ]
}
`.trim();

/* ── Gemini API call with retry ───────────────────────────────────────────── */
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

async function callGeminiVision(imageBase64, prompt, modelIndex = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const modelName = FALLBACK_MODELS[modelIndex] || FALLBACK_MODELS[0];

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: 'image/jpeg',
            data: imageBase64,
          },
        },
      ],
    }],
    generationConfig: {
      temperature:     0.1,
      maxOutputTokens: 1024,
      topP:            0.8,
      topK:            20,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  });

  const apiPath = `/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path:     apiPath,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    let data = '';
    const req = https.request(options, (res) => {
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            const errMsg = json.error.message || '';
            // Retry with fallback model for availability errors
            const isAvailability = /high demand|not found|no longer available|not supported/i.test(errMsg);
            if (isAvailability && modelIndex < FALLBACK_MODELS.length - 1) {
              console.log(`[PPE Vision] Model ${modelName} unavailable, trying fallback...`);
              callGeminiVision(imageBase64, prompt, modelIndex + 1).then(resolve).catch(reject);
              return;
            }
            return reject(new Error(`Gemini API error: ${errMsg}`));
          }
          // Attach which model actually responded
          json._model_used = modelName;
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(28000, () => { req.destroy(); reject(new Error('Gemini API timeout')); });
    req.write(body);
    req.end();
  });
}

/* ── Parse Gemini text output into structured result ─────────────────────── */
function parseGeminiResponse(text) {
  // Strip any markdown code fences if present
  let clean = text.trim();
  clean = clean.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    // Try extracting JSON object from surrounding text
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No valid JSON found in model response');
    parsed = JSON.parse(match[0]);
  }
  return parsed;
}

/* ── Normalise a single worker record ────────────────────────────────────── */
function normaliseWorker(raw, workerId) {
  const validIds      = Object.keys(PPE_ITEMS);
  const detectedPpe   = (raw.detected_ppe || []).filter(id => validIds.includes(id));
  const rawScores     = raw.confidence_scores || {};
  const confidenceScores = {};

  for (const id of validIds) {
    confidenceScores[id] = detectedPpe.includes(id)
      ? Math.round(Math.min(1, Math.max(0, parseFloat(rawScores[id] || 0.7))) * 100) / 100
      : 0;
  }

  return {
    worker_id:         workerId,
    position_in_frame: raw.position_in_frame || 'unknown',
    visibility:        raw.visibility        || 'full',
    detected_ppe:      detectedPpe,
    confidence_scores: confidenceScores,
    raw_detections:    raw,
  };
}

/* ── Main export ──────────────────────────────────────────────────────────── */
/**
 * @param {Buffer} imageBuffer  – JPEG buffer (already preprocessed)
 * @param {string} mimeType     – always 'image/jpeg' after preprocessing
 * @param {object} options      – { mine_type, min_confidence }
 * @returns {Promise<DetectionResult>}
 */
async function detect(imageBuffer, mimeType, options = {}) {
  const imageBase64 = imageBuffer.toString('base64');
  const prompt      = buildPrompt();

  const geminiResponse = await callGeminiVision(imageBase64, prompt);
  const actualModel    = geminiResponse._model_used || MODEL_NAME;

  const candidate = geminiResponse?.candidates?.[0];
  if (!candidate) throw new Error('No candidate returned from Gemini');

  const finishReason = candidate.finishReason;
  if (finishReason === 'SAFETY') throw new Error('Image rejected by safety filters');

  const rawText = candidate?.content?.parts?.[0]?.text || '';
  if (!rawText) throw new Error('Empty response from Gemini Vision');

  const parsed = parseGeminiResponse(rawText);

  const workers = (parsed.workers || []).map((w, i) => normaliseWorker(w, i + 1));

  return {
    workers,
    scene_info: {
      description:     parsed.scene_description  || 'Mine site image',
      lighting:        parsed.lighting_quality   || 'unknown',
      worker_count:    parsed.worker_count       ?? workers.length,
    },
    model_info: {
      name:    actualModel,
      version: actualModel,
      backend: 'gemini_vision',
    },
  };
}

module.exports = { detect };
