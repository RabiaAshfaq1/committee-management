export interface JwtPayload {
    id: string;
    email: string;
    role: string;
}
export declare const signToken: (payload: JwtPayload) => string;
export declare const verifyToken: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.utils.d.ts.map