// common/utils/priority-queue.ts
export class PriorityQueue<T> {
    private queue: { item: T; priority: number }[] = [];
  
    enqueue(item: T, priority: number): void {
      this.queue.push({ item, priority });
      this.queue.sort((a, b) => a.priority - b.priority);
    }
  
    dequeue(): T | undefined {
      return this.queue.shift()?.item;
    }
  }
  