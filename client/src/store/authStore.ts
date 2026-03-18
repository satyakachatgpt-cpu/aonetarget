import { create } from 'zustand';

interface AuthState {
    student: any;
    isAuthenticated: boolean;
    isLoading: boolean;
    unreadNotificationsCount: number;
    accessToken: string | null;
    deviceId: string | null;
    sessionRevoked: boolean;
    setAuth: (student: any, accessToken?: string, deviceId?: string) => void;
    clearAuth: () => void;
    checkAuth: () => Promise<void>;
    setUnreadCount: (count: number) => void;
    refreshToken: () => Promise<boolean>;
    startHeartbeat: () => void;
    stopHeartbeat: () => void;
    dismissRevoked: () => void;
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let tokenRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

const _cached = (() => {
    try {
        const isAuth = localStorage.getItem('isStudentAuthenticated') === 'true';
        const raw = localStorage.getItem('studentData');
        const student = isAuth && raw ? JSON.parse(raw) : null;
        const accessToken = localStorage.getItem('accessToken');
        const deviceId = localStorage.getItem('deviceId');
        return { student, isAuthenticated: !!(isAuth && student), isLoading: false, accessToken, deviceId };
    } catch {
        return { student: null, isAuthenticated: false, isLoading: false, accessToken: null, deviceId: null };
    }
})();

function scheduleTokenRefresh(store: any) {
    if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
    tokenRefreshTimeout = setTimeout(() => {
        store.getState().refreshToken();
    }, 12 * 60 * 1000);
}

export const useAuthStore = create<AuthState>((set, get) => ({
    ..._cached,
    unreadNotificationsCount: 0,
    sessionRevoked: false,

    setAuth: (student, accessToken?: string, deviceId?: string) => {
        if (!student) {
            localStorage.removeItem('isStudentAuthenticated');
            localStorage.removeItem('studentData');
            localStorage.removeItem('studentSessionToken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('deviceId');
            set({ student: null, isAuthenticated: false, isLoading: false, accessToken: null, deviceId: null });
        } else {
            localStorage.setItem('isStudentAuthenticated', 'true');
            localStorage.setItem('studentData', JSON.stringify(student));
            if (student.sessionToken) {
                localStorage.setItem('studentSessionToken', student.sessionToken);
            }
            if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
            }
            if (deviceId) {
                localStorage.setItem('deviceId', deviceId);
            }
            set({
                student,
                isAuthenticated: true,
                isLoading: false,
                accessToken: accessToken || get().accessToken,
                deviceId: deviceId || get().deviceId,
                sessionRevoked: false
            });

            get().startHeartbeat();
            if (accessToken) {
                scheduleTokenRefresh({ getState: get });
            }
        }
    },

    clearAuth: async () => {
        get().stopHeartbeat();
        if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
        try {
            const token = localStorage.getItem('accessToken');
            await fetch('/api/logout', {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
        } catch (e) { }
        localStorage.removeItem('isStudentAuthenticated');
        localStorage.removeItem('studentData');
        localStorage.removeItem('studentSessionToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('deviceId');
        set({ student: null, isAuthenticated: false, accessToken: null, deviceId: null, sessionRevoked: false });
    },

    checkAuth: async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/me', { headers });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('isStudentAuthenticated', 'true');
                localStorage.setItem('studentData', JSON.stringify(data.student));
                if (!localStorage.getItem('studentSessionToken')) {
                    localStorage.setItem('studentSessionToken', 'legacy-cookie-session');
                }
                set({ student: data.student, isAuthenticated: true, isLoading: false });
                get().startHeartbeat();
            } else if (response.status === 401) {
                const data = await response.json().catch(() => ({}));
                if (data.code === 'TOKEN_EXPIRED') {
                    const refreshed = await get().refreshToken();
                    if (refreshed) {
                        return get().checkAuth();
                    }
                }
                localStorage.removeItem('isStudentAuthenticated');
                localStorage.removeItem('studentData');
                localStorage.removeItem('studentSessionToken');
                localStorage.removeItem('accessToken');
                set({ student: null, isAuthenticated: false, isLoading: false });
            } else {
                set((s) => ({ ...s, isLoading: false }));
            }
        } catch {
            set((s) => ({ ...s, isLoading: false }));
        }
    },

    refreshToken: async () => {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                set({ accessToken: data.accessToken });
                scheduleTokenRefresh({ getState: get });
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },

    startHeartbeat: () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        const doHeartbeat = async () => {
            const state = get();
            if (!state.isAuthenticated || !state.student) return;

            try {
                const token = localStorage.getItem('accessToken');
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch('/api/heartbeat', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        deviceId: state.deviceId,
                        studentId: state.student?.id || state.student?._id
                    })
                });

                const data = await response.json();

                if (!data.valid) {
                    if (data.reason === 'another_device') {
                        set({ sessionRevoked: true });
                        get().stopHeartbeat();
                    } else if (data.reason === 'not_authenticated') {
                        get().clearAuth();
                    }
                }
            } catch (e) { }
        };

        doHeartbeat();
        heartbeatInterval = setInterval(doHeartbeat, 30000);
    },

    stopHeartbeat: () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    },

    dismissRevoked: () => {
        set({ sessionRevoked: false });
        get().clearAuth();
    },

    setUnreadCount: (count: number) => set({ unreadNotificationsCount: count })
}));
