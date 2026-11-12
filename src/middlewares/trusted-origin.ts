import { RequestHandler } from "express";
import { getAllowedOrigins } from "../config/cors";
import { isSafeMethod } from "./session";

// SameSite=Lax alone is not a complete CSRF defence. Reject writes from
// cross-site browser contexts, even on public login/register/reset endpoints.
export const requireTrustedBrowserOrigin: RequestHandler = (req, res, next) => {
  if (isSafeMethod(req.method)) return next();
  if (req.get("Sec-Fetch-Site") === "cross-site") {
    return res.status(403).json({ message: "Untrusted request origin" });
  }
  const origin = req.get("Origin");
  if (origin && !getAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS).has(origin)) {
    return res.status(403).json({ message: "Untrusted request origin" });
  }
  next();
};
