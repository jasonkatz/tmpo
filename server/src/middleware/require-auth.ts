import { auth } from "express-oauth2-jwt-bearer";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";

function e2eAuth(req: Request, _res: Response, next: NextFunction) {
  ((req as unknown) as { auth: Record<string, unknown> }).auth = {
    payload: {
      sub: "test|e2e-user-1",
      email: "e2e@test.local",
      name: "E2E Test User",
    },
  };
  next();
}

export const requireAuth =
  config.E2E === "true"
    ? e2eAuth
    : auth({
        audience: config.AUTH0_AUDIENCE,
        issuerBaseURL: config.AUTH0_ISSUER_BASE_URL,
        tokenSigningAlg: "RS256",
      });
