/**
 * Frontend-only EmailJS helper for registration confirmations.
 */

export function initEmailJS() {
  if (typeof window !== 'undefined' && !window.emailjs_initialized) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/index.min.js';
    script.onload = () => {
      window.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      window.emailjs_initialized = true;
    };
    document.head.appendChild(script);
  }
}

export async function sendEventReminder(
  userEmail,
  userName,
  eventTitle,
  eventDate,
  eventTime,
  reminderType = 'confirmation'
) {
  try {
    if (typeof window === 'undefined' || !window.emailjs) {
      console.error('EmailJS not available');
      return false;
    }

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
        subject: `Event ${reminderType === 'confirmation' ? 'Confirmation' : 'Reminder'}: ${eventTitle}`,
      }
    );

    return response.status === 200;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}