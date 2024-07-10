export function equals(a: any, b: any, ignoreCase = false): boolean {
  if (ignoreCase) {
    if (typeof a === 'string' && typeof b === 'string') {
      return String(a).toLowerCase() === String(b).toLowerCase();
    }
    return false;
  }
  return a === b;
}
export function equalsIgnoreCase(a: any, b: any): boolean {
  return equals(a, b, true);
}
