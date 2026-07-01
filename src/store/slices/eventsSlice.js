import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_registrations(count)')
        .limit(100);

      if (error) throw error;

      const formatted = data.map(e => ({
        ...e,
        maxSeats: e.max_seats,
        registrations: e.event_registrations[0]?.count || 0
      }));
      return formatted;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSavedEvents = createAsyncThunk(
  'events/fetchSavedEvents',
  async (userId, { rejectWithValue }) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('events(*, event_registrations(count))')
        .eq('profile_id', userId);

      if (error) throw error;

      const formatted = data
        .map(b => b.events)
        .filter(Boolean)
        .map(e => ({
          ...e,
          maxSeats: e.max_seats,
          registrations: e.event_registrations[0]?.count || 0
        }));
      return formatted;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState: {
    data: [],
    savedData: [],
    loading: false,
    savedLoading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        if (!state.hasFetched) {
           state.loading = true;
        }
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.hasFetched = true;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchSavedEvents.pending, (state) => {
        // state.savedLoading = true; // We don't want a heavy spinner for this
      })
      .addCase(fetchSavedEvents.fulfilled, (state, action) => {
        state.savedData = action.payload;
      });
  }
});

export default eventsSlice.reducer;
