export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:8080",
  auth0: {
    domain: import.meta.env.VITE_AUTH0_DOMAIN || "",
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || "",
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || "",
  },
} as const;
