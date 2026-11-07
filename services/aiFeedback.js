const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

async function getCodeFeedback(code) {
  const prompt =
    'You are a senior software engineer reviewing code written during a technical interview. ' +
    'Review the code below. Reply ONLY with valid JSON in exactly this format: ' +
    '{"score": <number from 0 to 10>, "summary": "<two sentences>", ' +
    '"strengths": ["<point>", "<point>"], "improvements": ["<point>", "<point>"]}\n\n' +
    'Code:\n' + code;

    // Tries up to 3 times, because a short network failure should not lose the feedback
  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const text = response.text.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(text);
    const score = Math.round(Number(parsed.score));
    return {
      score: Number.isFinite(score) ? score : null,
      summary: parsed.summary || '',
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || []
    };
  } catch (err) {
    // If the AI did not return clean JSON, keep its raw text as the summary
    return { score: null, summary: text, strengths: [], improvements: [] };
  }
}

module.exports = { getCodeFeedback };