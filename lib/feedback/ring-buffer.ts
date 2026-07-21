/**
 * Fixed-capacity FIFO. The oldest entry falls off the front once capacity is
 * reached, so memory stays bounded no matter how long a session runs. Backs all
 * four capture buffers (console, breadcrumbs, network, request-ids).
 */
export class RingBuffer<T> {
  private items: T[] = [];

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new Error('RingBuffer capacity must be >= 1');
  }

  push(item: T): void {
    this.items.push(item);
    if (this.items.length > this.capacity) {
      this.items.splice(0, this.items.length - this.capacity);
    }
  }

  /** A shallow copy, oldest-first — callers must never mutate the internals. */
  toArray(): T[] {
    return [...this.items];
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
