import { logger } from '../utils/logger';

export function Deprecated(message?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const warningMsg = message || `${propertyKey} is deprecated and will be removed in a future version.`;
      logger.warn(warningMsg);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}