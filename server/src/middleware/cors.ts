import cors from "cors";
import { config } from "../config";

function getAllowedOrigins(): string[] {
  if (config.ALLOWED_ORIGINS) {
    return config.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }

  if (config.NODE_ENV === "development") {
    return ["http://localhost:5173", "http://localhost:3000"];
  }

  // In production with no ALLOWED_ORIGINS set, only same-origin requests
  // are expected (via nginx reverse proxy). Return empty list so that
  // requests without an Origin header (same-origin) are allowed, but
  // cross-origin requests are rejected.
  return [];
}

const allowedOrigins = getAllowedOrigins();

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});
