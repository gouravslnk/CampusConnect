import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building, CalendarDays, Mail, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

function formatDate(value) {
  if (!value) return 'Date TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ClubDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalize = (value) => String(value || '').trim().toLowerCase();

  useEffect(() => {
    async function loadClub() {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('id, name, college, description, status, created_at, owner_id, profiles:owner_id(id, name, email, department, year)')
        .eq('id', id)
        .single();

      if (clubError || !clubData) {
        setClub(null);
        setEvents([]);
        setLoading(false);
        return;
      }

      setClub(clubData);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, category, date, venue, status, club, organizer_id, organizer:profiles(name, email)')
        .order('date', { ascending: false });

      if (!eventError) {
        const clubName = normalize(clubData.name);
        const ownerId = clubData.owner_id;
        const filteredEvents = (eventData || []).filter((event) => {
          const clubField = normalize(event.club);
          return clubField === clubName
            || clubField.includes(clubName)
            || (ownerId && normalize(event.organizer_id) === normalize(ownerId));
        });

        setEvents(filteredEvents);
      } else {
        setEvents([]);
      }

      setLoading(false);
    }

    loadClub();
  }, [id]);

  const organizer = club?.profiles;

  const visibleEvents = useMemo(() => events, [events]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-white dark:bg-slate-900 shadow-sm" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Club not found</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">The club you’re looking for may have been removed or is unavailable.</p>
        <button
          onClick={() => navigate('/clubs')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <ArrowLeft size={16} /> Back to clubs
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/clubs')}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:text-slate-900 dark:text-white"
      >
        <ArrowLeft size={16} /> Back to clubs
      </button>

      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_55%,#eef2ff_100%)] dark:bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_55%,#020617_100%)] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                <Building size={14} /> Hub Profile
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">{club.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Building size={15} /> {club.college}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
              <p className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-white">{club.status}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">About</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-300">
                {club.description || 'No description provided.'}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Club Events</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Events linked to this hub.</p>
                </div>
                <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {visibleEvents.length} total
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {visibleEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No events found for this club yet.
                  </div>
                ) : visibleEvents.map((event) => (
                  <div 
                    key={event.id} 
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 dark:bg-slate-950 p-4 transition hover:border-cyan-300 dark:hover:border-slate-600 hover:bg-cyan-50/40 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {event.category || 'Event'} • {event.venue || 'Venue TBA'}
                        </p>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize ${event.status === 'closed' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}`}>
                        {event.status || 'available'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(event.date)}</span>
                      <span className="inline-flex items-center gap-1.5"><Users size={13} /> {event.organizer?.name || 'Unknown organizer'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Details</h2>
              <div 
                className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => club.owner_id && navigate(`/profile/${club.owner_id}`)}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-800 text-sm font-bold text-white">
                  {(organizer?.name || organizer?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white hover:underline">{organizer?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Club admin</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail size={15} className="text-slate-400" />
                  <span className="break-all">{organizer?.email || 'No email available'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={15} className="text-slate-400" />
                  <span>{organizer?.department || 'Department not added'}{organizer?.year ? ` • ${organizer.year}` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building size={15} className="text-slate-400" />
                  <span>Managed by {organizer?.name || 'Unknown'}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}