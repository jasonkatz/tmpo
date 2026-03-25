import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user-service";
import type { components } from "../types/api";

type User = components["schemas"]["User"];

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function extractUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.auth;
    if (!auth?.payload?.sub) {
      return next();
    }

    const email = auth.payload["email"] as string | undefined;
    const name = auth.payload["name"] as string | undefined;

    if (!email) {
      return res.status(401).json({ error: "Email not found in token" });
    }

    const user = await userService.findOrCreate({
      auth0Id: auth.payload.sub,
      email,
      name,
    });

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
