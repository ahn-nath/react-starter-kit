import { useEffect, useRef } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export const AutoLogout = () => {
  const { isAuthenticated, logout } = useKindeAuth();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hasLoggedOutRef.current = false;
      return;
    }

    const triggerLogout = (reason: string) => {
      if (hasLoggedOutRef.current) {
        return;
      }

      hasLoggedOutRef.current = true;
      console.debug(`[AutoLogout] Triggering logout because: ${reason}`);
      logout({ logoutRedirectUri: window.location.origin });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerLogout('document became hidden');
      }
    };

    const handlePageHide = () => {
      triggerLogout('pagehide event');
    };

    const handleBeforeUnload = () => {
      triggerLogout('beforeunload event');
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

