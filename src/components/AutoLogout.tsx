import { useEffect, useRef } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

const AUTO_LOGOUT_STORAGE_KEY = 'kinde:autoLogoutPending';
const AUTO_LOGOUT_STALE_MS = 5 * 60 * 1000;

type PendingLogoutRecord = {
  at: number;
  reason?: string;
};

const readPendingLogout = (): PendingLogoutRecord | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTO_LOGOUT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PendingLogoutRecord | null;
    if (!parsed || typeof parsed.at !== 'number') {
      window.localStorage.removeItem(AUTO_LOGOUT_STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.at > AUTO_LOGOUT_STALE_MS) {
      window.localStorage.removeItem(AUTO_LOGOUT_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[AutoLogout] Failed to read pending logout flag', error);
    return null;
  }
};

const writePendingLogout = (reason: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: PendingLogoutRecord = { at: Date.now(), reason };
    window.localStorage.setItem(
      AUTO_LOGOUT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn('[AutoLogout] Failed to persist pending logout flag', error);
  }
};

const clearPendingLogout = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(AUTO_LOGOUT_STORAGE_KEY);
  } catch (error) {
    console.warn('[AutoLogout] Failed to clear pending logout flag', error);
  }
};

export const AutoLogout = () => {
  const { isAuthenticated, logout } = useKindeAuth();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isAuthenticated) {
      hasLoggedOutRef.current = false;
      clearPendingLogout();
      return;
    }

    const triggerLogout = (
      reason: string,
      { persistReason = true }: { persistReason?: boolean } = {},
    ) => {
      if (hasLoggedOutRef.current) {
        return;
      }

      hasLoggedOutRef.current = true;

      if (persistReason) {
        writePendingLogout(reason);
      }

      console.debug(`[AutoLogout] Triggering logout because: ${reason}`);
      logout({ redirectUrl: window.location.origin }).catch((error) => {
        console.error('[AutoLogout] Logout failed', error);
        hasLoggedOutRef.current = false;
      });
    };

    const pendingLogout = readPendingLogout();
    if (pendingLogout) {
      triggerLogout(
        `pending logout detected (${pendingLogout.reason ?? 'unknown'})`,
        { persistReason: false },
      );
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerLogout('document became hidden');
      }
    };

    const handlePageHide = () => {
      writePendingLogout('pagehide event');
      triggerLogout('pagehide event', { persistReason: false });
    };

    const handleBeforeUnload = () => {
      writePendingLogout('beforeunload event');
      triggerLogout('beforeunload event', { persistReason: false });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      hasLoggedOutRef.current = false;
    };
  }, [isAuthenticated, logout]);

  return null;
};

