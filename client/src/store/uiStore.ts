import { create } from 'zustand';

interface UIState {
    isBottomNavHidden: boolean;
    setBottomNavHidden: (hidden: boolean) => void;
    showBottomNavOnCourse: boolean;
    setShowBottomNavOnCourse: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isBottomNavHidden: false,
    setBottomNavHidden: (hidden) => set({ isBottomNavHidden: hidden }),
    showBottomNavOnCourse: false,
    setShowBottomNavOnCourse: (show) => set({ showBottomNavOnCourse: show }),
}));
