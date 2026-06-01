// Vercel serverless function: translate KO → EN via Claude
// POST /api/translate  body: { text: "..." }
// Response: { en: "...", detected: "ko" | "en" }
//
// Required env var (Vercel project settings → Environment Variables):
//   ANTHROPIC_API_KEY = sk-ant-...

const SYSTEM_PROMPT = `You are a professional translator producing natural, native-sounding English translations of Korean text written by Promega Korea / Promega BioSystems Korea (PBK) colleagues about their AI usage in business contexts.

Context: These are personal lessons-learned reflections from a Promega Korea internal AI workshop. Authors are sales reps, engineers, marketers, finance/QA/R&D/HR/logistics professionals. They are writing about how they tried AI tools (mostly Claude, also Gemini, GPT), what surprised them, and how their work changed.

Style guidelines:
- Translate meaning, not word-by-word. Produce natural, native-sounding English that a colleague in the US/UK would write.
- Preserve the emotional register: professional, sometimes reflective, sometimes informal.
- Korean honorifics → render as professional but warm English. Don't overdo "we" or "I" — use what flows.
- Keep length close to source. Do not pad with flowery additions.
- Preserve line breaks if present.

Names & terms to keep EXACTLY as written (do NOT translate):
- Promega, PBK, Promega Korea, Promega BioSystems Korea, Madison
- Product names: Maxwell, Spring, GMM, ProCon, GBS, etc.
- Tool names: Claude, Gemini, GPT, Asana, SAP, SharePoint, N8N, HomeTax, DART, Naver, Woori, etc.
- Personal names of contributors (Korean names romanized as-is)

Output format: ONLY the English translation. No quotes, no labels, no preface, no explanation, no Korean in parentheses. Just the translated text, ready to display.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'text required' });
  if (text.length > 4000) return res.status(400).json({ error: 'text too long' });

  // Detect: any hangul → ko; else assume en (or another non-ko language, pass through)
  const hasHangul = /[ㄱ-ㆎ가-힣]/.test(text);
  const detected = hasHangul ? 'ko' : 'en';

  // No translation needed if no Korean characters detected
  if (detected === 'en') {
    return res.status(200).json({ en: text, detected });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    // Soft-fail: return the original text so the client still saves something
    return res.status(200).json({ en: text, detected, error: 'server config missing' });
  }

  const userPrompt = `Translate this Korean message into natural English, following all style guidelines. Return only the translation.\n\n---\n${text}\n---`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Anthropic API error', r.status, errText);
      return res.status(200).json({ en: text, detected, error: `upstream ${r.status}` });
    }
    const data = await r.json();
    let translation = (data.content && data.content[0] && data.content[0].text || '').trim();
    // Strip surrounding straight or curly quotes that Claude sometimes adds
    translation = translation.replace(/^["'“”‘’](.*)["'“”‘’]$/s, '$1').trim();
    if (!translation) translation = text;

    return res.status(200).json({ en: translation, detected });
  } catch (e) {
    console.error('translate exception', e);
    return res.status(200).json({ en: text, detected, error: e && e.message || 'unknown' });
  }
};
