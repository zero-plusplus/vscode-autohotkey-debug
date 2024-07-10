export class ValidationError<T> extends Error {
  public readonly value: T;
  constructor(value: T) {
    super();

    this.value = value;
  }
}
export class NormalizationError<T> extends Error {
  public readonly valuePath: string;
  public readonly value: T;
  constructor(valuePath: string, value: T) {
    super();

    this.valuePath = valuePath;
    this.value = value;
  }
}
