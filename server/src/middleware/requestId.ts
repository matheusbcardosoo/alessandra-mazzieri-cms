import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = uuidv4();
  req.log = logger.child({ requestId: req.id });
  res.set('X-Request-Id', req.id);
  next();
}
