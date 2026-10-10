import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { UserRole, hasPermission } from './roles';

export const authorize = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const userRole = req.user.role as UserRole;
    
    for (const permission of permissions) {
      if (hasPermission(userRole, permission)) {
        return next();
      }
    }

    return res.status(403).json({ 
      status: 'error', 
      message: 'Insufficient permissions' 
    });
  };
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }

  next();
};

export const isEditor = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Authentication required' });
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.EDITOR) {
    return res.status(403).json({ status: 'error', message: 'Editor access required' });
  }

  next();
};
