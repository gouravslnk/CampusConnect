import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    async function loadSessionProfile(activeUser) {
      if (!activeUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Fetch the role and name from our custom public.profiles table
      const { data } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      if (data) {
        setUser({ ...activeUser, ...data });
      } else {
        setUser(activeUser);
      }
      setLoading(false);
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSessionProfile(session?.user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSessionProfile(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Presence effect
  useEffect(() => {
    if (!user?.id) {
      setOnlineUsers(new Set());
      return;
    }

    let isMounted = true;
    let channel;

    const initPresence = async () => {
      // Remove existing channel to avoid StrictMode errors
      const existingChannel = supabase.getChannels().find(c => c.topic === 'realtime:online_users');
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      if (!isMounted) return;

      channel = supabase.channel('online_users', {
        config: {
          presence: { key: user.id },
        },
      });

      channel.on('presence', { event: 'sync' }, () => {
        if (!isMounted) return;
        const state = channel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && isMounted) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    };

    initPresence();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, onlineUsers }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
