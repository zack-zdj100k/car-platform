import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [property] = args.constraints as [string];
    return value === (args.object as Record<string, unknown>)[property];
  }

  defaultMessage(args: ValidationArguments): string {
    const [property] = args.constraints as [string];
    return `${args.property} must match ${property}`;
  }
}

/** Cross-field equality, used for password confirmation (spec §36). */
export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}
