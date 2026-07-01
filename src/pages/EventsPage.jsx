import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, Bookmark } from 'lucide-react';
import EventCard from '../components/EventCard';
import Pagination from '../components/Pagination';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, fetchSavedEvents } from '../store/slices/eventsSlice';
import { useAuth } from '../context/AuthContext';

const categories = ["All", "Hackathon", "Workshop", "Seminar", "Meetup"];
const sortOptions = ['Latest', 'Oldest', 'Most Popular', 'Seats Available'];

function isClosedOrExpired(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return event.status === 'closed' || event.status === 'cancelled' || new Date(event.date) < today;
}

function sortWithInactiveLast(a, b, sort) {
  const inactiveDiff = Number(isClosedOrExpired(a)) - Number(isClosedOrExpired(b));
  if (inactiveDiff !== 0) return inactiveDiff;

  if (sort === 'Latest') return new Date(b.date) - new Date(a.date);
  if (sort === 'Oldest') return new Date(a.date) - new Date(b.date);
  if (sort === 'Most Popular') return b.registrations - a.registrations;
  if (sort === 'Seats Available') return (b.maxSeats - b.registrations) - (a.maxSeats - a.registrations);
  return 0;
}

export default function EventsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('all'); // 'all' or 'saved'
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Latest');
  
  const dispatch = useDispatch();
  const { data: events, savedData: savedEvents, loading, hasFetched } = useSelector((state) => state.events);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (!hasFetched) {
      dispatch(fetchEvents());
    }
  }, [dispatch, hasFetched]);

  useEffect(() => {
    if (user) {
      dispatch(fetchSavedEvents(user.id));
    }
  }, [user, dispatch]);

  const displayEvents = tab === 'saved' ? savedEvents : events;
  
  const filtered = displayEvents
    .filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.club && e.club.toLowerCase().includes(search.toLowerCase()));
      const matchCat = category === 'All' || e.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => sortWithInactiveLast(a, b, sort));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentEvents = filtered.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">Campus Events</h1>
        <p className="text-gray-500 dark:text-gray-400">Discover and register for upcoming events on your campus.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setTab('all')}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 ${
            tab === 'all'
              ? 'text-blue-600 border-b-blue-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 border-b-transparent'
          }`}
        >
          All Events
        </button>
        {user && (
          <button
            onClick={() => setTab('saved')}
            className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-colors border-b-2 ${
              tab === 'saved'
                ? 'text-blue-600 border-b-blue-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 border-b-transparent'
            }`}
          >
            <Bookmark size={16} /> Saved Events
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search events or clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-gray-500 dark:text-gray-400" />
          <select
            className="input-field w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {sortOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {cat}
          </button>
        ))}
        {(search || category !== 'All') && (
          <button
            onClick={() => { setSearch(''); setCategory('All'); }}
            className="px-4 py-1.5 rounded-full text-sm text-red-500 border border-red-200 hover:bg-red-50 flex items-center gap-1"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {!loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Showing <strong>{currentEvents.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filtered.length)}</strong> of <strong>{filtered.length}</strong> event{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card overflow-hidden flex flex-col animate-pulse">
              <div className="h-44 bg-gray-200 dark:bg-slate-700"></div>
              <div className="p-4 flex flex-col flex-1">
                <div className="h-3 w-1/3 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-2/3 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="mt-auto pt-4">
                  <div className="h-10 w-full bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : currentEvents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
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
            totalItems={filtered.length}
          />
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {tab === 'saved' ? 'No saved events yet' : 'No events found'}
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'saved' 
              ? 'Bookmark events to save them for later!'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      )}
    </div>
  );
}
