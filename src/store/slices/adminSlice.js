import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const fetchAdminData = createAsyncThunk(
  'admin/fetchAdminData',
  async (_, { rejectWithValue }) => {
    try {
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

      if (clubResult.error) throw clubResult.error;
      if (eventResult.error) throw eventResult.error;
      if (userResult.error) throw userResult.error;

      const events = (eventResult.data || []).map((event) => ({
        ...event,
        registrations: event.event_registrations?.[0]?.count || 0,
        maxSeats: event.max_seats,
        organizerName: event.organizer?.name || 'Unknown',
      }));

      return {
        clubs: clubResult.data || [],
        events: events,
        users: userResult.data || [],
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch admin data');
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    clubs: [],
    events: [],
    users: [],
    loading: false,
    error: null,
  },
  reducers: {
    updateClub: (state, action) => {
      const index = state.clubs.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.clubs[index] = { ...state.clubs[index], ...action.payload };
      }
    },
    removeClub: (state, action) => {
      state.clubs = state.clubs.filter(c => c.id !== action.payload);
    },
    updateEvent: (state, action) => {
      const index = state.events.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = { ...state.events[index], ...action.payload };
      }
    },
    removeEvent: (state, action) => {
      state.events = state.events.filter(e => e.id !== action.payload);
    },
    updateUser: (state, action) => {
      const index = state.users.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...action.payload };
      }
    },
    removeUser: (state, action) => {
      state.users = state.users.filter(u => u.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminData.fulfilled, (state, action) => {
        state.loading = false;
        state.clubs = action.payload.clubs;
        state.events = action.payload.events;
        state.users = action.payload.users;
      })
      .addCase(fetchAdminData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { updateClub, removeClub, updateEvent, removeEvent, updateUser, removeUser } = adminSlice.actions;

export default adminSlice.reducer;
