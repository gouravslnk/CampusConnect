import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Trash2, X, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { updateUser, removeUser, updateClub } from '../../store/slices/adminSlice';
import { useAuth } from '../../context/AuthContext';

function formatDate(value) {
  if (!value) return 'Date TBA';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function roleLabel(role) {
  if (role === 'admin') return 'System Admin';
  if (role === 'club_admin') return 'Hub Admin';
  return 'Student';
}

export default function AdminUsers() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: currentUser } = useAuth();

  const { users, clubs } = useSelector((state) => state.admin);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  
  // Single edit modal for user details + hub admin assignment
  const [editUser, setEditUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', department: '' });

  const filteredUsers = users.filter((profile) => {
    const q = search.toLowerCase();
    return [profile.name, profile.email, profile.department, profile.role].some((value) => String(value || '').toLowerCase().includes(q));
  });

  const clubAdmins = filteredUsers.filter(u => u.role === 'club_admin');
  const normalStudents = filteredUsers.filter(u => u.role === 'student');

  const clubsByOwner = useMemo(() => clubs.reduce((map, club) => {
    if (!club.owner_id) return map;
    if (!map[club.owner_id]) map[club.owner_id] = [];
    map[club.owner_id].push(club);
    return map;
  }, {}), [clubs]);

  const handleDeleteUser = async (profile) => {
    if (profile.id === currentUser?.id) {
      showToast('You cannot remove your own system admin account here.', { type: 'warning' });
      return;
    }
    if (!window.confirm(`Remove ${profile.name || profile.email} from CampusConnect? This deletes their account data.`)) return;

    setActionLoading(`user-${profile.id}`);

    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: profile.id });
    if (error) {
      showToast(error.message || 'Failed to remove user. Apply the admin SQL migration if this RPC is missing.', { type: 'error', duration: 5500 });
    } else {
      dispatch(removeUser(profile.id));
      showToast('User removed.', { type: 'success' });
    }

    setActionLoading(null);
  };

  const handleOpenEdit = (profile) => {
    setEditUser(profile);
    setEditFormData({
      name: profile.name || '',
      department: profile.department || ''
    });
  };

  const handleSaveUserDetails = async () => {
    if (!editUser) return;
    setActionLoading(`save-${editUser.id}`);

    try {
      const payload = {
        name: editFormData.name,
        department: editFormData.department
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', editUser.id);
      if (error) throw error;

      dispatch(updateUser({ id: editUser.id, ...payload }));
      showToast('User details updated.', { type: 'success' });
    } catch (err) {
      console.error(err);
      showToast(err?.message || 'Failed to update user details.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignClubAdmin = async (clubId, targetUserId) => {
    setActionLoading(`assign-${clubId}`);
    try {
      const club = clubs.find(c => c.id === clubId);
      const oldOwnerId = club?.owner_id;

      const { error: clubError } = await supabase.from('clubs').update({ owner_id: targetUserId }).eq('id', clubId);
      if (clubError) throw clubError;

      const { error: newOwnerError } = await supabase.from('profiles').update({ role: 'club_admin' }).eq('id', targetUserId);
      if (newOwnerError) throw newOwnerError;

      let demoteOldOwner = false;
      if (oldOwnerId && oldOwnerId !== targetUserId) {
        const remaining = clubs.filter(c => c.owner_id === oldOwnerId && c.id !== clubId);
        if (remaining.length === 0) {
          await supabase.from('profiles').update({ role: 'student' }).eq('id', oldOwnerId);
          demoteOldOwner = true;
        }
      }

      dispatch(updateClub({ id: clubId, owner_id: targetUserId }));
      dispatch(updateUser({ id: targetUserId, role: 'club_admin' }));
      if (demoteOldOwner && oldOwnerId) {
        dispatch(updateUser({ id: oldOwnerId, role: 'student' }));
      }
      
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

      dispatch(updateClub({ id: clubId, owner_id: null }));
      if (demoteOwner && currentOwnerId) {
        dispatch(updateUser({ id: currentOwnerId, role: 'student' }));
      }

      showToast('Hub admin removed.', { type: 'success' });
    } catch (err) {
      console.error(err);
      showToast('Failed to remove admin.', { type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const UserTable = ({ userList, title, showHubsColumn = false }) => (
    <div className="mb-8">
      <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white px-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              {showHubsColumn && <th className="px-5 py-3 font-semibold">Hub</th>}
              <th className="px-5 py-3 font-semibold">Department</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {userList.length === 0 ? (
              <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">No users found in this category.</td></tr>
            ) : userList.map((profile) => (
              <tr key={profile.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                    className="flex items-center gap-3 text-left transition hover:opacity-80"
                    title="Open profile"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {(profile.name || profile.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{profile.name || 'Unnamed user'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
                    </div>
                  </button>
                </td>
                <td className="px-5 py-4">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${profile.role === 'admin' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : profile.role === 'club_admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'}`}>
                    {roleLabel(profile.role)}
                  </span>
                </td>
                {showHubsColumn && (
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                    {profile.role === 'club_admin'
                      ? (clubsByOwner[profile.id]?.length
                        ? clubsByOwner[profile.id].map((club) => club.name).join(', ')
                        : 'Hub not found')
                      : '-'}
                  </td>
                )}
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{profile.department || '-'}</td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(profile.created_at)}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(profile)}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                      title="Edit Profile & Hub Access"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(profile)}
                      disabled={profile.id === currentUser?.id || actionLoading === `user-${profile.id}`}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Remove User"
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
    </div>
  );

  return (
    <>
      <div className="border-b border-slate-100 dark:border-slate-800 p-4">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9 w-full"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users..."
          />
        </div>
      </div>

      <div className="py-4">
        <UserTable userList={clubAdmins} title="Hub Admins" showHubsColumn={true} />
        <UserTable userList={normalStudents} title="Students" />
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile & Access</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{editUser.email}</p>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700 dark:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Profile Details Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Profile Details</h4>
                  <button
                    onClick={handleSaveUserDetails}
                    disabled={actionLoading === `save-${editUser.id}`}
                    className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    Save Details
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </section>

              {/* Hub Access Section */}
              <section>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm uppercase tracking-wide">Hub Access Control</h4>
                <div className="space-y-3">
                  {clubs.filter(c => c.status === 'approved').length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No approved hubs available.</p>
                  )}
                  {clubs.filter(c => c.status === 'approved').map(club => {
                    const isOwner = club.owner_id === editUser.id;
                    return (
                      <div key={club.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-200 dark:hover:border-slate-700 transition">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{club.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             {isOwner ? 'Current Admin' : (club.owner_id ? 'Has another admin' : 'No admin assigned')}
                          </p>
                        </div>
                        {isOwner ? (
                          <button
                            onClick={() => handleRemoveClubAdmin(club.id, editUser.id)}
                            disabled={actionLoading === `remove-${club.id}`}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignClubAdmin(club.id, editUser.id)}
                            disabled={actionLoading === `assign-${club.id}`}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition disabled:opacity-50 whitespace-nowrap"
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
