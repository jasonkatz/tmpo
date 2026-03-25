import { ReactNode, createContext, useContext } from "react";

const e2eAuthContext = {
  isAuthenticated: true,
  isLoading: false,
  user: {
    sub: "test|e2e-user-1",
    email: "e2e@test.local",
    name: "E2E Test User",
  },
  getAccessTokenSilently: async () => "e2e-fake-token",
  loginWithRedirect: async () => {},
  logout: () => {},
};

const E2EContext = createContext(e2eAuthContext);

export function E2EAuthProvider({ children }: { children: ReactNode }) {
  return <E2EContext.Provider value={e2eAuthContext}>{children}</E2EContext.Provider>;
}

export function useE2EAuth() {
  return useContext(E2EContext);
}
