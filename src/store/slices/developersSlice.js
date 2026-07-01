import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const fetchDevelopers = createAsyncThunk(
  'developers/fetchDevelopers',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, projects(id)')
        .limit(100);

      if (error) throw error;
      
      const formattedDevs = data
        .filter(profile => profile.role !== 'admin')
        .map(profile => ({
          ...profile,
          accountRole: profile.role,
          role: profile.department || 'Student',
          hackathons: profile.hackathons_won || 0,
          projects: profile.projects?.length || 0, 
          available: profile.available !== false,
          skills: profile.skills || []
        }));

      const skillsSet = new Set();
      formattedDevs.forEach(dev => {
        if (dev.skills) dev.skills.forEach(skill => skillsSet.add(skill));
      });
      const allSkills = Array.from(skillsSet).sort();

      return { developers: formattedDevs, allSkills };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const developersSlice = createSlice({
  name: 'developers',
  initialState: {
    data: [],
    allSkills: [],
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevelopers.pending, (state) => {
        if (!state.hasFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchDevelopers.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.developers;
        state.allSkills = action.payload.allSkills;
        state.hasFetched = true;
      })
      .addCase(fetchDevelopers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default developersSlice.reducer;
