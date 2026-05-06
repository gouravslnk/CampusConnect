/**
 * Frontend-only EmailJS helper for registration confirmations.
 */

let emailJsLoadPromise = null;

function loadEmailJS() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.emailjs_initialized && window.emailjs) {
    return Promise.resolve(window.emailjs);
  }

  if (!emailJsLoadPromise) {
    emailJsLoadPromise = new Promise((resolve, reject) => {
      const initialize = () => {
        if (!window.emailjs) {
          reject(new Error('EmailJS failed to load'));
          return;
        }

        if (!window.emailjs_initialized) {
          window.emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
          window.emailjs_initialized = true;
        }

        resolve(window.emailjs);
      };

      const existingScript = document.querySelector('script[data-emailjs="true"]');
      if (existingScript) {
        if (window.emailjs) {
          initialize();
        } else {
          existingScript.addEventListener('load', initialize, { once: true });
          existingScript.addEventListener('error', () => reject(new Error('EmailJS script failed to load')), { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/index.min.js';
      script.async = true;
      script.dataset.emailjs = 'true';
      script.onload = initialize;
      script.onerror = () => reject(new Error('EmailJS script failed to load'));
      document.head.appendChild(script);
    });
  }

  return emailJsLoadPromise;
}

export async function initEmailJS() {
  try {
    await loadEmailJS();
    return true;
  } catch (error) {
    console.error('Failed to initialize EmailJS:', error);
    return false;
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
    const emailjs = await loadEmailJS();
    if (!emailjs) {
      console.error('EmailJS not available');
      return false;
    }

    const response = await emailjs.send(
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