import type { Request } from 'express';
import type { Role } from '@prisma/client';

/** Identity attached to a request by the JWT strategy. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
