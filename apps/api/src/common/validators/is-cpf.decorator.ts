import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCPF } from './br-documents.js';

export function IsCPF(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidCPF(value);
        },
        defaultMessage() {
          return 'CPF inválido';
        },
      },
    });
  };
}
