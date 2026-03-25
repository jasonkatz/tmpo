import cors from "cors";
import { config } from "../config";

const allowedOrigins =
  config.NODE_ENV === "production"
    ? ["https://yourapp.com"]
    : ["http://localhost:5173", "http://localhost:3000"];

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
