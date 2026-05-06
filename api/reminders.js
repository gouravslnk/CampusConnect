/**
 * Vercel Cron Job for Event Reminders
 * Runs every hour to send event reminders
 * 
 * Setup:
 * 1. Add to vercel.json in "crons" array
 * 2. Deploy to Vercel
 * 
 * vercel.json addition:
 * "crons": [{
 *   "path": "/api/reminders",
 *   "schedule": "0 * * * *"
 * }]
 * 
 * Environment Variables needed:
 * SUPABASE_URL
 * SUPABASE_SERVICE_KEY (use service role key for Vercel functions)
 * SENDGRID_API_KEY (alternative to EmailJS)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
  // Verify this is a cron request (optional security check)
  if (request.headers['x-vercel-cron-secret'] !== process.env.CRON_SECRET) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Initialize Supabase with service key (allows full access)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get current time
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Find events happening in 24 hours and 2 hours
    const upcomingEvents24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingEvents2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const date24h = upcomingEvents24h.toISOString().split('T')[0];
    const date2h = upcomingEvents2h.toISOString().split('T')[0];

    // Fetch events starting in exactly 24 hours
    const { data: events24h } = await supabase
      .from('events')
      .select(
        `
        id,
        title,
        date,
        time,
        event_registrations (
          id,
          profile_id,
          profiles:profile_id (
            id,
            email,
            name
          )
        )
      `
      )
      .eq('date', date24h)
      .eq('status', 'available');

    // Fetch events starting in next 2 hours
    const { data: events2h } = await supabase
      .from('events')
      .select(
        `
        id,
        title,
        date,
        time,
        event_registrations (
          id,
          profile_id,
          profiles:profile_id (
            id,
            email,
            name
          )
        )
      `
      )
      .eq('date', date2h)
      .eq('status', 'available');

    // Send 24h reminders
    const sent24h = await sendReminders(supabase, events24h, '24h');

    // Send 2h reminders
    const sent2h = await sendReminders(supabase, events2h, '2h');

    return response.status(200).json({
      success: true,
      message: `Sent ${sent24h} 24h reminders and ${sent2h} 2h reminders`,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return response.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Helper: Send reminders for an array of events
 */
async function sendReminders(supabase, events, reminderType) {
  let sentCount = 0;

  for (const event of events) {
    for (const registration of event.event_registrations) {
      const profile = registration.profiles;

      // Check if reminder already sent
      const { data: existing } = await supabase
        .from('event_reminders')
        .select('id')
        .eq('registration_id', registration.id)
        .eq('reminder_type', reminderType)
        .single();

      if (existing) continue; // Already sent

      // Send email via SendGrid or EmailJS
      try {
        const emailSent = await sendEmail({
          to: profile.email,
          name: profile.name,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          reminderType,
        });

        if (emailSent) {
          // Record that reminder was sent
          await supabase.from('event_reminders').insert({
            registration_id: registration.id,
            event_id: event.id,
            profile_id: profile.id,
            reminder_type: reminderType,
          });

          sentCount++;
        }
      } catch (err) {
        console.error(`Failed to send ${reminderType} reminder:`, err);
      }
    }
  }

  return sentCount;
}

/**
 * Helper: Send single email
 * Uses SendGrid or custom email backend
 */
async function sendEmail({ to, name, eventTitle, eventDate, eventTime, reminderType }) {
  try {
    // Option 1: Using SendGrid (recommended for production)
    if (process.env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to, name }] }],
          from: { email: 'noreply@campusconnect.com', name: 'CampusConnect' },
          subject: buildSubject(reminderType, eventTitle),
          html: buildEmailHTML(name, eventTitle, eventDate, eventTime, reminderType),
        }),
      });

      return response.ok;
    }

    // Option 2: Using Resend (alternative)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CampusConnect <noreply@campusconnect.com>',
          to,
          subject: buildSubject(reminderType, eventTitle),
          html: buildEmailHTML(name, eventTitle, eventDate, eventTime, reminderType),
        }),
      });

      return response.ok;
    }

    console.warn('No email service configured');
    return false;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

/**
 * Helper: Build email subject
 */
function buildSubject(reminderType, eventTitle) {
  if (reminderType === 'confirmation') {
    return `✓ Registration Confirmed: ${eventTitle}`;
  } else if (reminderType === '24h') {
    return `📅 Reminder: ${eventTitle} is tomorrow!`;
  } else if (reminderType === '2h') {
    return `⏰ Last Chance: ${eventTitle} starts in 2 hours!`;
  }
  return `Event Reminder: ${eventTitle}`;
}

/**
 * Helper: Build email HTML content
 */
function buildEmailHTML(name, eventTitle, eventDate, eventTime, reminderType) {
  let message = '';
  let emoji = '📧';

  if (reminderType === 'confirmation') {
    emoji = '✅';
    message = `Thank you for registering! We're excited to see you at <strong>${eventTitle}</strong>.`;
  } else if (reminderType === '24h') {
    emoji = '📅';
    message = `<strong>${eventTitle}</strong> is happening tomorrow at ${eventTime}!`;
  } else if (reminderType === '2h') {
    emoji = '⏰';
    message = `<strong>${eventTitle}</strong> starts in just 2 hours! Don't be late!`;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
          .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { font-size: 12px; color: #666; text-align: center; }
          .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${emoji} Event Update</h2>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>${message}</p>
            <p>
              <strong>Date:</strong> ${eventDate}<br>
              <strong>Time:</strong> ${eventTime}
            </p>
          </div>
          <div class="footer">
            <p>CampusConnect - Connecting Campus Talent</p>
            <p>You received this email because you registered for this event.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
