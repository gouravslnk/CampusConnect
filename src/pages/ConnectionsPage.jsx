import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock3, MessageSquare, UserRoundCheck, UserRoundPlus, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConnections } from '../store/slices/connectionsSlice';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ConnectionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accepted, incomingPending, outgoingPending, loading } = useSelector((state) => state.connections);

  // Pagination State for Accepted Connections
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (user) {
      dispatch(fetchConnections(user.id));
    }
  }, [user, dispatch]);

  const updateRequestStatus = async (requestId, status) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      if (status === 'accepted') {
        showToast('Connection request accepted.', { type: 'success' });
      } else {
        showToast('Connection request declined.', { type: 'info' });
      }

      dispatch(fetchConnections(user.id));
    } catch (err) {
      console.error('Error updating request status:', err);
      showToast(err?.message || 'Failed to update request.', { type: 'error' });
    }
  };

  const cancelOutgoingRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId)
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      showToast('Connection request canceled.', { type: 'info' });
      dispatch(fetchConnections(user.id));
    } catch (err) {
      console.error('Error canceling outgoing request:', err);
      showToast(err?.message || 'Failed to cancel request.', { type: 'error' });
    }
  };

  const openChat = (otherUserId) => {
    navigate('/chat', { state: { startChatWith: otherUserId } });
  };

  const ProfileCard = ({ item, actions }) => {
    const profile = item.profile;
    const initials = (profile.name || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white ring-2 ring-slate-100">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 dark:text-white">{profile.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{profile.department || 'Department not set'}{profile.year ? ` • ${profile.year}` : ''}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{profile.bio || 'No bio yet.'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {actions}
          <Link
            to={`/profile/${item.otherUserId}`}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:border-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-700 dark:hover:text-cyan-400"
          >
            View Profile
          </Link>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(accepted.length / itemsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentAccepted = accepted.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-[linear-gradient(140deg,#f0f9ff_0%,#f8fafc_55%,#eef2ff_100%)] dark:bg-[linear-gradient(140deg,#1e293b_0%,#0f172a_55%,#020617_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Your Connections</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Manage accepted friends and pending requests in one place.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900 dark:text-white">{accepted.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Connected</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900 dark:text-white">{incomingPending.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Incoming</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-slate-900 dark:text-white">{outgoingPending.length}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Sent</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <UserRoundPlus size={16} className="text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Incoming Requests</h2>
        </div>

        {incomingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 text-sm text-slate-500 dark:text-slate-400">No incoming connection requests.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {incomingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'accepted')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(item.id, 'rejected')}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <X size={13} /> Decline
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 size={16} className="text-sky-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sent Requests</h2>
        </div>

        {outgoingPending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 text-sm text-slate-500 dark:text-slate-400">No pending requests sent by you.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {outgoingPending.map((item) => (
              <ProfileCard
                key={item.id}
                item={item}
                actions={
                  <>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                      <Clock3 size={13} /> Request Sent
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelOutgoingRequest(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <X size={13} /> Cancel Request
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <UserRoundCheck size={16} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Connected Friends</h2>
        </div>

        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 text-sm text-slate-500 dark:text-slate-400">You have no accepted connections yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {currentAccepted.map((item) => (
                <ProfileCard
                  key={item.id}
                  item={item}
                  actions={
                    <button
                      type="button"
                      onClick={() => openChat(item.otherUserId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors"
                    >
                      <MessageSquare size={13} /> Message
                    </button>
                  }
                />
              ))}
            </div>
            
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(num) => {
                setItemsPerPage(num);
                setCurrentPage(1);
              }}
              totalItems={accepted.length}
            />
          </>
        )}
      </section>
    </div>
  );
}
