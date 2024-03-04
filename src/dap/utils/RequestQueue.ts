export class RequestQueue<R, T extends () => Promise<R>> {
  private readonly items: T[] = [];
  public enqueue(item: T): void {
    this.items.push(item);
  }
  public dequeue(): T | undefined {
    return this.items.shift();
  }
  public async flush(): Promise<number> {
    let count = 0;
    while (true) {
      const item = this.dequeue();
      if (!item) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      await item();
      count++;
    }
    return count;
  }
}
