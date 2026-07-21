import React, { createContext, useContext, useEffect } from 'react';
import { client } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface AuthContextType {
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  logout: () => {},
});

/**
 * Ensures a user record exists in the backend `users` table.
 * Calls POST /api/user/profile which upserts (creates if missing, updates if present).
 * Returns the profile data after ensuring it exists.
 */
async function ensureUserProfile(authUser: { id: string; email?: string; name?: string }): Promise<{ name: string }> {
  // First try to GET the profile
  try {
    const profileRes = await client.api.fetch('/api/user/profile');
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.data) {
        // Profile exists — return it
        return { name: profileData.data.name || authUser.name || '' };
      }
    }
  } catch (e) {
    console.warn('[AuthContext] Profile fetch failed', e);
  }

  // Profile doesn't exist yet — create it via POST (upsert)
  try {
    await client.api.fetch('/api/user/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: authUser.name || '' }),
    });
    // Fetch again after creation
    const profileRes2 = await client.api.fetch('/api/user/profile');
    if (profileRes2.ok) {
      const profileData2 = await profileRes2.json();
      if (profileData2.data) {
        return { name: profileData2.data.name || authUser.name || '' };
      }
    }
  } catch (e) {
    console.warn('[AuthContext] Profile creation failed', e);
  }

  return { name: authUser.name || '' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isChecking, setUser, setChecking, reset } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    // If we already have a user in the persisted store, we can show the app immediately
    // but we should still verify the session in the background to ensure it's valid.
    const existingUser = useAuthStore.getState().user;
    if (existingUser) {
      setChecking(false);
      
      // Background verification
      client.auth.getSession().then(async (session) => {
        if (!session.data?.user) {
          // Session expired or invalid
          reset();
        } else {
          // Ensure user record exists in DB and refresh profile data
          try {
            const profile = await ensureUserProfile(session.data.user);
            setUser({
              id: session.data.user.id,
              email: session.data.user.email || '',
              name: profile.name || session.data.user.name || '',
            });
          } catch (e) {
            console.warn('[AuthContext] Background profile refresh failed', e);
          }
        }
      }).catch(() => {
        // Network error or other issue, keep existing user for offline support
      });
      return;
    }

    try {
      const session = await client.auth.getSession();
      if (session.data?.user) {
        localStorage.setItem('meinspect_token', 'platform-auth');
        
        // Ensure user record exists in DB and get display name
        const profile = await ensureUserProfile(session.data.user);

        setUser({
          id: session.data.user.id,
          email: session.data.user.email || '',
          name: profile.name || session.data.user.name || '',
        });
      } else {
        setChecking(false);
      }
    } catch (err) {
      console.error('[AuthContext] Session restoration failed', err);
      setChecking(false);
    }
  }

  async function logout() {
    await client.auth.signOut();
    reset();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isChecking,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
