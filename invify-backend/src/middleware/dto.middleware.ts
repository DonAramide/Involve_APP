import { Request, Response, NextFunction } from 'express';

// For the purposes of the activation sprint, we are mocking the DTO validation layer
// to immediately let traffic through while maintaining the architectural boundary.
export const validateDto = (req: Request, res: Response, next: NextFunction) => {
  // In a real implementation, we would map the route to a Zod schema
  // and validate req.body here.
  next();
};
