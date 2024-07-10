export type ErrorHandle = SyncErrorHandle | AsyncErrorHandle;
export type SyncErrorHandle = (value: any) => void;
export type AsyncErrorHandle = (value: any) => Promise<void>;
export type ErrorHandleMap = { [key in string]: ErrorHandle | ErrorHandleMap };
export type Validator<T> = (value: any) => Promise<T>;
export type Normalizer<V, R> = SyncNormalizer<V, R> | AsyncNormalizer<V, R>;
export type SyncNormalizer<V, R> = (value: V) => R;
export type AsyncNormalizer<V, R> = (value: V) => Promise<R>;

