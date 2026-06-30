import { configureStore } from '@reduxjs/toolkit';
import eventsReducer from './slices/eventsSlice';
import clubsReducer from './slices/clubsSlice';
import developersReducer from './slices/developersSlice';
import connectionsReducer from './slices/connectionsSlice';

export const store = configureStore({
  reducer: {
    events: eventsReducer,
    clubs: clubsReducer,
    developers: developersReducer,
    connections: connectionsReducer,
  },
});
