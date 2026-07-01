import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { updateClub, removeClub, updateUser, fetchAdminData } from '../../store/slices/adminSlice';

export default function HubApprovals() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { clubs, users } = useSelector((state) => state.admin);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Modals state
  const [hubRequestModal, setHubRequestModal] = useState(null);
  const [pendingHubModal, setPendingHubModal] = useState(null);
  const [manageHubModal, setManageHubModal] = useState(null);
  const [editHubData, setEditHubData] = useState({ name: '', description: '', owner_id: '' });

  const filteredClubs = clubs.filter((club) => {
    const q = search.toLowerCase();
    return [club.name, club.college, club.profiles?.name, club.status].some((value) => String(value || '').toLowerCase().includes(q));
  });

  const pendingClubs = filteredClubs.filter(c => c.status === 'pending');
  const approvedClubs = filteredClubs.filter(c => c.status !== 'pending');

  const handleApproveClub = async (club) => {
    setActionLoading(`club-${club.id}`);
    try {
      const { error: clubError } = await supabase.from('clubs').update({ status: 'approved' }).eq('id', club.id);
      if (clubError) throw clubError;

      const { error: roleError } = await supabase.from('profiles').update({ role: 'club_admin' }).eq('id', club.owner_id);
      if (roleError) throw roleError;

      const { error: memberError } = await supabase.from('club_members').upsert({
        club_id: club.id,
        profile_id: club.owner_id,
        status: 'approved',
      }, { onConflict: 'club_id,profile_id' });
      if (memberError) throw memberError;

      await supabase.from('notifications').insert({
        profile_id: club.owner_id,
        title: 'Hub approved',
        message: `Your hub "${club.name}" was approved. You can now manage events.`,
        link: '/dashboard',
        is_read: false,
      });

      dispatch(updateClub({ id: club.id, status: 'approved' }));
      dispatch(updateUser({ id: club.owner_id, role: 'club_admin' }));
      showToast('Hub approved.', { type: 'success' });
    } catch (err) {
      console.error('Error approving hub:', err);
      showToast(err?.message || 'Failed to approve hub.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClub = async (club) => {
    if (!window.confirm(`Reject "${club.name}"?`)) return;
    setActionLoading(`club-${club.id}`);
    try {
      const { error } = await supabase.from('clubs').update({ status: 'rejected' }).eq('id', club.id);
      if (error) throw error;

      await supabase.from('notifications').insert({
        profile_id: club.owner_id,
        title: 'Hub request rejected',
        message: `Your request to create "${club.name}" was not approved.`,
        link: '/dashboard',
        is_read: false,
      });

      dispatch(updateClub({ id: club.id, status: 'rejected' }));
      showToast('Hub rejected.', { type: 'info' });
    } catch (err) {
      console.error('Error rejecting hub:', err);
      showToast(err?.message || 'Failed to reject hub.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveHub = async () => {
    if (!manageHubModal) return;
    setActionLoading(`hub-save-${manageHubModal.id}`);
    try {
      const { error } = await supabase.from('clubs').update({
        name: editHubData.name,
        description: editHubData.description,
        owner_id: editHubData.owner_id
      }).eq('id', manageHubModal.id);
      
      if (error) throw error;
      
      if (manageHubModal.owner_id !== editHubData.owner_id) {
        if (manageHubModal.owner_id) {
           await supabase.from('profiles').update({ role: 'student' }).eq('id', manageHubModal.owner_id);
           dispatch(updateUser({ id: manageHubModal.owner_id, role: 'student' }));
        }
        if (editHubData.owner_id) {
           await supabase.from('profiles').update({ role: 'club_admin' }).eq('id', editHubData.owner_id);
           dispatch(updateUser({ id: editHubData.owner_id, role: 'club_admin' }));
        }
      }

      dispatch(updateClub({ id: manageHubModal.id, ...editHubData }));
      showToast('Hub updated successfully.', { type: 'success' });
      setManageHubModal(null);
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Failed to update hub.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClub = async (club) => {
    if (!window.confirm(`Delete hub "${club.name}"? This permanently removes the hub and its members.`)) return;
    setActionLoading(`club-delete-${club.id}`);
    try {
      const { error } = await supabase.from('clubs').delete().eq('id', club.id);
      if (error) throw error;

      dispatch(removeClub(club.id));

      const remainingOwnedClubs = clubs.filter((item) => item.owner_id === club.owner_id && item.id !== club.id);
      if (club.owner_id && remainingOwnedClubs.length === 0) {
        const { error: roleError } = await supabase.from('profiles').update({ role: 'student' }).eq('id', club.owner_id);
        if (!roleError) {
           dispatch(updateUser({ id: club.owner_id, role: 'student' }));
        }
      }

      showToast('Hub deleted.', { type: 'success' });
    } catch (err) {
      console.error('Error deleting hub:', err);
      showToast(err?.message || 'Failed to delete hub.', { type: 'error' });
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
            placeholder="Search hubs..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-8 p-6">
        {/* Pending Hub Requests */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Pending Hub Requests</h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
              {pendingClubs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No pending requests.</div>
              ) : pendingClubs.map((club) => (
                <div key={club.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{club.name}</h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{club.college}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Requested by <strong>{club.profiles?.name || 'Unknown'}</strong>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPendingHubModal(club)}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Open Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Hubs */}
        <div>
          <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">All Hubs</h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900">
              {approvedClubs.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No hubs found.</div>
              ) : approvedClubs.map((club) => (
                <div key={club.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/clubs/${club.id}`)}
                        className="font-bold text-slate-900 dark:text-white text-left transition hover:text-cyan-700"
                      >
                        {club.name}
                      </button>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        club.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {club.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{club.college}</p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{club.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setManageHubModal(club);
                        setEditHubData({ name: club.name || '', description: club.description || '', owner_id: club.owner_id || '' });
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Hub Request Modal */}
      {pendingHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Pending Request: {pendingHubModal.name}</h3>
              <button onClick={() => setPendingHubModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500">College</h4>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{pendingHubModal.college}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500">Description</h4>
                <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{pendingHubModal.description}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500">Requested By</h4>
                <p className="mt-1 text-slate-700 dark:text-slate-300">{pendingHubModal.profiles?.name} ({pendingHubModal.profiles?.email})</p>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => { handleRejectClub(pendingHubModal); setPendingHubModal(null); }}
                disabled={actionLoading === `club-${pendingHubModal.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
              >
                Reject Request
              </button>
              <button
                onClick={() => { handleApproveClub(pendingHubModal); setPendingHubModal(null); }}
                disabled={actionLoading === `club-${pendingHubModal.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Approve Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Hub Modal */}
      {manageHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Manage Hub</h3>
              <button onClick={() => setManageHubModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hub Name</label>
                <input
                  type="text"
                  value={editHubData.name}
                  onChange={(e) => setEditHubData({ ...editHubData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={editHubData.description}
                  onChange={(e) => setEditHubData({ ...editHubData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Club Admin</label>
                <select
                  value={editHubData.owner_id || ''}
                  onChange={(e) => setEditHubData({ ...editHubData, owner_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Select an Admin --</option>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this hub? This cannot be undone.')) {
                    handleDeleteClub(manageHubModal);
                    setManageHubModal(null);
                  }
                }}
                disabled={actionLoading === `club-delete-${manageHubModal.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50"
              >
                Delete Hub
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setManageHubModal(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHub}
                  disabled={actionLoading === `hub-save-${manageHubModal.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
