import { Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Keep the splash screen visible until our auth checks are completely resolved
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // Dismiss the system splash mask once authentication states are stable
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null; // Keep rendering static layout background until data resolves
  }

  // Render the currently active matched sub-route layout/component tree
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}