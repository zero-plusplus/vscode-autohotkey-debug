export type NumberType = 'integer' | 'float';
export type CalcCallback = (a: number, b: number, types: [ NumberType, NumberType ]) => string | number | bigint | undefined;
export type EquivCallback = (a: string | number, b: string | number) => boolean;
