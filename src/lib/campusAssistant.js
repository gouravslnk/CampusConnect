/**
 * campusAssistant.js
 *
 * Smart routing logic for the CampusConnect chatbot.
 *
 * STRATEGY — use Groq API only when necessary:
 *   - "upcoming events", "teammates", "best event for me", "prepare"
 *     → answered 100% locally from Supabase data (no API cost)
 *   - "suggest project ideas for [hackathon] using [skills]"
 *   - "explain what skills I need for [event]"
 *   - open-ended / creative / multi-step questions
 *     → routed to Groq via /api/assistant (API call)
 *
 * The router inspects the question BEFORE deciding which path to take,
 * so a plain "what events are on?" never hits the API.
 */

import { extractSkillSignals, recommendStudents, normalizeSkill } from './aiTeamMatcher';

// ── Constants ────────────────────────────────────────────────────────────────

const IDEA_BANK = {
  Hackathon: [
    'AI campus helpdesk that answers questions from event, club, and timetable data',
    'Smart teammate matcher that forms balanced teams from skills and availability',
    'Lost-and-found tracker with image search and location-based notifications',
    'Mental wellness check-in app with anonymous peer support routing',
  ],
  Workshop: [
    'Mini portfolio project using the workshop topic and your current skills',
    'Learning companion that converts notes into flashcards and quizzes',
    'Attendance and feedback dashboard for workshop organizers',
  ],
  Seminar: [
    'Research summary board with key takeaways, questions, and follow-up resources',
    'Topic explainer chatbot trained on speaker notes and public references',
    'Student interest survey that recommends next seminars to the club',
  ],
  Meetup: [
    'Networking buddy finder based on skills, goals, and availability',
    'Community project board where students can pitch ideas after the meetup',
    'Club member onboarding assistant with FAQs and task suggestions',
  ],
  Other: [
    'Campus productivity assistant for events, clubs, and project planning',
    'Skill growth tracker that recommends collaborators and events',
    'Student opportunity dashboard with personalized next steps',
  ],
};

