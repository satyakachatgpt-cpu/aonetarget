import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VideoProgress {
  videoId: string;
  timestamp: number;
  duration: number;
  lastUpdated: number;
}

interface PlayerState {
  currentVideoId: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  progressMap: Record<string, VideoProgress>;
}

const initialState: PlayerState = {
  currentVideoId: null,
  isPlaying: false,
  playbackSpeed: 1,
  progressMap: {},
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentVideo: (state, action: PayloadAction<string>) => {
      state.currentVideoId = action.payload;
    },
    setPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    updateProgress: (state, action: PayloadAction<{ videoId: string; timestamp: number; duration: number }>) => {
      const { videoId, timestamp, duration } = action.payload;
      state.progressMap[videoId] = {
        videoId,
        timestamp,
        duration,
        lastUpdated: Date.now(),
      };
    },
    loadProgressFromStorage: (state, action: PayloadAction<Record<string, VideoProgress>>) => {
      state.progressMap = action.payload;
    },
  },
});

export const { setCurrentVideo, setPlaying, setPlaybackSpeed, updateProgress, loadProgressFromStorage } = playerSlice.actions;
export default playerSlice.reducer;
