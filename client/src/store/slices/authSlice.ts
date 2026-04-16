import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Student {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthState {
  student: Student | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  deviceId: string | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  student: null,
  isAuthenticated: false,
  accessToken: null,
  deviceId: null,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ student: Student; accessToken?: string; deviceId?: string }>) => {
      state.student = action.payload.student;
      state.isAuthenticated = true;
      state.accessToken = action.payload.accessToken || state.accessToken;
      state.deviceId = action.payload.deviceId || state.deviceId;
    },
    clearAuth: (state) => {
      state.student = null;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.deviceId = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
