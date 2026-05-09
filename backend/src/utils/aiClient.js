require('dotenv').config();
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const callAI = async (prompt) => {
  // Try Gemini first (free tier)
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log('✅ Used Gemini API');
    return text;

  } catch (geminiError) {
    console.warn('⚠️ Gemini failed, switching to OpenAI...', geminiError.message);

    // Fallback to GPT-4o-mini
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Missing OPENAI_API_KEY');
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });
      console.log('✅ Used OpenAI Fallback');
      return response.choices[0].message.content.trim();

    } catch (openaiError) {
      console.error('❌ Both AI APIs failed');
      throw new Error('All AI providers unavailable');
    }
  }
};

module.exports = { callAI };
