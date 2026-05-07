import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  CalendarDays,
  Check,
  Clock,
  Power,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const tabs = [
  { id: 'clubs', label: 'Hub approvals', icon: Building },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'users', label: 'Users', icon: Users },
];

function formatDate(value) {
  if (!value) return 'Date TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roleLabel(role) {
  if (role === 'admin') return 'System Admin';
  if (role === 'club_admin') return 'Hub Admin';
  return 'Student';
}

export default function SystemAdminDashboard({ user }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clubs');
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [manageUser, setManageUser] = useState(null);

  const clubsByOwner = useMemo(() => clubs.reduce((map, club) => {
    if (!club.owner_id) return map;
    if (!map[club.owner_id]) map[club.owner_id] = [];
    map[club.owner_id].push(club);
    return map;
  }, {}), [clubs]);

  const fetchAdminData = async () => {
    setLoading(true);

    const [clubResult, eventResult, userResult] = await Promise.all([
      supabase
        .from('clubs')
        .select('id, name, college, description, created_at, status, owner_id, profiles:owner_id(name, email)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('*, organizer:profiles(name), event_registrations(count)')
        .order('date', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name, email, role, department, year, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (clubResult.error) showToast('Could not load hub requests.', { type: 'error' });
    if (eventResult.error) showToast('Could not load events.', { type: 'error' });
    if (userResult.error) showToast('Could not load users.', { type: 'error' });

    setClubs(clubResult.data || []);
    setEvents((eventResult.data || []).map((event) => ({
      ...event,
      registrations: event.event_registrations?.[0]?.count || 0,
      maxSeats: event.max_seats,
      organizerName: event.organizer?.name || 'Unknown',
    })));
    setUsers(userResult.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const stats = useMemo(() => {
    const pendingClubs = clubs.filter((club) => club.status === 'pending').length;
    return [
      { label: 'Pending hubs', value: pendingClubs, icon: Clock, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Total events', value: events.length, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
      { label: 'Total users', value: users.length, icon: Users, tone: 'bg-cyan-50 text-cyan-700' },
      { label: 'Admins', value: users.filter((item) => item.role === 'admin' || item.role === 'club_admin').length, icon: Shield, tone: 'bg-slate-100 text-slate-700' },
    ];
  }, [clubs, events, users]);

  const filteredClubs = clubs.filter((club) => {
    const q = search.toLowerCase();
    return [club.name, club.college, club.profiles?.name, club.status].some((value) => String(value || '').toLowerCase().includes(q));
  });

  const filteredEvents = events.filter((event) => {
    const q = search.toLowerCase();
    return [event.title, event.club, event.category, event.venue, event.status].some((value) => String(value || '').toLowerCase().includes(q));
  });

  const filteredUsers = users.filter((profile) => {
    const q = search.toLowerCase();
    return [profile.name, profile.email, profile.department, profile.role].some((value) => String(value || '').toLowerCase().includes(q));
  });

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

      setClubs((current) => current.map((item) => (item.id === club.id ? { ...item, status: 'approved' } : item)));
      setUsers((current) => current.map((item) => (item.id === club.owner_id ? { ...item, role: 'club_admin' } : item)));
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

      setClubs((current) => current.map((item) => (item.id === club.id ? { ...item, status: 'rejected' } : item)));
      showToast('Hub rejected.', { type: 'info' });
    } catch (err) {
      console.error('Error rejecting hub:', err);
      showToast(err?.message || 'Failed to reject hub.', { type: 'error' });
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

      setClubs((current) => current.filter((item) => item.id !== club.id));

      const remainingOwnedClubs = clubs.filter((item) => item.owner_id === club.owner_id && item.id !== club.id);
      if (club.owner_id && remainingOwnedClubs.length === 0) {
        const { error: roleError } = await supabase.from('profiles').update({ role: 'student' }).eq('id', club.owner_id);
        if (roleError) throw roleError;

        setUsers((current) => current.map((item) => (item.id === club.owner_id ? { ...item, role: 'student' } : item)));
      }

      showToast('Hub deleted.', { type: 'success' });
    } catch (err) {
      console.error('Error deleting hub:', err);
      showToast(err?.message || 'Failed to delete hub.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEventStatus = async (event) => {
    const nextStatus = event.status === 'closed' ? 'available' : 'closed';
    setActionLoading(`event-${event.id}`);

    const { error } = await supabase.from('events').update({ status: nextStatus }).eq('id', event.id);
    if (error) {
      showToast(error.message || 'Failed to update event.', { type: 'error' });
    } else {
      setEvents((current) => current.map((item) => (item.id === event.id ? { ...item, status: nextStatus } : item)));
      showToast(nextStatus === 'closed' ? 'Event closed.' : 'Event reopened.', { type: 'success' });
    }

    setActionLoading(null);
  };

  const handleDeleteEvent = async (event) => {
    if (!window.confirm(`Remove "${event.title}" from CampusConnect?`)) return;
    setActionLoading(`event-${event.id}`);

    const { error } = await supabase.from('events').delete().eq('id', event.id);
    if (error) {
      showToast(error.message || 'Failed to remove event.', { type: 'error' });
    } else {
      setEvents((current) => current.filter((item) => item.id !== event.id));
      showToast('Event removed.', { type: 'success' });
    }

    setActionLoading(null);
  };

  const handleDeleteUser = async (profile) => {
    if (profile.id === user?.id) {
      showToast('You cannot remove your own system admin account here.', { type: 'warning' });
      return;
    }
    if (!window.confirm(`Remove ${profile.name || profile.email} from CampusConnect? This deletes their account data.`)) return;

    setActionLoading(`user-${profile.id}`);

    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: profile.id });
    if (error) {
      showToast(error.message || 'Failed to remove user. Apply the admin SQL migration if this RPC is missing.', { type: 'error', duration: 5500 });
    } else {
      setUsers((current) => current.filter((item) => item.id !== profile.id));
      showToast('User removed.', { type: 'success' });
    }

    setActionLoading(null);
  };

  const handleAssignClubAdmin = async (clubId, targetUserId) => {
    setActionLoading(`assign-${clubId}`);
    try {
      const club = clubs.find(c => c.id === clubId);
      const oldOwnerId = club?.owner_id;

      // Update club
      const { error: clubError } = await supabase.from('clubs').update({ owner_id: targetUserId }).eq('id', clubId);
      if (clubError) throw clubError;

      // Update new owner role
      const { error: newOwnerError } = await supabase.from('profiles').update({ role: 'club_admin' }).eq('id', targetUserId);
      if (newOwnerError) throw newOwnerError;

      // Check if old owner needs role demotion
      let demoteOldOwner = false;
      if (oldOwnerId && oldOwnerId !== targetUserId) {
        const remaining = clubs.filter(c => c.owner_id === oldOwnerId && c.id !== clubId);
        if (remaining.length === 0) {
          await supabase.from('profiles').update({ role: 'student' }).eq('id', oldOwnerId);
          demoteOldOwner = true;
        }
      }

      // Update local states
      setClubs(current => current.map(c => c.id === clubId ? { ...c, owner_id: targetUserId } : c));
      setUsers(current => current.map(u => {
        if (u.id === targetUserId) return { ...u, role: 'club_admin' };
        if (demoteOldOwner && u.id === oldOwnerId) return { ...u, role: 'student' };
        return u;
      }));
      
      showToast('User assigned as hub admin.', { type: 'success' });
    } catch (err) {
      console.error(err);
      showToast('Failed to assign admin.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveClubAdmin = async (clubId, currentOwnerId) => {
    setActionLoading(`remove-${clubId}`);
    try {
      const { error: clubError } = await supabase.from('clubs').update({ owner_id: null }).eq('id', clubId);
      if (clubError) throw clubError;

      let demoteOwner = false;
      if (currentOwnerId) {
        const remaining = clubs.filter(c => c.owner_id === currentOwnerId && c.id !== clubId);
        if (remaining.length === 0) {
          await supabase.from('profiles').update({ role: 'student' }).eq('id', currentOwnerId);
          demoteOwner = true;
        }
      }

      setClubs(current => current.map(c => c.id === clubId ? { ...c, owner_id: null } : c));
      if (demoteOwner) {
        setUsers(current => current.map(u => u.id === currentOwnerId ? { ...u, role: 'student' } : u));
      }

      showToast('Hub admin removed.', { type: 'success' });
    } catch (err) {
      console.error(err);
      showToast('Failed to remove admin.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const renderClubs = () => (
    <div className="divide-y divide-slate-100">
      {filteredClubs.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No hub requests match your search.</div>
      ) : filteredClubs.map((club) => (
        <div key={club.id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => club.owner_id && navigate(`/profile/${club.owner_id}`)}
                  disabled={!club.owner_id}
                  className="font-bold text-slate-900 text-left transition hover:text-cyan-700 disabled:cursor-default disabled:hover:text-slate-900"
                  title={club.owner_id ? 'Open the hub owner profile' : 'No hub owner available'}
                >
                  {club.name}
                </button>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  club.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : club.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {club.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{club.college}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{club.description || 'No description provided.'}</p>
              <p className="mt-2 text-xs text-slate-500">
                Requested by <strong>{club.profiles?.name || 'Unknown'}</strong> ({club.profiles?.email || 'no email'})
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApproveClub(club)}
                disabled={club.status === 'approved' || actionLoading === `club-${club.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={15} /> Approve
              </button>
              <button
                onClick={() => handleRejectClub(club)}
                disabled={club.status === 'rejected' || actionLoading === `club-${club.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={15} /> Reject
              </button>
              <button
                onClick={() => handleDeleteClub(club)}
                disabled={actionLoading === `club-delete-${club.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEvents = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Event</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Registrations</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredEvents.length === 0 ? (
            <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-500">No events match your search.</td></tr>
          ) : filteredEvents.map((event) => (
            <tr key={event.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4">
                <p className="font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">{event.club || 'CampusConnect'} • {event.category} • {event.venue}</p>
              </td>
              <td className="px-5 py-4 text-slate-600">{formatDate(event.date)}</td>
              <td className="px-5 py-4 text-slate-600">{event.registrations} / {event.maxSeats || event.max_seats || 0}</td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${event.status === 'closed' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {event.status}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleEventStatus(event)}
                    disabled={actionLoading === `event-${event.id}`}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    title={event.status === 'closed' ? 'Reopen event' : 'Close event'}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    disabled={actionLoading === `event-${event.id}`}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
  );

  const renderUsers = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">User</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Hub</th>
            <th className="px-5 py-3">Department</th>
            <th className="px-5 py-3">Joined</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500">No users match your search.</td></tr>
          ) : filteredUsers.map((profile) => (
            <tr key={profile.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${profile.id}`)}
                  className="flex items-center gap-3 text-left transition hover:opacity-80"
                  title="Open profile"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {(profile.name || profile.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{profile.name || 'Unnamed user'}</p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                </button>
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${profile.role === 'admin' ? 'bg-slate-900 text-white' : profile.role === 'club_admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'}`}>
                  {roleLabel(profile.role)}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-600">
                {profile.role === 'club_admin'
                  ? (clubsByOwner[profile.id]?.length
                    ? clubsByOwner[profile.id].map((club) => club.name).join(', ')
                    : 'Hub not found')
                  : '-'}
              </td>
              <td className="px-5 py-4 text-slate-600">{profile.department || '-'}</td>
              <td className="px-5 py-4 text-slate-600">{formatDate(profile.created_at)}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setManageUser(profile)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Building size={14} /> Hubs
                  </button>
                  <button
                    onClick={() => handleDeleteUser(profile)}
                    disabled={profile.id === user?.id || actionLoading === `user-${profile.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const activeTitle = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            <Shield size={14} /> System Admin
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Control Center</h1>
          <p className="mt-1 text-sm text-slate-500">Approve hubs, remove events, and manage CampusConnect users.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in as</p>
          <p className="font-bold text-slate-900">{user?.name || 'System Admin'}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-black text-slate-900">{loading ? '-' : stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={16} /> {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${activeTitle?.toLowerCase()}...`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading admin data...</div>
        ) : (
          <>
            {activeTab === 'clubs' && renderClubs()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'users' && renderUsers()}
          </>
        )}
      </div>

      {manageUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Manage Hub Admin</h3>
                <p className="text-sm text-gray-500">{manageUser.name || manageUser.email}</p>
              </div>
              <button
                onClick={() => setManageUser(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <h4 className="font-semibold text-slate-900 mb-3 text-sm uppercase tracking-wide">Approved Hubs</h4>
              <div className="space-y-3">
                {clubs.filter(c => c.status === 'approved').length === 0 && (
                  <p className="text-sm text-slate-500">No approved hubs available.</p>
                )}
                {clubs.filter(c => c.status === 'approved').map(club => {
                  const isOwner = club.owner_id === manageUser.id;
                  return (
                    <div key={club.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{club.name}</p>
                        <p className="text-xs text-slate-500">
                           {isOwner ? 'Current Admin' : (club.owner_id ? 'Has another admin' : 'No admin assigned')}
                        </p>
                      </div>
                      {isOwner ? (
                        <button
                          onClick={() => handleRemoveClubAdmin(club.id, manageUser.id)}
                          disabled={actionLoading === `remove-${club.id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Remove Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssignClubAdmin(club.id, manageUser.id)}
                          disabled={actionLoading === `assign-${club.id}`}
                          className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                        >
                          Make Admin
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
