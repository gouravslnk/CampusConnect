import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Trash2, Edit3, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { updateEvent, removeEvent } from '../../store/slices/adminSlice';

function formatDate(value) {
  if (!value) return 'Date TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminEvents() {
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const { events } = useSelector((state) => state.admin);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Edit Event State
  const [editEventModal, setEditEventModal] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', venue: '', date: '' });

  const filteredEvents = events.filter((event) => {
    const q = search.toLowerCase();
    return [event.title, event.club, event.category, event.venue, event.status].some((value) => String(value || '').toLowerCase().includes(q));
  });



  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Remove "${event.title}" from CampusConnect?`)) return;
    setActionLoading(`event-${event.id}`);

    const { error } = await supabase.from('events').delete().eq('id', event.id);
    if (error) {
      showToast(error.message || 'Failed to remove event.', { type: 'error' });
    } else {
      dispatch(removeEvent(event.id));
      showToast('Event removed.', { type: 'success' });
    }

    setActionLoading(null);
  };

  const handleOpenEdit = (event) => {
    setEditEventModal(event);
    setEditFormData({
      title: event.title || '',
      description: event.description || '',
      venue: event.venue || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : ''
    });
  };

  const handleSaveEvent = async () => {
    if (!editEventModal) return;
    setActionLoading(`event-save-${editEventModal.id}`);

    try {
      const payload = {
        title: editFormData.title,
        description: editFormData.description,
        venue: editFormData.venue,
        date: editFormData.date || null
      };

      // Auto-update status if it was closed and we change the date to the future
      if (editFormData.date && editEventModal.status === 'closed') {
         if (new Date(editFormData.date) > new Date()) {
           payload.status = 'available';
         }
      }

      const { error } = await supabase.from('events').update(payload).eq('id', editEventModal.id);
      if (error) throw error;

      dispatch(updateEvent({ id: editEventModal.id, ...payload }));
      showToast('Event updated successfully.', { type: 'success' });
      setEditEventModal(null);
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Failed to update event.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="border-b border-slate-100 p-4">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9 w-full"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-5 py-3">Event</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Registrations</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEvents.length === 0 ? (
              <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">No events match your search.</td></tr>
            ) : filteredEvents.map((event) => (
              <tr key={event.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900 dark:text-white">{event.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{event.club || 'CampusConnect'} • {event.category} • {event.venue}</p>
                </td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(event.date)}</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{event.registrations} / {event.maxSeats || event.max_seats || 0}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${event.status === 'closed' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                    {event.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(event)}
                      className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50"
                      title="Edit event"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(event)}
                      disabled={actionLoading === `event-${event.id}`}
                      className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50"
                      title="Remove event"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Event Modal */}
      {editEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Edit Event Details</h3>
              <button onClick={() => setEditEventModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows="4"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    value={editFormData.venue}
                    onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => setEditEventModal(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={actionLoading === `event-save-${editEventModal.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
