import { AppError } from './app-error';
export interface ValidationErrorItem {
    path: string;
    message: string;
    code: string;
}
export declare class ValidationError extends AppError {
    readonly validationErrors: ValidationErrorItem[];
    constructor(message?: string, validationErrors?: ValidationErrorItem[]);
    getErrorPaths(): string[];
    hasError(path: string): boolean;
    getError(path: string): ValidationErrorItem | undefined;
    getSummary(): string;
    toJSON(): Record<string, any>;
}
//# sourceMappingURL=validation-error.d.ts.map