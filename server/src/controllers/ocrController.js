'use strict';
/**
 * KhanNetra OCR Controller
 * Uses Gemini Vision to extract compliance information from uploaded documents.
 * Supports: PDF page images, scanned certificates, inspection reports, licenses.
 */
const fs   = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const { v4: uuid } = require('uuid');
const { query } = require('../config/database');

const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];

async function callGeminiOCR(imageBase64, docType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here')
    throw new Error('GEMINI_API_KEY not configured');

  const prompt = `You are a document OCR and compliance information extractor for Indian coal mine governance.

Analyse this document image and extract the following information in strict JSON format.

Document type hint: "${docType}"

Extract:
{
  "document_type": "License/Certificate/Permit/Report/Other",
  "document_number": "extracted document number or null",
  "title": "document title",
  "issuing_authority": "issuing organisation name",
  "issue_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "holder_name": "person or company name on document",
  "mine_name": "mine name if mentioned",
  "key_conditions": ["array of important conditions or requirements mentioned"],
  "compliance_items": [
    { "item": "compliance requirement", "status": "compliant/non_compliant/pending/unknown", "deadline": "YYYY-MM-DD or null" }
  ],
  "violations_mentioned": ["array of any violations or non-compliances mentioned"],
  "regulatory_references": ["list of acts/regulations referenced e.g. CMR 2017, Mines Act 1952"],
  "summary": "2-3 sentence plain English summary of what this document is and its compliance status",
  "confidence": 0.95,
  "warnings": ["any issues with document clarity, missing info, etc."]
}

Return ONLY valid JSON. No markdown. No explanation.`;

  const bodyObj = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    const body  = JSON.stringify(bodyObj);
    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: 'generativelanguage.googleapis.com',
        path:     `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      let data = '';
      const req = https.request(opts, (res) => {
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j.error) {
              const msg = j.error.message || '';
              if (/not found|no longer available|not supported|high demand/i.test(msg) && i < FALLBACK_MODELS.length - 1)
                return resolve({ retry: true });
              return reject(new Error(`Gemini: ${msg}`));
            }
            resolve({ text: j.candidates?.[0]?.content?.parts?.[0]?.text || '', model });
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Gemini timeout')); });
      req.write(body); req.end();
    });
    if (result.retry) continue;
    return result;
  }
  throw new Error('All Gemini models unavailable');
}

function parseExtraction(text) {
  let clean = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); }
  catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse JSON from model response');
  }
}

exports.extractDocument = async (req, res, next) => {
  let tempPath = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Document image required (JPEG/PNG)' });
    tempPath = req.file.path;

    const docType   = req.body.doc_type    || 'Unknown';
    const documentId= req.body.document_id || null;
    const mineId    = req.body.mine_id     || null;

    // Preprocess: resize to max 1024px, convert to JPEG
    const processed = await sharp(fs.readFileSync(tempPath))
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();

    const base64 = processed.toString('base64');
    const { text, model } = await callGeminiOCR(base64, docType);

    let extracted;
    try { extracted = parseExtraction(text); }
    catch { extracted = { summary: 'OCR extraction partially failed — raw text preserved.', raw_text: text.substring(0, 2000), confidence: 0.3 }; }

    // If linked to a document record, update ai_analysis
    if (documentId) {
      const analysisText = extracted.summary || JSON.stringify(extracted).substring(0, 1000);
      const riskFlags = [
        ...(extracted.violations_mentioned?.length > 0 ? ['VIOLATIONS_MENTIONED'] : []),
        ...(extracted.expiry_date && new Date(extracted.expiry_date) < new Date() ? ['EXPIRED'] : []),
        ...(extracted.expiry_date && new Date(extracted.expiry_date) < new Date(Date.now() + 60*86400000) ? ['EXPIRING_SOON'] : []),
      ];
      await query(
        `UPDATE documents SET ai_analysis=?, ai_risk_flags=?, updated_at=datetime('now') WHERE id=?`,
        [analysisText, JSON.stringify(riskFlags), documentId]
      );
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,description,mine_id,ip_address) VALUES (?,?,?,?,?,?,?,?)`,
      [uuid(), req.user.id, 'OCR_EXTRACT', 'document', documentId || uuid(),
       `OCR extraction: ${extracted.title || docType} (confidence: ${((extracted.confidence||0)*100).toFixed(0)}%)`,
       mineId, req.ip]
    );

    res.json({
      success:    true,
      model_used: model,
      data:       extracted,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (tempPath) try { fs.unlinkSync(tempPath); } catch {}
  }
};

exports.health = (req, res) => {
  res.json({
    success: true,
    service: 'KhanNetra OCR',
    backend: 'Gemini Vision',
    configured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    supported_types: ['License','Certificate','Permit','Inspection Report','Environmental Report','Safety Certificate'],
  });
};
