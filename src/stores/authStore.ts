import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as AppUser, PermitType, NotificationPreferences } from '@/types/database';

// MMKV Storage for Zustand
const storage = new MMKV({ id: 'auth-storage' });

const zustandStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};

interface AuthState {
  // Auth State
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  isLoading: boolean;
  isOnboarded: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsOnboarded: (isOnboarded: boolean) => void;

  // Auth Methods
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;

  // Profile Methods
  updatePermitType: (permitType: PermitType) => Promise<void>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;

  // Initialize
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      session: null,
      appUser: null,
      isLoading: true,
      isOnboarded: false,

      // Setters
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setAppUser: (appUser) => set({ appUser }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsOnboarded: (isOnboarded) => set({ isOnboarded }),

      // Sign In with Email
      signInWithEmail: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          set({ user: data.user, session: data.session });
        } finally {
          set({ isLoading: false });
        }
      },

      // Sign Up with Email
      signUpWithEmail: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          set({ user: data.user, session: data.session });
        } finally {
          set({ isLoading: false });
        }
      },

      // OAuth Sign In
      signInWithOAuth: async (provider) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo: 'raiderpark://auth/callback',
            },
          });
          if (error) throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Sign Out
      signOut: async () => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          set({ user: null, session: null, appUser: null });
        } finally {
          set({ isLoading: false });
        }
      },

      // Update Permit Type
      updatePermitType: async (permitType) => {
        const { user, appUser } = get();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('users')
          .update({ permit_type: permitType })
          .eq('id', user.id);

        if (error) throw error;

        if (appUser) {
          set({ appUser: { ...appUser, permit_type: permitType } });
        }
      },

      // Update Notification Preferences
      updateNotificationPreferences: async (prefs) => {
        const { user, appUser } = get();
        if (!user || !appUser) throw new Error('Not authenticated');

        const newPrefs = { ...appUser.notification_preferences, ...prefs };

        const { error } = await supabase
          .from('users')
          .update({ notification_preferences: newPrefs })
          .eq('id', user.id);

        if (error) throw error;

        set({ appUser: { ...appUser, notification_preferences: newPrefs } });
      },

      // Initialize Auth State
      initialize: async () => {
        set({ isLoading: true });
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            set({ user: session.user, session });

            // Fetch app user profile
            const { data: appUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (appUser) {
              set({ appUser, isOnboarded: appUser.permit_type !== 'none' });
            }
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            set({ user: session?.user ?? null, session });

            if (session?.user) {
              const { data: appUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (appUser) {
                set({ appUser, isOnboarded: appUser.permit_type !== 'none' });
              }
            } else {
              set({ appUser: null, isOnboarded: false });
            }
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