const QUICK_PROMPTS = [
  'What events are coming up?',
  'Which event fits my skills?',
  'Find teammates for me',
  'Give me project ideas for the next hackathon',
  'Who is available for AI or React?',
  'How should I prepare for the upcoming hackathon?',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalize(text) {
  return String(text || '').toLowerCase().trim();
}

function compactText(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getUpcomingEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => e.status !== 'closed' && e.status !== 'cancelled' && new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function formatDate(dateStr, timeStr) {
  if (!dateStr) return 'Date TBA';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return timeStr ? `${formatted} at ${timeStr}` : formatted;
}

function getEventByQuestion(events, question) {
  const q = normalize(question);
  return events.find((e) => q.includes(normalize(e.title))) || getUpcomingEvents(events)[0] || events[0];
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function userSkillSet(user) {
  return (user?.skills || []).map((s) => normalizeSkill(s));
}

function findStudentByQuestion(students, question) {
  const q = compactText(question);
  if (!q) return null;

  return students.find((student) => {
    const name = compactText(student.name || student.full_name || student.username);
    if (!name) return false;
    const nameParts = name.split(' ').filter((part) => part.length > 2);
    return q === name || q.includes(name) || nameParts.some((part) => q.includes(part));
  });
}

function findEventByQuestion(events, question) {
  const q = compactText(question);
  if (!q) return null;

  return events.find((event) => {
    const title = compactText(event.title);
    return title && (q === title || q.includes(title));
  });
}

function hasCampusEntity(question, context) {
  const { events = [], students = [] } = context || {};
  return Boolean(findStudentByQuestion(students, question) || findEventByQuestion(events, question));
}

function isGreeting(q) {
  return /^(hi|hii|hello|hey|yo|namaste|good morning|good afternoon|good evening)\b/.test(q);
}

// ── Local answer functions (no API) ──────────────────────────────────────────

function answerUpcoming(events) {
  const upcoming = getUpcomingEvents(events).slice(0, 5);
  if (!upcoming.length) {
    return 'No upcoming open events found right now. Check back after clubs publish new events.';
  }
  return `Here are the upcoming open events:\n\n${bulletList(
    upcoming.map((e) => {
      const seats = Math.max((e.max_seats || 0) - (e.registrations || 0), 0);
      return `${e.title} (${e.category || 'Event'}) on ${formatDate(e.date, e.time)} at ${e.venue || 'venue TBA'} — ${seats} seats left`;
    })
  )}`;
}

function answerBestEvents(events, user) {
  const ranked = getUpcomingEvents(events)
    .map((e) => {
      const signals = extractSkillSignals({ title: e.title, category: e.category, description: e.description, tags: e.tags || [] });
      const skills = userSkillSet(user);
      const matched = signals.filter((s) => skills.includes(normalizeSkill(s)));
      const categoryBoost = e.category === 'Hackathon' ? 8 : e.category === 'Workshop' ? 6 : 3;
      const seats = Math.max((e.max_seats || 0) - (e.registrations || 0), 0);
      const seatBoost = seats > 0 ? 8 : -20;
      return {
        ...e,
        matchedSkills: matched,
        fitScore: Math.max(0, Math.min(100, Math.round((matched.length / Math.max(signals.length, 1)) * 70 + categoryBoost + seatBoost))),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 4);

  if (!ranked.length) return answerUpcoming(events);

  return `Best events for you based on your profile skills:\n\n${bulletList(
    ranked.map((e) => {
      const hint = e.matchedSkills.length
        ? `Matches your ${e.matchedSkills.join(', ')}.`
        : 'Add more profile skills to improve matching.';
      return `${e.title} — ${e.fitScore}% fit. ${hint}`;
    })
  )}`;
}

function answerTeammates(students, user, events, question) {
  const selectedEvent = getEventByQuestion(events, question);
  const requiredSkills = selectedEvent
    ? extractSkillSignals({ title: selectedEvent.title, category: selectedEvent.category, description: selectedEvent.description, tags: selectedEvent.tags || [] })
    : user?.skills || [];

  const matches = recommendStudents(students, user, requiredSkills, 5);
  if (!matches.length) {
    return 'No available teammates with matching skills found yet. Ask students to update their skills and set their status to available.';
  }

  const intro = selectedEvent
    ? `For **${selectedEvent.title}**, here are the best available teammates:`
    : 'Here are the best available teammates for you:';

  return `${intro}\n\n${bulletList(
    matches.map((s) => {
      const skills = s.matchedSkills.length ? s.matchedSkills.join(', ') : (s.skills || []).slice(0, 3).join(', ');
      return `${s.name} — ${s.score}% fit, skills: ${skills || 'not listed'}`;
    })
  )}\n\nOpen Team Builder to create a group chat and invite them.`;
}

function answerStudentProfile(students, user, events, question) {
  const student = findStudentByQuestion(students, question);
  if (!student) return answerTeammates(students, user, events, question);

  const selectedEvent = getEventByQuestion(events, question);
  const requiredSkills = selectedEvent
    ? extractSkillSignals({ title: selectedEvent.title, category: selectedEvent.category, description: selectedEvent.description, tags: selectedEvent.tags || [] })
    : user?.skills || [];
  const scored = recommendStudents([student], user, requiredSkills, 1)[0] || student;
  const skills = (student.skills || []).slice(0, 6);
  const fitLine = scored.score
    ? `${scored.score}% fit${selectedEvent ? ` for ${selectedEvent.title}` : ' for your current team needs'}`
    : 'profile fit needs more skill data';
  const reasons = scored.reasons?.length ? `\n\nWhy: ${scored.reasons.join('; ')}.` : '';

  return `${student.name || 'This student'} looks relevant for Team Builder.\n\n${bulletList([
    `Skills: ${skills.join(', ') || 'not listed yet'}`,
    `Availability: ${student.available === false ? 'not available right now' : 'available'}`,
    `Match: ${fitLine}`,
    `Projects listed: ${student.projects || 0}`,
  ])}${reasons}\n\nUse Team Builder if you want to invite them or compare them with other teammates.`;
}

function answerIdeasLocal(events, user, question) {
  const event = getEventByQuestion(events, question);
  const category = event?.category || 'Other';
  const baseIdeas = IDEA_BANK[category] || IDEA_BANK.Other;
  const signals = event
    ? extractSkillSignals({ title: event.title, category: event.category, description: event.description, tags: event.tags || [] })
    : [];
  const userSkills = user?.skills?.slice(0, 4) || [];

  const personalized = baseIdeas.slice(0, 4).map((idea, i) => {
    const skillHint = userSkills[i % Math.max(userSkills.length, 1)] || signals[i % Math.max(signals.length, 1)] || 'your stack';
    return `${idea} — build it with ${skillHint} and demo a working flow`;
  });

  const eventLine = event ? ` for **${event.title}**` : '';
  return `Here are project ideas${eventLine}:\n\n${bulletList(personalized)}\n\nTip: explain the campus problem → show a working flow → finish with who benefits and how you would scale it.`;
}

function answerPreparation(events, user) {
  const next = getUpcomingEvents(events)[0];
  const skills = user?.skills?.length ? user.skills.slice(0, 5).join(', ') : 'your strongest skills';
  if (!next) {
    return `No upcoming events yet. For now, update your profile skills and availability so I can match ${skills} to the best event when one is published.`;
  }
  const signals = extractSkillSignals({ title: next.title, category: next.category, description: next.description, tags: next.tags || [] });
  return `To prepare for **${next.title}**:\n\n${bulletList([
    `Review these topics: ${signals.slice(0, 5).join(', ') || next.category}`,
    `Make sure your profile lists skills like ${skills}`,
    'Form a team: one builder, one designer/presenter, one domain researcher',
    'Prepare a 2-min problem statement and a 5-min demo plan',
  ])}`;
}

function answerHelp() {
  return `I can help you with CampusConnect topics:\n\n${bulletList(QUICK_PROMPTS)}\n\nI use live data: upcoming events, your profile skills, available students, and team-matching signals.`;
}

// ── Router: decide LOCAL vs GROQ ─────────────────────────────────────────────

/**
 * Returns true when the question can be fully answered from DB data alone
 * and does NOT need generative reasoning from an LLM.
 */
function canAnswerLocally(q) {
  // Strictly local intents
  if (isGreeting(q)) return true;
  if (/(upcoming|coming up|next event|open events|show events|list events)/.test(q)) return true;
  if (/(find (me |a )?teammate|available (for|student)|who (is|are) available|team (for|builder)|build (a |my )?team)/.test(q)) return true;
  if (/(best event|which event (fit|suit|match)|event for my skill|recommend.*event)/.test(q)) return true;
  if (/(how (should|to) prepare|what should i (do|bring|study)|prepare for)/.test(q)) return true;
  if (/(my skills?|my profile|update (my |)profile)/.test(q)) return true;

  // Generic "quick idea" with no detailed description → still local
  if (/idea|project|pitch/.test(q) && !/describe|theme|track|problem statement|detail|specific|advanced/.test(q)) return true;

  return false;
}

/**
 * Answers questions that need no LLM call — purely from DB context.
 * Returns a string.
 */
function answerCampusQuestionLocal(question, context) {
  const q = normalize(question);
  const { events = [], students = [], user = null } = context;

  if (!q.trim()) return answerHelp();
  if (isGreeting(q)) {
    return 'Hi! Ask me about CampusConnect events, teammates, project ideas, hackathon preparation, or a student name from Team Builder.';
  }

  // Scope guard — refuse clearly off-topic questions
  const allowedKeywords = [
    'event', 'events', 'upcoming', 'next', 'team', 'teammate', 'teammates', 'partner',
    'available', 'idea', 'ideas', 'project', 'projects', 'pitch', 'prepare', 'preparation',
    'skill', 'skills', 'profile', 'match', 'recommend', 'how', 'what', 'help', 'hackathon',
    'workshop', 'seminar', 'meetup', 'campus', 'connect', 'register', 'join',
  ];
  const mentionsCampusEntity = hasCampusEntity(question, context);
  if (!allowedKeywords.some((k) => q.includes(k)) && !mentionsCampusEntity) {
    return "Sorry — I only answer questions about CampusConnect: upcoming events, teammates, project ideas, and preparation tips. Try asking about events or your team!";
  }

  if (findStudentByQuestion(students, question)) return answerStudentProfile(students, user, events, question);

  if (/(upcoming|coming up|next event|open events|show|list).*event/.test(q) || /^what events/.test(q)) {
    if (/(idea|project|present)/.test(q)) return answerIdeasLocal(events, user, question);
    if (/(fit|best|recommend|suit)/.test(q)) return answerBestEvents(events, user);
    return answerUpcoming(events);
  }
  if (/(team|teammate|partner|available|person)/.test(q)) return answerTeammates(students, user, events, question);
  if (/(idea|project|present|pitch)/.test(q)) return answerIdeasLocal(events, user, question);
  if (/(prepare|how should|what should)/.test(q)) return answerPreparation(events, user);
  if (/(skill|profile)/.test(q)) {
    const list = (user?.skills || []).join(', ') || 'none yet';
    return `Your listed skills: ${list}.\n\nAdd specific skills like React, Python, UI Design, Machine Learning, Supabase, Node, or Data Analysis so events and teammates can be matched better.`;
  }

  return `${answerHelp()}\n\nFor your question I'd start by checking upcoming events matched to your skills. Try: "Which event fits my skills?"`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getQuickPrompts() {
  return QUICK_PROMPTS;
}

/**
 * Main entry point used by both FloatingAIChatbot and AIAssistantPage.
 *
 * Returns { text: string, usedLLM: boolean }
 *
 * Decision tree:
 *   1. canAnswerLocally()  → answer from DB, no API call
 *   2. else                → POST to /api/assistant (Groq), pass context as payload
 *   3. if Groq fails       → fall back to local answer
 */
export async function answerQuestion(question, context) {
  const q = normalize(question);
  if (!q.trim()) return { text: answerHelp(), usedLLM: false };

  // Fast-path: local DB answer
  if (canAnswerLocally(q) || hasCampusEntity(question, context)) {
    return { text: answerCampusQuestionLocal(question, context), usedLLM: false };
  }

  // Scope guard before hitting the API — don't waste tokens on off-topic prompts
  const allowedKeywords = [
    'event', 'events', 'hackathon', 'workshop', 'seminar', 'meetup', 'team', 'teammate',
    'idea', 'project', 'pitch', 'prepare', 'skill', 'skills', 'campus', 'connect',
    'recommend', 'suggest', 'how', 'what', 'help', 'available',
  ];
  if (!allowedKeywords.some((k) => q.includes(k)) && !hasCampusEntity(question, context)) {
    return {
      text: "Sorry — I only answer questions about CampusConnect: upcoming events, teammates, project ideas, and preparation tips.",
      usedLLM: false,
    };
  }

  // Build a slim context payload (avoid sending full raw DB rows)
  const slimContext = {
    user: context.user
      ? { name: context.user.name, skills: context.user.skills, department: context.user.department, year: context.user.year }
      : null,
    events: (context.events || []).slice(0, 8).map((e) => ({
      title: e.title,
      category: e.category,
      date: e.date,
      time: e.time,
      venue: e.venue,
      status: e.status,
      description: e.description?.slice(0, 120),
      tags: e.tags,
      max_seats: e.max_seats,
      registrations: e.registrations,
    })),
    students: (context.students || [])
      .filter((s) => s.available !== false && s.id !== context.user?.id)
      .slice(0, 12)
      .map((s) => ({ name: s.name, skills: s.skills, projects: s.projects, department: s.department, year: s.year })),
  };

  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context: slimContext }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    if (data?.text) return { text: data.text, usedLLM: true };
    throw new Error('Empty response');
  } catch (err) {
    console.warn('Groq API unavailable, falling back to local answer:', err.message);
    return { text: answerCampusQuestionLocal(question, context), usedLLM: false };
  }
}

// Legacy export kept for backwards compat (used nowhere but safe to keep)
export function answerCampusQuestion(question, context) {
  return answerCampusQuestionLocal(question, context);
}
