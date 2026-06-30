# 14. Environment Variables Deep Dive

### What are they and why do they exist?
Environment variables are secrets or configuration strings that your application needs to run, but that you *never* want to save directly in your source code (like passwords or API keys). If you hardcoded an API key into a file and pushed it to GitHub, hackers could steal it.

In Vite, environment variables must start with the prefix `VITE_` to be exposed to the React frontend.

### Variables in this project
1. **`VITE_SUPABASE_URL`**
   * **What it stores:** The exact web address of your Supabase database server.
   * **Where it is used:** `src/lib/supabase.js`
2. **`VITE_SUPABASE_ANON_KEY`**
   * **What it stores:** The public, anonymous key to talk to Supabase.
   * **Security implication:** Since this is a React app, this key *is* visible to users in their browser network tab. This is perfectly safe *only because* we use Supabase Row Level Security (RLS) in the database to prevent people from deleting or viewing data they don't own.
3. **`VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`**
   * **What they store:** Credentials to connect to the EmailJS service to send automated emails (like event registration reminders).

---

# 11. API Layer Deep Dive

### Where API calls happen
In this app, we do not use `axios` or the native `fetch` API directly for our database interactions. Instead, we use the `@supabase/supabase-js` SDK. 
* **Why?** Supabase provides a wrapper that makes writing SQL queries inside JavaScript extremely easy. For example, instead of writing a complex `fetch` POST request with headers, we just write `supabase.from('events').insert({...})`.

### Request Lifecycle & Error Handling
Every time we talk to Supabase, it is an **asynchronous** action. It takes time for the signal to reach the Supabase servers and come back.
1. We start a loading state (`setLoading(true)`).
2. We wrap the API call in a `try/catch` block.
3. We await the response.
4. If it fails, the `catch` block catches the error, and we usually trigger a global Toast message (`showToast('Error saving data', { type: 'error' })`).
5. Finally, we turn off the loading state (`setLoading(false)`).

---

# 5. Every File (The `lib` Folder)

## File 10: `src/lib/supabase.js`

### Basic Information
* **File location:** `src/lib/supabase.js`
* **Why this file exists:** To initialize the connection to our Supabase database and export a single, reusable database client.

### Functionality
It reads the environment variables securely via `import.meta.env`. It creates a Supabase client object. 
* **What happens if it is deleted:** Every single database call, authentication attempt, and real-time chat feature will instantly break.

