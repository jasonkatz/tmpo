export const useAuth0 = jest.fn();
export const Auth0Provider = ({ children }: { children: React.ReactNode }) => children;
export const withAuthenticationRequired = (component: React.ComponentType) => component;
