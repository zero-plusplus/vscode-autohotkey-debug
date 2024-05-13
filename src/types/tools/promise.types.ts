export type Task<T> = () => Promise<T>;
export interface Mutex {
  use: <T>(task: Task<T>) => Promise<T>;
}
