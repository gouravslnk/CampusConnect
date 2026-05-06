# 📧 Event Email Reminder System - Setup Guide

## Overview
CampusConnect now sends automatic email reminders to users who register for events:
- **Confirmation email** - Immediately when user registers
- **24-hour reminder** - 24 hours before event
- **2-hour reminder** - 2 hours before event

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Run SQL Migration
Add the new `event_reminders` table to your Supabase database:

```sql
-- Copy this SQL from sql/01_tables.sql 
-- (already added, just run it in Supabase SQL Editor)
```

Execute in Supabase SQL Editor to create the tracking table.

---

### Step 2: Set Up EmailJS (FREE EMAIL SERVICE)

EmailJS is the easiest option - **200 free emails/month, no credit card**.

1. Go to [emailjs.com](https://www.emailjs.com)
2. Click **Sign Up** (free plan available)
3. Create an Email Service:
   - Click **Add Service** → Choose **Gmail** (or your email)
   - Connect your Gmail account
   - Note your **Service ID**

4. Create an Email Template:
   - Go to **Email Templates**
   - Click **Create New Template**
   - Use these **template variables**:
     ```
     Subject: {{subject}}
     
     Hi {{to_name}},
     
     {{reminder_message}}
     
     Event: {{event_title}}
     Date: {{event_date}}
     Time: {{event_time}}
     
     See you there!
     CampusConnect Team
     ```
   - Note your **Template ID**

5. Copy your credentials:
   - Go to **Account** → **API Keys**
   - Copy **Public Key**, **Service ID**, **Template ID**

6. Add to `.env` (in your project):
   ```bash
   VITE_EMAILJS_SERVICE_ID=service_xxxxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
   VITE_EMAILJS_PUBLIC_KEY=public_xxxxx
   ```

---

### Step 3: Set Up Vercel Cron (For Scheduled Reminders)

The cron job runs automatically every hour to send scheduled reminders.

1. **Add to `.env` (Vercel only):**
   ```bash
   # Backend environment variables
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_role_key  # ⚠️ KEEP SECRET
   CRON_SECRET=any_random_secret_string
   ```

2. **Get Service Role Key:**
   - Go to Supabase Dashboard
   - Settings → API → Service Role Key (anon-key won't work)
   - Copy and paste to `.env`

3. **Deploy to Vercel:**
   ```bash
   git add -A
   git commit -m "Add email reminder system"
   git push origin main
   ```
   Vercel auto-deploys and enables cron jobs!

---

### Step 4: Test It

1. **Manual Test - Confirmation Email:**
   - Go to an event page
   - Click "Register Now"
   - Complete registration
   - Check your email for confirmation message
   - ✅ Should arrive within 1-2 seconds

2. **Check Cron Status:**
   - Go to Vercel Dashboard → Your Project
   - Click **Deployments** → Latest
   - Scroll to **Cron Jobs**
   - Should show: `/api/reminders` scheduled hourly
   - Click to see last run logs

3. **Manual Cron Test (Optional):**
   ```bash
   curl https://your-app.vercel.app/api/reminders \
     -H "x-vercel-cron-secret: YOUR_CRON_SECRET"
   ```

---

## 🎯 How It Works

### User Registration Flow
```
User Registers
    ↓
Registration saved to Supabase
    ↓
Frontend sends confirmation email via EmailJS
    ↓
Entry added to event_reminders table (confirmation)
    ↓
✅ Email sent within 2 seconds
```

### Scheduled Reminder Flow
```
Every hour (Vercel cron):
  1. Check for events starting in exactly 24 hours
  2. Check for events starting in next 2 hours
  3. Find who hasn't received reminder yet
  4. Send email via SendGrid/EmailJS
  5. Log in event_reminders table
  6. Avoid duplicates (UNIQUE constraint)
```

---

## 📧 Alternative Email Services

### Option 1: SendGrid (Better for High Volume)
**Best for:** 100+ reminders/month, production

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up (free tier: 100 emails/day)
3. Create API Key
4. Add to `.env`:
   ```bash
   SENDGRID_API_KEY=SG.xxxxx
   ```

### Option 2: Resend (Modern Alternative)
**Best for:** Modern setup, simple API

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: unlimited in development)
3. Create API Key
4. Add to `.env`:
   ```bash
   RESEND_API_KEY=re_xxxxx
   ```

---

## 🔍 Monitoring & Debugging

### Check Sent Reminders in Supabase
```sql
-- See all reminders sent
SELECT * FROM event_reminders;

-- Check reminders for specific event
SELECT * FROM event_reminders 
WHERE event_id = 'your-event-id';

-- Count reminders by type
SELECT reminder_type, COUNT(*) as count 
FROM event_reminders 
GROUP BY reminder_type;
```

### Vercel Logs
1. Go to Vercel Dashboard
2. Your Project → Deployments → Latest
3. View Cron Logs to see:
   - Emails sent ✅
   - Errors ❌
   - Execution time

### EmailJS Logs
1. Go to EmailJS Dashboard
2. **Email Activity** tab
3. See all sent/failed emails
4. Click to view bounce reasons

---

## 🛠️ Troubleshooting

### ❌ No confirmation email after registration
**Problem:** Credentials not set or network issue

**Solution:**
```bash
1. Check .env has VITE_EMAILJS_* variables
2. Open browser DevTools → Console
3. Look for emailjs errors
4. Verify email service is connected in EmailJS dashboard
```

### ❌ Cron job not running
**Problem:** Vercel not configured or environment variables missing

**Solution:**
```bash
1. Push code: git push origin main
2. Wait 2-3 min for Vercel deploy
3. Check Vercel Dashboard → Deployments
4. Verify .env has SUPABASE_SERVICE_KEY and CRON_SECRET
5. Check cron logs for errors
```

### ❌ Reminders not sending at scheduled times
**Problem:** Service key or database connection issue

**Solution:**
```bash
1. Verify SUPABASE_SERVICE_KEY in Vercel .env (not anon key!)
2. Check Supabase permissions for event_reminders table
3. View Vercel cron logs for SQL errors
4. Run manual cron test (see Test It section)
```

### ❌ Duplicate emails
**Shouldn't happen** - Database constraint prevents it, but if it does:
```sql
-- Delete duplicate reminders (keep only first)
DELETE FROM event_reminders 
WHERE id NOT IN (
  SELECT MIN(id) FROM event_reminders 
  GROUP BY registration_id, reminder_type
);
```

---

## 📊 Database Schema

### event_reminders table
```sql
id (UUID)           -- Unique reminder ID
registration_id     -- FK to event_registrations
event_id           -- FK to events
profile_id         -- FK to profiles (user)
reminder_type      -- 'confirmation' | '24h' | '2h'
sent_at            -- When email was sent
created_at         -- Record creation time

UNIQUE(registration_id, reminder_type)  -- Prevents duplicates
```

---

## 🔒 Security Notes

⚠️ **Important:**
- Never commit `.env` files to Git
- `SUPABASE_SERVICE_KEY` is sensitive - use only in Vercel (not frontend)
- EmailJS public key is safe to expose (frontend only)
- Use Vercel's environment variable encryption
- Rotate keys periodically

---

## 📈 Next Steps

1. **Monitor Email Delivery:**
   - Set up email bounce monitoring in EmailJS
   - Track email engagement

2. **Customize Email Templates:**
   - Add event image to email
   - Add "View Event Details" button
   - Brand with your campus colors

3. **Add More Reminders:**
   - 1 week before
   - 1 day before
   - Post-event survey

4. **Track Attendance:**
   - Mark attended vs didn't attend
   - Send follow-up emails
   - Adjust reminder frequency

---

## 💡 Tips

✅ **Test with personal email first**
- Register yourself for test event
- Verify confirmation arrives

✅ **Monitor cron job health**
- Check Vercel logs weekly
- Set up alerts for failures

✅ **Use test mode in EmailJS**
- Inspect raw email before sending
- Test template variables

✅ **Start with confirmation emails**
- Verify system works
- Gradually enable 24h and 2h reminders

---

## 📞 Support

If you have issues:
1. Check **Troubleshooting** section
2. View Vercel cron logs
3. Check EmailJS activity
4. Check Supabase logs
5. Read error messages carefully!

---

**Status:** ✅ Ready to deploy!

Next: `git push` and enjoy automated email reminders! 🎉
