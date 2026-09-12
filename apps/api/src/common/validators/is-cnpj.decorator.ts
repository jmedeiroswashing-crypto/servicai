import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCNPJ } from './br-documents.js';

export function IsCNPJ(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCNPJ',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidCNPJ(value);
        },
        defaultMessage() {
          return 'CNPJ inválido';
        },
      },
    });
  };
}
