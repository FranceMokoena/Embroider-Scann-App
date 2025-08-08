import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    userId: string;
}
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map