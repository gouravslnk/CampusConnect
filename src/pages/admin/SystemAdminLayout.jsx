import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, CalendarDays, Users, Shield } from 'lucide-react';
import { fetchAdminData } from '../../store/slices/adminSlice';
import { useToast } from '../../context/ToastContext';

export default function SystemAdminLayout() {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  
  const { clubs, events, users, loading, error } = useSelector((state) => state.admin);

  useEffect(() => {
    dispatch(fetchAdminData());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      showToast(error, { type: 'error' });
    }
  }, [error, showToast]);

  const pendingClubs = clubs.filter((club) => club.status === 'pending').length;
  const adminUsersCount = users.filter((item) => item.role === 'club_admin').length;

  const stats = [
    { label: 'Pending hubs', value: pendingClubs, icon: Clock, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Total events', value: events.length, icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Total users', value: users.length, icon: Users, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Hub Admins', value: adminUsersCount, icon: Shield, tone: 'bg-slate-100 text-slate-700 dark:text-slate-200' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <Shield size={14} className="text-blue-600 dark:text-blue-500" /> System Admin
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Admin Control Center</h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Approve hubs, remove events, and manage CampusConnect users.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{loading ? '-' : stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading admin data...</div>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
