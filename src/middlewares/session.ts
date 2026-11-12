import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response, CookieOptions } from "express";

// Cookies are scoped to the API host; never set Domain=.check-this-one.com.
// Production/staging require HTTPS; local HTTP development uses an unprefixed name.
const local = process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";
export const SESSION_COOKIE_NAME = local ? "cto_session" : "__Host-cto_session";
export const SESSION_MAX_AGE_SECONDS = 3 * 24 * 60 * 60;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: !local,
  sameSite: "lax",
  path: "/",
};

export const setSessionCookie = (response: Response, jwt: string): void => {
  response.cookie(SESSION_COOKIE_NAME, jwt, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
};

export const clearSessionCookie = (response: Response): void => {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
};

export const getSessionJwt = (request: Request): string | undefined => {
  const cookie = request.cookies?.[SESSION_COOKIE_NAME];
  return typeof cookie === "string" && cookie.length < 4096
    ? cookie
    : undefined;
};

export const csrfTokenForSession = (jwt: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return createHmac("sha256", secret).update("cto-csrf-v1:").update(jwt).digest("hex");
};

export const hasValidCsrfToken = (request: Request): boolean => {
  const jwt = getSessionJwt(request);
  const supplied = request.get("X-CSRF-Token");
  if (!jwt || !supplied || !/^[a-f0-9]{64}$/.test(supplied)) return false;
  const expected = Buffer.from(csrfTokenForSession(jwt), "hex");
  const candidate = Buffer.from(supplied, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

export const isSafeMethod = (method: string): boolean =>
  method === "GET" || method === "HEAD" || method === "OPTIONS";
