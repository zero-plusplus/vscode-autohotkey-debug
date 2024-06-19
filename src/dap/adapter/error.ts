export class CriticalError extends Error {
  constructor(err: Error) {
    const message = err.message;
    super(message, { cause: err });
  }
}
