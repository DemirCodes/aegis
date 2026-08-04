import { AppError } from './app-error.js';
import { ErrorCodes } from './error-codes.js';

export class ValidationError extends AppError {
  public validationErrors: Array<{ path: string; message: string; code: string }>;

  constructor(
    message: string = 'Validation failed',
    validationErrors: Array<{ path: string; message: string; code: string }> = [],
  ) {
    super(ErrorCodes.VALIDATION_ERROR, message, 400, { validationErrors });
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}