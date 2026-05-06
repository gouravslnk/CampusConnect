import { supabase } from './supabase';

/**
 * Find events whose date is strictly before today and mark them as closed
 * (unless they're already closed or cancelled).
 */
export async function expirePastEvents() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();

    // Fetch events older than today that are still open
    const { data, error } = await supabase
      .from('events')
      .select('id, date, status')
      .lt('date', iso)
      .not('status', 'in', '(closed,cancelled)');

    if (error) {
      console.warn('Could not fetch past events to expire:', error);
      return;
    }

    if (!data || data.length === 0) return;

    const ids = data.map((e) => e.id);

    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'closed' })
      .in('id', ids);

    if (updateError) {
      console.warn('Failed to mark past events as closed:', updateError);
    }
  } catch (err) {
    console.error('expirePastEvents error:', err);
  }
}

export default expirePastEvents;
