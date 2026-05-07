/**
 * Vercel Serverless Function: Groq-powered Campus AI Assistant
 *
 * Replaces the broken Gemini integration with Groq.
 * The LLM is only called for questions that genuinely need natural-language
 * reasoning. Simple data lookups (upcoming events, teammate lists) are handled
 * entirely by the client-side heuristic layer in campusAssistant.js — this
 * endpoint is the fallback for complex / open-ended queries.
 *
 * Environment Variables (set in Vercel → Settings → Environment Variables):
 *   GROQ_API_KEY   - your Groq API key
 *   GROQ_MODEL     - optional, defaults to llama-3.3-70b-versatile
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, context } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid question' });
  }

  if (question.length > 600) {
    return res.status(400).json({ error: 'Question too long (max 600 chars)' });
  }

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Build a compact context block from whatever the client passed
    const ctxParts = [];

    if (context?.events?.length) {
      const upcoming = context.events
        .filter((e) => !['closed', 'cancelled'].includes(e.status))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 6)
        .map((e) => {
          const seats = Math.max((e.max_seats || 0) - (e.registrations || 0), 0);
          return `• ${e.title} (${e.category || 'Event'}) – ${e.date}${e.time ? ' ' + e.time : ''} @ ${e.venue || 'TBA'}, ${seats} seats left${e.description ? ', desc: ' + e.description.slice(0, 80) : ''}`;
        });
      if (upcoming.length) ctxParts.push(`Upcoming events:\n${upcoming.join('\n')}`);
    }

    if (context?.students?.length) {
      const available = context.students
        .filter((s) => s.available !== false && s.id !== context?.user?.id)
        .slice(0, 10)
        .map((s) => `• ${s.name} – skills: ${(s.skills || []).slice(0, 5).join(', ') || 'none listed'}, ${s.projects || 0} projects`);
      if (available.length) ctxParts.push(`Available students:\n${available.join('\n')}`);
    }

    if (context?.user) {
      const u = context.user;
      ctxParts.push(
        `Current user: ${u.name || 'Student'}, skills: ${(u.skills || []).join(', ') || 'none'}, dept: ${u.department || 'N/A'}, year: ${u.year || 'N/A'}`
      );
    }

    const contextBlock = ctxParts.length
      ? `\n\n--- LIVE CAMPUSCONNECT DATA ---\n${ctxParts.join('\n\n')}\n--- END DATA ---`
      : '';

    const systemPrompt = `You are the CampusConnect AI Assistant — a smart, concise helper for students on the CampusConnect platform.

Your ONLY job is to help with:
1. Upcoming events and hackathons on campus
2. Recommending teammates / team building (use the student list from context)
3. Project ideas for hackathons — personalised to the user's skills and the event description
4. How to prepare for a specific upcoming event
5. Skills to develop based on upcoming events
6. General questions about using CampusConnect features

STRICT RULES:
- If asked anything unrelated to campus life, events, hackathons, teams, or CampusConnect, politely refuse and redirect.
- Always use the provided live data when answering. Do NOT make up event names or dates.
- Keep answers concise and actionable — use bullet points where helpful.
- When recommending teammates, mention their name and the skills they bring.
- When suggesting project ideas, tie them to the hackathon description and the user's skills.
- Never reveal raw IDs or internal database fields.${contextBlock}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 400,
        temperature: 0.6,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', err);
      return res.status(502).json({ error: 'Failed to get response from AI. Please try again.' });
    }

    const data = await groqResponse.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      'I could not generate a response right now. Please try rephrasing your question.';

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
