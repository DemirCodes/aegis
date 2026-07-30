declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
      };
      correlationId?: string;
      traceId?: string;
      riskScore?: number;
      clientIp?: string;
      userId?: string;
    }

    interface Response {
      startTime?: number;
    }
  }
}

export {};