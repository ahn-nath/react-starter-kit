import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

export const AutoLogout = () => {
  const { isAuthenticated, logout } = useKindeAuth();

  useEffect(() => {
    let timer: string | number | NodeJS.Timeout | undefined;
    if (isAuthenticated) {
      timer = setTimeout(() => {
        console.log("Getting ready to logout...")
        logout();
      }, 10000); // 10,000 ms = 10 seconds
    }
    return () => clearTimeout(timer);
  }, [isAuthenticated, logout]);

  return null;
};

