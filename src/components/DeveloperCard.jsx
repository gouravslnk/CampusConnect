import { Github, Linkedin, MessageSquare, Briefcase, Code2, User } from 'lucide-react';

export default function DeveloperCard({
  dev,
  onOpenProfile,
  onConnect,
  onMessage,
  connectLabel = 'Connect',
  connectDisabled = false,
  connectTone = 'primary'
}) {
  const initials = dev.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
  const avatarUrl = dev.avatar || dev.avatar_url || dev.avatarUrl || dev.profile_image_url || dev.image || null;

  const handleCardClick = () => {
    if (onOpenProfile) onOpenProfile(dev);
  };

  const stopAndCall = (handler) => (event) => {
    event.stopPropagation();
    if (handler) handler(dev);
  };

  const connectToneClass = connectTone === 'danger'
    ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/50'
    : 'btn-primary';

  return (
    <div
      className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 dark:hover:border-slate-600 group relative h-full"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Top right Socials */}
      <div className="absolute top-5 right-5 flex items-center gap-1.5">
        {dev.github && (
          <a
            href={dev.github}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="GitHub"
          >
            <Github size={18} />
          </a>
        )}
        {dev.linkedin && (
          <a
            href={dev.linkedin}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-slate-800"
            title="LinkedIn"
          >
            <Linkedin size={18} />
          </a>
        )}
      </div>

      <div className="flex items-start gap-4 mb-4 pr-16">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={dev.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-blue-700 text-white ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-lg">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{dev.name}</h3>
            <span
              className={`badge px-2 py-0.5 text-[10px] ${dev.available ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
            >
              {dev.available ? 'Available' : 'Busy'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate">
            {dev.role || 'Student'} {dev.year && <span className="text-slate-400 dark:text-slate-500 font-normal"> • {dev.year}</span>}
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 line-clamp-2 min-h-[40px] leading-relaxed">
        {dev.bio || 'No bio provided.'}
      </p>

      <div className="flex flex-wrap justify-between gap-4 mb-5 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-blue-500 dark:text-blue-400" />
          <span><strong className="text-slate-900 dark:text-white font-semibold">{dev.projects}</strong> Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-purple-500 dark:text-purple-400" />
          <span><strong className="text-slate-900 dark:text-white font-semibold">{dev.hackathons}</strong> Hackathons</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 mt-auto">
        {(dev.skills || []).slice(0, 5).map((skill) => (
          <span key={skill} className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-sm">
            {skill}
          </span>
        ))}
        {(dev.skills || []).length > 5 && (
           <span className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
             +{(dev.skills.length - 5)} more
           </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto pt-5 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={stopAndCall(onConnect)}
          disabled={connectDisabled}
          className={`text-sm flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition-colors ${
            connectDisabled
              ? 'cursor-not-allowed border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              : connectToneClass
          }`}
        >
          <User size={16} /> {connectLabel}
        </button>
        <button
          type="button"
          onClick={stopAndCall(onMessage)}
          className="border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-500 transition-colors flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-transparent"
        >
          <MessageSquare size={16} /> Message
        </button>
      </div>
    </div>
  );
}
