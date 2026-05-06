/**
 * Vercel Serverless Function: Gemini-powered Campus AI Assistant
 * 
 * This endpoint:
 * 1. Receives a question from the frontend
 * 2. Builds a system prompt that constrains Gemini to campus topics
 * 3. Calls Google's Gemini API with the API key stored securely on Vercel
 * 4. Returns the response to the frontend
 * 
 * Environment Variables needed (set in Vercel):
 * - GEMINI_API_KEY: Your Google Gemini API key
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;

  // Validate input
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid question' });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 chars)' });
  }

  // Check if API key is set
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set in Vercel environment');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Build the system prompt that constrains Gemini to campus domain
    const systemPrompt = `You are the CampusConnect Assistant, specialized in helping students with:
- Upcoming events and workshops on campus
- Finding teammates with matching skills
- Project ideas for hackathons and competitions
- How to prepare for upcoming events
- Campus resources and student connections

IMPORTANT: Only answer questions about these campus-related topics. If the user asks anything outside these topics, politely decline with a brief message and redirect them to campus-related topics.

Keep responses concise, actionable, and helpful. Use the provided context to give personalized recommendations.`;

    // Call Google's Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt },
                { text: question },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          },
        }),
      }
    );

    // Handle API errors
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({ error: 'Failed to generate response from Gemini' });
    }

    const data = await geminiResponse.json();

    // Extract the assistant's text response
    const assistantText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';

    // Return success with the assistant's answer
    res.status(200).json({ text: assistantText });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
