import React, { createContext, useContext, useState } from 'react';

interface AuthContextValue {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        login: () => setIsLoggedIn(true),
        logout: () => setIsLoggedIn(false),
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
