import { Request, RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { dataSource } from "../app";
import { List } from "../models/list.model";
import { User } from "../models/user.model";
import {
  AuthPrincipal,
  isAdmin,
  mayManageList,
  mayManageUser,
  mayReadList,
} from "./authorization.policy";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

const getToken = (req: Request): string | undefined => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    return match?.[1];
  }
  return undefined;
};

const resolvePrincipal = async (
  req: Request
): Promise<AuthPrincipal | undefined> => {
  const token = getToken(req);
  if (!token) return undefined;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  let decoded: JwtPayload;
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.id !== "number") {
      return undefined;
    }
    decoded = payload;
  } catch {
    return undefined;
  }

  if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0) {
    return undefined;
  }

  // Always resolve the role from the database, never trust a client-supplied role.
  const user = await dataSource.getRepository(User).findOne({
    where: { id: decoded.id },
  });
  if (!user) return undefined;

  // A signed but revoked JWT must never authenticate again.
  if (typeof decoded.sv !== "number" || decoded.sv !== user.session_version) {
    return undefined;
  }

  return {
    userId: user.id,
    role: user.role === "admin" ? "admin" : "user",
  };
};

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const auth = await resolvePrincipal(req);
    if (!auth) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.auth = auth;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional identity for public endpoints with owner-specific data.
export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  try {
    req.auth = await resolvePrincipal(req);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.auth) return res.status(401).json({ message: "Authentication required" });
  if (!isAdmin(req.auth)) return res.status(403).json({ message: "Forbidden" });
  next();
};

const parseId = (value: string): number | undefined => {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
};

export const requireSelf = (param = "id"): RequestHandler => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ message: "Authentication required" });
  const userId = parseId(req.params[param]);
  if (!userId) return res.status(400).json({ message: "Invalid user ID" });
  if (req.auth.userId !== userId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export const requireSelfOrAdmin = (param = "id"): RequestHandler => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ message: "Authentication required" });
  const userId = parseId(req.params[param]);
  if (!userId) return res.status(400).json({ message: "Invalid user ID" });
  if (!mayManageUser(req.auth, userId)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

export const requireListOwner = (param = "id"): RequestHandler =>
  async (req, res, next) => {
    if (!req.auth) return res.status(401).json({ message: "Authentication required" });
    const id = parseId(req.params[param]);
    if (!id) return res.status(400).json({ message: "Invalid list ID" });

    try {
      const list = await dataSource.getRepository(List).findOne({ where: { id } });
      if (!list) return res.status(404).json({ message: "List not found" });
      if (!mayManageList(req.auth, list.creator_id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };

export const allowListRead = (param = "id"): RequestHandler =>
  async (req, res, next) => {
    const id = parseId(req.params[param]);
    if (!id) return res.status(400).json({ message: "Invalid list ID" });
    try {
      const list = await dataSource.getRepository(List).findOne({ where: { id } });
      if (!list || !mayReadList(req.auth, list.creator_id, list.privacy)) {
        return res.status(404).json({ message: "List not found" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
