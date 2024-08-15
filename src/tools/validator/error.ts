export class ValidationError<T> extends Error {
  public readonly value: T;
  constructor(value: T, expected: string) {
    super(`Expected ${expected}, but the actual value was ${JSON.stringify(value)}.`);

    this.value = value;
  }
}
export class SchemaValidationError<T> extends Error {
  public readonly value: T;
  constructor(value: T) {
    super(`Schema validation failed for some reason. This schema has the structure of ${JSON.stringify(value)}`);

    this.value = value;
  }
}
export class PropertyValidationError<Value extends Record<string, any>> extends Error {
  public readonly value: Value;
  public readonly key: keyof Value;
  constructor(value: Value, key: keyof Value, expected: string) {
    super(`Expected ${expected}, but the actual value was ${JSON.stringify(value[key])}. This value was taken from property ${String(key)} of ${JSON.stringify(value)}.`);

    this.value = value;
    this.key = key;
  }
}
export class ElementValidationError<Element, Value extends Element[]> extends Error {
  public readonly value: Value;
  public readonly index: number;
  constructor(value: Value, index: number, expected: string) {
    super(`Expected ${expected}, but the actual value was ${JSON.stringify(value[index])}. This value was taken from element index ${index} of ${JSON.stringify(value)}.`);

    this.value = value;
    this.index = index;
  }
}

export class FileNotFoundError extends Error {
  public readonly value: string;
  constructor(value: string) {
    super(`Expected file path, but the actual value was "${value}".`);

    this.value = value;
  }
}
export class DirectoryNotFoundError extends Error {
  public readonly value: string;
  constructor(value: string) {
    super(`Expected directory path, but the actual value was "${value}".`);

    this.value = value;
  }
}
export class PathNotFoundError extends Error {
  public readonly value: string;
  constructor(value: string) {
    super(`Expected file/directory path, but the actual value was "${value}".`);

    this.value = value;
  }
}
export class UpperLimitError extends Error {
  public readonly limit: number;
  constructor(value: number, limit: number) {
    super(`Expected greater than or equal to ${limit}, but actual was ${value}.`);

    this.limit = limit;
  }
}
export class LowerLimitError extends Error {
  public readonly limit: number;
  constructor(value: number, limit: number) {
    super(`Expected lower than or equal to ${limit}, but actual was ${value}.`);

    this.limit = limit;
  }
}
export class RangeError extends Error {
  public readonly min: number;
  public readonly max: number;
  constructor(value: number, min: number, max: number) {
    super(`Expected values from ${min} to ${max}, but the actual value was ${value}`);

    this.min = min;
    this.max = max;
  }
}
export class PropertyAccessError<V extends Record<string, any>> extends Error {
  public readonly value: V;
  public readonly key: keyof V;
  constructor(value: V, key: keyof V) {
    super(`Failed to access property ${String(key)} of ${JSON.stringify(value)}`);

    this.value = value;
    this.key = key;
  }
}
export class PropertyFoundNotError<V extends Record<string, any>> extends Error {
  public readonly value: V;
  public readonly key: keyof V;
  constructor(value: V, key: keyof V) {
    super(`Not found property ${String(key)} of ${JSON.stringify(value)}.`);

    this.value = value;
    this.key = key;
  }
}
export class NormalizationError<T> extends Error {
  public readonly valuePath: string;
  public readonly value: T;
  constructor(valuePath: string, value: T, ...args: Parameters<typeof Error>) {
    super(...args);

    this.valuePath = valuePath;
    this.value = value;
  }
}
