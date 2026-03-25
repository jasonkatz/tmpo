import { useAuth0, withAuthenticationRequired as withAuth0Required } from "@auth0/auth0-react";
import { useE2EAuth } from "../providers/E2EAuthProvider";
import { ComponentType } from "react";

const isE2E = import.meta.env.VITE_E2E === "true";

/**
 * Unified auth hook. Returns Auth0 in production, mock in E2E mode.
 * Conditional hook call is safe here because isE2E is a build-time constant
 * (import.meta.env) — the branch never changes at runtime.
 */
export function useAuth() {
  if (isE2E) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useE2EAuth();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth0();
}

/**
 * Unified auth guard HOC. In E2E mode, passes through (always authenticated).
 */
export function withAuthenticationRequired<P extends object>(
  Component: ComponentType<P>,
  options?: Parameters<typeof withAuth0Required>[1]
): ComponentType<P> {
  if (isE2E) {
    return Component;
  }
  return withAuth0Required(Component, options) as ComponentType<P>;
}
