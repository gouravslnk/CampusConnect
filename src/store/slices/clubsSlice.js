import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const fetchClubs = createAsyncThunk(
  'clubs/fetchClubs',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select(`id, name, college, description, created_at, profiles:owner_id (name)`)
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const clubsSlice = createSlice({
  name: 'clubs',
  initialState: {
    data: [],
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClubs.pending, (state) => {
        if (!state.hasFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchClubs.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.hasFetched = true;
      })
      .addCase(fetchClubs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default clubsSlice.reducer;
