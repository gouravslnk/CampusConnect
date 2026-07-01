import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, Search } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClubs } from '../store/slices/clubsSlice';

export default function ClubsPage() {
  const dispatch = useDispatch();
  const { data: clubs, loading, hasFetched } = useSelector((state) => state.clubs);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (!hasFetched) {
      dispatch(fetchClubs());
    }
  }, [dispatch, hasFetched]);

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.college.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClubs.length / itemsPerPage);
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentClubs = filteredClubs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campus Clubs</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Discover active clubs across your campus.</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search clubs by name or college..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
        />
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No clubs found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Try adjusting your search terms.' : 'No approved clubs yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentClubs.map(club => (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                className="group bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md transition-all p-6 flex flex-col h-full"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-700 transition-colors">{club.name}</h3>
                    <span className="bg-indigo-50 text-indigo-700 p-2 rounded-lg transition-colors group-hover:bg-indigo-100">
                      <Users className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                    <Building className="w-4 h-4 mr-1.5" />
                    {club.college}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-6">
                    {club.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Managed by <strong>{club.profiles?.name || 'Unknown'}</strong>
                  </span>
                </div>
              </Link>
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
            totalItems={filteredClubs.length}
          />
        </>
      )}
    </div>
  );
}
