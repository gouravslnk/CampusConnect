import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const fetchConnections = createAsyncThunk(
  'connections/fetchConnections',
  async (userId, { rejectWithValue }) => {
    if (!userId) return null;
    try {
      const { data: requests, error } = await supabase
        .from('connection_requests')
        .select('id, requester_id, recipient_id, status, created_at, updated_at')
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const otherIds = [...new Set((requests || []).map((req) => (req.requester_id === userId ? req.recipient_id : req.requester_id)))];

      let profilesById = {};
      if (otherIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, department, year, avatar, bio')
          .in('id', otherIds);

        if (profilesError) throw profilesError;

        profilesById = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      const acceptedRows = [];
      const incomingRows = [];
      const outgoingRows = [];
      const connectionStatusById = {};

      for (const req of requests || []) {
        const otherUserId = req.requester_id === userId ? req.recipient_id : req.requester_id;
        const profile = profilesById[otherUserId];
        
        // Status mapping for Developers page
        if (req.status === 'accepted') {
          connectionStatusById[otherUserId] = 'connected';
        } else if (req.status === 'pending') {
          connectionStatusById[otherUserId] = req.requester_id === userId ? 'outgoing_pending' : 'incoming_pending';
        } else if (req.status === 'rejected' && req.requester_id === userId) {
          connectionStatusById[otherUserId] = 'rejected_outgoing';
        }

        if (!profile) continue;

        const row = {
          ...req,
          otherUserId,
          profile,
        };

        if (req.status === 'accepted') {
          acceptedRows.push(row);
        } else if (req.status === 'pending' && req.recipient_id === userId) {
          incomingRows.push(row);
        } else if (req.status === 'pending' && req.requester_id === userId) {
          outgoingRows.push(row);
        }
      }

      return {
        accepted: acceptedRows,
        incomingPending: incomingRows,
        outgoingPending: outgoingRows,
        connectionStatusById
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const connectionsSlice = createSlice({
  name: 'connections',
  initialState: {
    accepted: [],
    incomingPending: [],
    outgoingPending: [],
    connectionStatusById: {},
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnections.pending, (state) => {
        if (!state.hasFetched) {
          state.loading = true;
        }
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.accepted = action.payload.accepted;
          state.incomingPending = action.payload.incomingPending;
          state.outgoingPending = action.payload.outgoingPending;
          state.connectionStatusById = action.payload.connectionStatusById;
          state.hasFetched = true;
        }
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default connectionsSlice.reducer;
