import { Router } from "express";
import { UnauthorizedError } from "../middleware/error-handler";
import type { components, operations } from "../types/api";

type User = components["schemas"]["User"];
type LogoutResponse =
  operations["logout"]["responses"]["200"]["content"]["application/json"];

const router = Router();

router.get("/auth/me", (req, res) => {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const user: User = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
  };
  res.json(user);
});

router.post("/auth/logout", (_req, res) => {
  const response: LogoutResponse = { success: true };
  res.json(response);
});

export default router;
