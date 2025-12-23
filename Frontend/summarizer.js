const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const API_KEY = process.env.GROQ_API_KEY;
;

// Summarize content and extract entities
export async function summarizeAndExtract(rawText, title) {
  if (!rawText || rawText.trim().length < 50) {
    return {
      summary: 'No readable content found.',
      entities: []
    };
  }

  const prompt = buildPrompt(rawText, title);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a precise content analyzer. Always respond with valid JSON only. No markdown, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from API');
    }

    return parseResponse(content);

  } catch (error) {
    console.warn('Summarization failed:', error.message);
    return fallbackProcess(rawText);
  }
}

// Prompt for AI
function buildPrompt(rawText, title) {
  const truncatedText = rawText.slice(0, 2000);

  return `Analyze this webpage and return JSON only.

TITLE: ${title}

CONTENT:
${truncatedText}

Return this exact JSON format:
{
  "summary": "2-3 sentence summary of the main content",
  "entities": [
    {"name": "Entity Name", "type": "type"}
  ]
}

Rules:
- Summary: Capture key points in 2-3 sentences
- Entities: Extract 5-10 most relevant entities
- Entity types: person, organization, technology, concept, place, event, product
- Only include significant entities
- Return valid JSON only, no other text`;
}

// Parse AI response and extract JSON
function parseResponse(content) {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }
  return {
    summary: content.slice(0, 200),
    entities: []
  };
}

// Fallback function when API fails (executes basic extraction)
function fallbackProcess(rawText) {
  // Simple extractive summary
  const sentences = rawText
    .replace(/\s+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300);

  const summary = sentences.length > 0
    ? sentences.slice(0, 2).join('. ') + '.'
    : rawText.slice(0, 150) + '...';

  return {
    summary,
    entities: []
  };
}