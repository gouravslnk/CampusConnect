# Hybrid Local + Gemini Setup

The Campus AI now uses a **hybrid approach**:
- ✅ **Local heuristics first** (fast, no API cost) for campus-specific questions
- 🚀 **Gemini fallback** (optional) for complex, open-ended questions

## How It Works

1. **User asks a question**
2. System checks: Is this a campus-specific question (events, team, ideas, prepare, skills)?
   - **YES** → Answer instantly using local DB + heuristics (< 500ms)
   - **NO** → Call Gemini API (if configured)

This keeps 80%+ of questions fast, and only calls the LLM when needed.

---

## Setup Gemini Endpoint on Vercel (Optional)

### Step 1: Create Vercel API Route

Create a file at the root of your project (or in `/api` folder):

```plaintext
/api/assistant.js  (or .ts for TypeScript)
```

### Step 2: Example Code

```javascript
// api/assistant.js (Node.js + Express handler)
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;

  // Validate input
  if (!question || question.length > 500) {
    return res.status(400).json({ error: 'Invalid question' });
  }

  try {
    // Build the system prompt that constrains Gemini to campus domain
    const systemPrompt = `You are the CampusConnect Assistant, specialized in helping students with:
- Upcoming events and workshops
- Finding teammates with matching skills
- Project ideas for hackathons and competitions
- How to prepare for upcoming events
- Campus resources and connections

If the user asks anything outside these topics, politely decline and redirect them to campus-related topics. Keep responses concise and actionable.`;

    // Call Google's Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY, // Store key in env variable
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: question }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return res.status(500).json({ error: 'Failed to generate response' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';

    res.status(200).json({ text });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Step 3: Environment Variables on Vercel

1. Go to your Vercel project settings: **Settings → Environment Variables**
2. Add:
   - `GEMINI_API_KEY`: Your Google Gemini API key (keep this secret!)
   - (Optional) `GEMINI_MODEL`: Model name (defaults to `gemini-2.5-flash`)

### Step 4: Frontend Configuration

Add to your `.env` or `.env.local` file:

```
VITE_GEMINI_ENDPOINT=https://your-vercel-project.vercel.app/api/assistant
```

Or hardcode in `src/lib/campusAssistant.js`:

```javascript
const endpoint = 'https://your-vercel-project.vercel.app/api/assistant';
```

---

## Cost & Performance

| Scenario | Response Time | Cost |
|----------|---------------|------|
| **Local (events, team, ideas)** | < 500ms | Free |
| **Gemini (complex questions)** | 1-3s | ~$0.002 per question |
| **Gemini with no endpoint** | < 500ms (falls back to local) | Free |

---

## Testing the Hybrid Setup

1. **Local question** (fast):
   - "What events are coming up?" → Instant
   
2. **Complex question** (uses Gemini if configured):
   - "How do I become a better team player?" → Waits for API call
   
3. **Out-of-scope question** (no API call):
   - "Tell me about machine learning" → Refuses, suggests campus topics

---

## Troubleshooting

### Endpoint not found / 404
- Check your Vercel project name and environment variables
- Ensure `VITE_GEMINI_ENDPOINT` is set correctly

### API key errors / 401
- Verify `GEMINI_API_KEY` is set in Vercel environment
- Ensure key is from Google Cloud / Gemini API, not other services

### Slow responses (> 3s)
- Gemini API may be slow; this is normal
- Local heuristic still works as fallback
- Consider caching frequent responses

### "Sorry, I encountered an error"
- Check browser console for error logs
- Verify backend endpoint is reachable
- Fallback to local heuristic should still work

---

## Current Frontend Code

Files updated to use hybrid approach:
- `src/lib/campusAssistant.js` — Added `answerQuestion()` hybrid function
- `src/pages/AIAssistantPage.jsx` — Uses async `answerQuestion()`
- `src/components/FloatingAIChatbot.jsx` — Uses async `answerQuestion()`

## Summary

The system now intelligently routes questions:
- **Campus-specific → Local (fast, free)**
- **Complex/open-ended → Gemini (optional, ~1-3s)**
- **No Gemini configured → Local fallback (still works!)**

You can deploy and use the app fully without Gemini. Adding the endpoint is **optional** for better conversational answers.
