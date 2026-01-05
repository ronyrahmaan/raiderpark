import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as AppUser, PermitType, NotificationPreferences, Schedule } from '@/types/database';

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
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  resendOTP: (email: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // Profile Methods
  updatePermitType: (permitType: PermitType) => Promise<void>;
  updateSchedule: (schedule: Schedule) => Promise<void>;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  updateLocationEnabled: (enabled: boolean) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  ensureUserProfile: () => Promise<void>;

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

      // Sign In with OTP (Magic Link)
      signInWithOTP: async (email) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: true, // Auto-create account if doesn't exist
            },
          });
          if (error) throw error;
          // OTP sent successfully - user will enter code on verify screen
        } finally {
          set({ isLoading: false });
        }
      },

      // Verify OTP Code
      verifyOTP: async (email, token) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });
          if (error) throw error;

          if (data.user && data.session) {
            set({ user: data.user, session: data.session });
            // Profile is created by database trigger
            await get().ensureUserProfile();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      // Resend OTP Code
      resendOTP: async (email) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
      },

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

          // Fetch user profile after sign in
          if (data.user) {
            await get().ensureUserProfile();
          }
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
            options: {
              // For development, we can disable email confirmation
              // In production, remove this or set emailRedirectTo
              data: {
                email_confirmed: true,
              },
            },
          });
          if (error) throw error;

          // If email confirmation is disabled, user will be signed in immediately
          if (data.user && data.session) {
            set({ user: data.user, session: data.session });
            // Profile is created by database trigger, but ensure it exists
            await get().ensureUserProfile();
          } else if (data.user && !data.session) {
            // Email confirmation required - user needs to verify email
            throw new Error('Please check your email to confirm your account');
          }
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
        } catch (err) {
          console.error('Sign out error:', err);
        } finally {
          // Always clear all state regardless of network errors
          set({
            user: null,
            session: null,
            appUser: null,
            isOnboarded: false,
            isLoading: false,
          });
          // Clear our persisted storage
          await AsyncStorage.removeItem('auth-storage');
          // Also clear Supabase's session storage (in case network signOut failed)
          // Supabase stores session with key: sb-{project-ref}-auth-token
          const supabaseSessionKey = 'sb-jhdmamcnwruvlxqinwka-auth-token';
          await AsyncStorage.removeItem(supabaseSessionKey);
        }
      },

      // Reset Password (send email)
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'raiderpark://auth/reset-password',
        });
        if (error) throw error;
      },

      // Update Password (after reset or from settings)
      updatePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
      },

      // Update Permit Type
      updatePermitType: async (permitType) => {
        const { user, appUser } = get();
        if (!user) throw new Error('Not authenticated');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('users')
          .update({ permit_type: permitType })
          .eq('id', user.id);

        if (error) throw error;

        if (appUser) {
          set({ appUser: { ...appUser, permit_type: permitType } });
        }
      },

      // Update Schedule
      updateSchedule: async (schedule) => {
        const { user, appUser } = get();
        if (!user) throw new Error('Not authenticated');

        // Validate schedule is an object (not array)
        if (Array.isArray(schedule)) {
          throw new Error('Schedule must be an object, not an array');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('users')
          .update({ schedule })
          .eq('id', user.id);

        if (error) throw error;

        if (appUser) {
          set({ appUser: { ...appUser, schedule } });
        }
      },

      // Update Notification Preferences
      updateNotificationPreferences: async (prefs) => {
        const { user, appUser } = get();
        if (!user || !appUser) throw new Error('Not authenticated');

        const newPrefs = { ...appUser.notification_preferences, ...prefs };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('users')
          .update({ notification_preferences: newPrefs })
          .eq('id', user.id);

        if (error) throw error;

        set({ appUser: { ...appUser, notification_preferences: newPrefs } });
      },

      // Update Location Enabled
      updateLocationEnabled: async (enabled) => {
        const { user, appUser } = get();
        if (!user) throw new Error('Not authenticated');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('users')
          .update({ location_enabled: enabled })
          .eq('id', user.id);

        if (error) throw error;

        if (appUser) {
          set({ appUser: { ...appUser, location_enabled: enabled } });
        }
      },

      // Update Display Name
      updateDisplayName: async (displayName) => {
        const { user, appUser } = get();
        if (!user) throw new Error('Not authenticated');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('users')
          .update({ display_name: displayName })
          .eq('id', user.id);

        if (error) throw error;

        if (appUser) {
          set({ appUser: { ...appUser, display_name: displayName } });
        }
      },

      // Ensure user profile exists (creates one if missing)
      ensureUserProfile: async () => {
        const { user, isOnboarded: currentIsOnboarded } = get();
        if (!user) return;

        // Try to fetch existing profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingProfile } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          // ONLY use the persisted isOnboarded state - don't check profile data
          // This ensures users who signed out and back in will see onboarding again
          // The isOnboarded flag is ONLY set to true when user completes location screen
          set({
            appUser: existingProfile as AppUser,
            isOnboarded: currentIsOnboarded,
          });
          return;
        }

        // Profile doesn't exist (trigger may have failed), create it manually
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProfile, error } = await (supabase as any)
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            permit_type: 'none',
            reporter_level: 'newbie',
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create user profile:', error);
          return;
        }

        set({
          appUser: newProfile as AppUser,
          isOnboarded: false,
        });
      },

      // Initialize Auth State
      initialize: async () => {
        set({ isLoading: true });
        try {
          // Get current session
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            set({ user: session.user, session });

            // Fetch or create app user profile
            await get().ensureUserProfile();
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            set({ user: session?.user ?? null, session });

            if (event === 'SIGNED_IN' && session?.user) {
              // User just signed in, ensure profile exists
              await get().ensureUserProfile();
            } else if (event === 'SIGNED_OUT') {
              set({ appUser: null, isOnboarded: false });
            } else if (event === 'PASSWORD_RECOVERY') {
              // User clicked password reset link
              console.log('Password recovery event');
            } else if (session?.user) {
              // Other events with a user, fetch profile
              await get().ensureUserProfile();
            }
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
