export class ValidationError<T> extends Error {
  public readonly value: T;
  constructor(value: T, ...args: Parameters<typeof Error>) {
    super(...args);

    this.value = value;
  }
}
export class FileNotFoundError extends ValidationError<string> {
}
export class DirectoryNotFoundError extends ValidationError<string> {
}
export class PathNotFoundError extends ValidationError<string> {
}
export class InvalidEnumValueError extends ValidationError<string> {
  public enumStrings: string[];
  constructor(value: string, enumStrings: string[]) {
    super(value);
    this.enumStrings = enumStrings;
  }
}
export class UpperLimitError extends ValidationError<number> {
  public readonly limit: number;
  constructor(value: number, limit: number, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.limit = limit;
  }
}
export class LowerLimitError extends ValidationError<number> {
  public readonly limit: number;
  constructor(value: number, limit: number, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.limit = limit;
  }
}
export class RangeError extends ValidationError<number> {
  public readonly min: number;
  public readonly max: number;
  constructor(value: number, min: number, max: number, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.min = min;
    this.max = max;
  }
}
export class PropertyAccessError<T> extends ValidationError<T> {
  public readonly key: string;
  constructor(value: T, key: string, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.key = key;
  }
}
export class PropertyFoundNotError<T> extends ValidationError<T> {
  public readonly key: string;
  constructor(value: T, key: string, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.key = key;
  }
}
export class PropertyValidationError<T> extends ValidationError<T> {
  public readonly key: string;
  constructor(value: T, key: string, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.key = key;
  }
}
export class ElementValidationError<T> extends ValidationError<T> {
  public readonly index: number;
  constructor(value: T, index: number, ...args: Parameters<typeof Error>) {
    super(value, ...args);
    this.index = index;
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
