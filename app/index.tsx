/**
 * @file index.tsx
 * @description Entry point / root redirect for the Okey app. Checks auth token and redirects to tabs or welcome screen.
 * @author Idriss Kriouile
 * @date 2026-04-05
 * @project SallyCards - Okey
 */

import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import * as api from '../shared/api';

export default function Index() {
  // Check if user has a valid auth token stored
  const token = api.getAuthToken();

  // useEffect: Log component mount and auth state for debugging
  useEffect(() => {
    console.log('[Okey/index] Component mounted');
    console.log('[Okey/index] Auth token present:', !!token);
  }, []);

  // If token exists, user is authenticated — redirect to main tabs
  if (token) {
    console.log('[Okey/index] Navigating to /(tabs)');
    return <Redirect href="/(tabs)" />;
  }

  // No token — redirect to welcome/onboarding screen
  console.log('[Okey/index] Navigating to /auth/welcome');
  return <Redirect href="/auth/welcome" />;
}

/* === End of index.tsx — Okey — SallyCards === */
