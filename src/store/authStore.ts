import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    token: string | null;
    setToken: (token: string) => void;
    logout: () => void;
    getRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            setToken: (token) => set({ token }),
            logout: () => set({ token: null }),
            getRole: () => {
                const token = get().token;
                if (!token) return null;
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    let role = payload.role || null;
                    // Убираем префикс ROLE_, если он есть
                    if (role && role.startsWith('ROLE_')) {
                        role = role.replace('ROLE_', '');
                    }
                    return role;
                } catch (e) {
                    return null;
                }
            },
        }),
        { name: 'auth-storage' }
    )
);