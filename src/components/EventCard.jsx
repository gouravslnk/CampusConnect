import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { useState } from 'react';

const categoryColors = {
  Hackathon: 'bg-purple-100 text-purple-700',
  Workshop: 'bg-blue-100 text-blue-700',
  Seminar: 'bg-green-100 text-green-700',
  Meetup: 'bg-orange-100 text-orange-700',
};

const statusColors = {
  available: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
  ongoing: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-slate-100 text-slate-700',
};

function isExpired(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(event.date) < today;
}

function getStatusLabel(event) {
  if (event.status === 'cancelled') return 'Cancelled';
  if (isExpired(event)) return 'Expired';
  if (event.status === 'closed') return 'Closed';
  return 'Available';
}

export default function EventCard({ event }) {
  const [imageFailed, setImageFailed] = useState(false);
  const maxSeats = Number(event.maxSeats) || 0;
  const filled = maxSeats > 0 ? Math.round((event.registrations / maxSeats) * 100) : 0;
  const statusLabel = getStatusLabel(event);
  const inactive = statusLabel !== 'Available';
  const showImage = event.image && !imageFailed;

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {showImage ? (
          <img
            src={event.image}
            alt={event.title}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 text-center">
            <div className="px-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{event.category || 'Campus Event'}</p>
              <p className="mt-2 line-clamp-2 text-lg font-black text-slate-700">{event.title}</p>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`badge ${categoryColors[event.category] || 'bg-gray-100 text-gray-700'}`}>
            {event.category}
          </span>
          <span className={`badge ${inactive ? 'bg-red-100 text-red-700' : statusColors[event.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-blue-600 font-semibold mb-1">{event.club}</p>
        <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2">{event.title}</h3>

        <div className="space-y-1.5 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} />
            <span>{new Date(event.date).toDateString()} &bull; {event.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} />
            <span>{event.venue}</span>
          </div>
        </div>

        {/* Registration bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1"><Users size={11}/> {event.registrations} registered</span>
            <span>{maxSeats} seats</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${filled >= 100 ? 'bg-red-500' : filled >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(filled, 100)}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4 mt-auto">
          {event.tags.map((tag) => (
            <span key={tag} className="badge bg-gray-100 text-gray-600">{tag}</span>
          ))}
        </div>

        <Link
          to={`/events/${event.id}`}
          className={`btn-primary text-sm text-center ${inactive ? 'bg-slate-700 hover:bg-slate-800' : ''}`}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
