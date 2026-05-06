/**
 * EmailJS Integration for Event Reminders
 * 
 * Setup:
 * 1. Visit https://www.emailjs.com
 * 2. Sign up (free)
 * 3. Create an Email Service (Gmail recommended)
 * 4. Create an Email Template with variables: {event_title}, {event_date}, {event_time}, {user_name}, {reminder_type}
 * 5. Copy SERVICE_ID, TEMPLATE_ID, PUBLIC_KEY to .env
 * 
 * Environment Variables needed:
 * VITE_EMAILJS_SERVICE_ID=your_service_id
 * VITE_EMAILJS_TEMPLATE_ID=your_template_id
 * VITE_EMAILJS_PUBLIC_KEY=your_public_key
 */

// Initialize EmailJS (call once on app startup)
export function initEmailJS() {
  if (typeof window !== 'undefined' && !window.emailjs_initialized) {
    // Load EmailJS library dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/index.min.js';
    script.onload = () => {
      window.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      window.emailjs_initialized = true;
    };
    document.head.appendChild(script);
  }
}

/**
 * Send event reminder email via EmailJS
 * @param {string} userEmail - Recipient email
 * @param {string} userName - Recipient name
 * @param {string} eventTitle - Event title
 * @param {string} eventDate - Event date (YYYY-MM-DD)
 * @param {string} eventTime - Event time (HH:MM)
 * @param {string} reminderType - 'confirmation', '24h', or '2h'
 * @returns {Promise<boolean>} - Success status
 */
export async function sendEventReminder(
  userEmail,
  userName,
  eventTitle,
  eventDate,
  eventTime,
  reminderType = 'confirmation'
) {
  try {
    // Ensure EmailJS is initialized
    if (typeof window === 'undefined' || !window.emailjs) {
      console.error('EmailJS not available');
      return false;
    }

    // Build reminder message
    let reminderMessage = '';
    if (reminderType === 'confirmation') {
      reminderMessage = `Thank you for registering! We're excited to see you at ${eventTitle}.`;
    } else if (reminderType === '24h') {
      reminderMessage = `Reminder: ${eventTitle} is happening in 24 hours!`;
    } else if (reminderType === '2h') {
      reminderMessage = `Last minute reminder: ${eventTitle} starts in 2 hours!`;
    }

    // Send email via EmailJS
    const response = await window.emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        to_name: userName,
        event_title: eventTitle,
        event_date: eventDate,
        event_time: eventTime,
        reminder_type: reminderType,
        reminder_message: reminderMessage,
        subject: `Event ${reminderType === 'confirmation' ? 'Confirmation' : 'Reminder'}: ${eventTitle}`,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send batch reminders (used by cron function)
 * @param {Array} reminders - Array of {email, name, eventTitle, eventDate, eventTime, type}
 * @returns {Promise<Array>} - Results array
 */
export async function sendBatchReminders(reminders) {
  const results = [];
  for (const reminder of reminders) {
    const success = await sendEventReminder(
      reminder.email,
      reminder.name,
      reminder.eventTitle,
      reminder.eventDate,
      reminder.eventTime,
      reminder.type
    );
    results.push({ email: reminder.email, success });
    // Rate limit: wait 500ms between sends
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return results;
}