### The Code Breakdown
```javascript
import { createClient } from '@supabase/supabase-js';

// Read secrets from the environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn the developer if they forgot to create the .env file
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Missing Supabase environment variables. Check your .env file.");
}

// Export the initialized client so any file can import `supabase`
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Interview Section for `supabase.js`
**How to explain this in 30 seconds:**
"This is the initialization file for our database client. It imports the `createClient` function from the Supabase SDK, reads our URL and Anonymous Key from Vite's environment variables, and exports a singleton instance of the Supabase client that the rest of the app uses to query data."

* **Intermediate Question:** How does Vite handle environment variables differently than a standard Node.js Express backend?
  * *Ideal Answer:* In a Node backend, we access variables using `process.env`. Vite bundles code for the browser, where `process` doesn't exist. Instead, Vite exposes them via a special `import.meta.env` object. Furthermore, Vite requires variables to be prefixed with `VITE_` to prevent accidentally leaking server secrets into the browser bundle.

---

## File 11: `src/lib/aiTeamMatcher.js`

### Basic Information
* **File location:** `src/lib/aiTeamMatcher.js`
* **Why this file exists:** To provide the mathematical logic behind the "AI Team Builder" feature.

### Functionality
This is a pure JavaScript utility file. It takes strings of text (like a student's skills or an event's description) and normalizes them (e.g., turning "ReactJS", "react.js", and "React" all into exactly "react"). It then calculates a "Fit Score" between two students or between a student and an event based on coverage, complementary skills, and overlapping skills.

### Key Functions
* **`normalizeSkill(value)`:** A massive dictionary (`SKILL_ALIASES`) maps variations of skills to a single canonical name. Why? Because if User A types "Machine Learning" and User B types "ML", the system needs to know they are the same thing.
* **`extractSkillSignals(...)`:** Reads an event title, description, and tags, removes "Stop Words" (like "the", "and", "a"), and extracts the core skills required for the event.
* **`scoreStudentForTeam(student, currentUser, requiredSkills)`:** This is the core algorithm. It calculates a score out of 100.
  * It awards points if the candidate has skills the team *requires*.
  * It awards extra points if the candidate has skills the current user *lacks* (complementary score).
  * It penalizes the score if the candidate has the exact same skills as the current user (overlap penalty) because a hackathon team needs diversity, not 4 UI designers.

### Interview Section for `aiTeamMatcher.js`
**How to explain this in 60 seconds:**
"This file contains the logic for our smart matchmaking system. Instead of relying on an expensive LLM API for basic matching, I wrote a custom algorithm. It normalizes skill names using an alias dictionary, tokenizes event descriptions to extract required skills, and then runs a scoring algorithm. The algorithm rewards students who have required skills that the current user lacks, essentially building a complementary, balanced team."

* **Advanced Question:** Why did you write a custom algorithm instead of just sending all the data to OpenAI and asking it to pick a team?
  * *Ideal Answer:* Sending hundreds of student profiles to an LLM every time a user wants a recommendation is slow, expensive, and scales poorly. By writing a local scoring algorithm based on set intersections and weighted mathematics, the matchmaking happens instantly in the user's browser with zero API cost.

---

## File 12: `src/lib/campusAssistant.js`

### Basic Information
* **File location:** `src/lib/campusAssistant.js`
* **Why this file exists:** This acts as the "Router" for the AI Chatbot. 

### Functionality
When a user types a question into the Floating AI Chatbot, this file analyzes the text. 
It uses a **Decision Tree / Strategy Pattern**:
1. If the user asks a simple question like "What events are coming up?" or "Find me a teammate", this file answers it *locally* by querying the data we already have from Supabase, formatting a string, and returning it.
2. If the user asks a complex, creative question like "Suggest a project idea using React for the hackathon", it sends the question to an external LLM API (Groq) via a backend route `/api/assistant`.

### The Code Breakdown (The Router)
```javascript
export async function answerQuestion(question, context) {
  const q = normalize(question);
  
  // 1. Fast-path: local DB answer (Zero API cost)
  if (canAnswerLocally(q) || hasCampusEntity(question, context)) {
    return { text: answerCampusQuestionLocal(question, context), usedLLM: false };
  }

  // 2. Build a slim context payload to save tokens
  const slimContext = {
    // ... maps user, events, and students to smaller objects
  };

  // 3. Fallback to LLM (Groq)
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      body: JSON.stringify({ question, context: slimContext }),
    });
    // ... return LLM response
  }
}
```

### Interview Section for `campusAssistant.js`
* **Hard Question:** What is the purpose of the `slimContext` object before calling the API?
  * *Ideal Answer:* LLMs charge based on "Tokens" (the amount of text you send them). If I sent the raw database rows to the LLM, I would be sending created_at timestamps, image URLs, and database IDs, which the LLM doesn't need to answer the user's question. This would waste tokens and money. `slimContext` strips the data down to only the essential fields (title, description, skills) before making the network request.

---

## File 13: `src/lib/uploadService.js`

### Basic Information
* **File location:** `src/lib/uploadService.js`
* **Why this file exists:** To handle file uploads (like Profile Pictures or Event Banners) directly to Supabase Storage.

### Functionality
* **`uploadFile(file, bucket, userId)`:** It validates the file type (ensuring it is an image) and file size (under 5MB). It generates a highly unique, random filename so users don't overwrite each other's files. It uploads it to Supabase Storage, and then requests the Public URL for that image to save in the database.
* **`deleteFile(url, bucket)`:** Cleans up old files if a user changes their profile picture.

### Interview Section for `uploadService.js`
* **Intermediate Question:** Why do you generate a random filename like `${userId}-${timestamp}-${random}.jpg` instead of just using the original file name?
  * *Ideal Answer:* If two different users upload a file named `profile.jpg`, the second upload would overwrite the first one in the storage bucket. By prepending the user ID and a timestamp, we guarantee absolute uniqueness and prevent data loss.

---

## File 14: `src/lib/emailService.js` & File 15: `src/lib/eventUtils.js`

### `emailService.js`
* **Purpose:** Handles sending confirmation emails using EmailJS. 
* **Implementation detail:** It dynamically injects the EmailJS script into the `<head>` of the HTML document only when an email needs to be sent, rather than loading it on initial page load. This is a great **Performance Optimization** because it reduces the initial JavaScript bundle size.

### `eventUtils.js`
* **Purpose:** Contains `expirePastEvents()`.
* **How it works:** It grabs today's date. It queries Supabase for any events whose date is strictly before today and whose status is not already "closed". It then runs an `update` query to change their status to "closed".
* **Where is it used:** We saw this called inside `useEffect` in `App.jsx` so that the database is cleaned up every time someone opens the app.
