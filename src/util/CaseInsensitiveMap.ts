export class CaseInsensitiveMap<K, V> extends Map<K, V> {
  public get(key: K): V | undefined {
    const _key = typeof key === 'string' ? key.toLowerCase() : key;
    return super.get(_key as K);
  }
  public set(key: K, value: V): this {
    const _key = typeof key === 'string' ? key.toLowerCase() : key;
    return super.set(_key as K, value);
  }
  public has(key: K): boolean {
    const _key = typeof key === 'string' ? key.toLowerCase() : key;
    return super.has(_key as K);
  }
}
