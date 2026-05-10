import { Response } from 'express';
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiResponse["meta"]) => Response;
export declare const sendError: (res: Response, message: string, statusCode?: number, error?: string) => Response;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response;
export declare const sendNotFound: (res: Response, message?: string) => Response;
export declare const sendUnauthorized: (res: Response, message?: string) => Response;
export declare const sendForbidden: (res: Response, message?: string) => Response;
export declare const sendBadRequest: (res: Response, message: string, error?: string) => Response;
//# sourceMappingURL=response.utils.d.ts.map