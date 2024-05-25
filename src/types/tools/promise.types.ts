export type Task<T> = () => Promise<T>;
export interface Mutex {
  use: <T>(key: string, task: Task<T>) => Promise<T>;
}
