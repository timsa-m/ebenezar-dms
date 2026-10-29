import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase'; // Points to your core client setup

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const segments = useSegments();
  const router = useRouter();

  // 1. Listen for dynamic authentication adjustments via Supabase
  useEffect(() => {
    // Sync initial session on boot safely
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Handle real-time stream shifts (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Intercept and redirect routes based on credentials
  useEffect(() => {
    if (isLoading) return;

    // Check if the user is currently inside an authentication route array
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Direct unauthorized user back to sign-in screen
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // User is logged in; bypass auth screens and forward onto root workspace index
      router.replace('/(root)');
    }
  }, [session, segments, isLoading, router]);

  return (
    <AuthContext.Provider value={{ session, user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for rapid structural node consumption
export const useAuth = () => useContext(AuthContext);