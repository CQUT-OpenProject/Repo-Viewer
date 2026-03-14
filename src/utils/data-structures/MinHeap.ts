/**
 * 最小堆数据结构
 *
 * 用于高效地维护和提取最小值元素。
 *
 * @template T - 堆中元素的类型
 */
export class MinHeap<T> {
  private heap: T[] = [];
  private readonly compareFn: (a: T, b: T) => number;

  /**
   * 创建最小堆
   *
   * @param compareFn - 比较函数，返回负数表示 a < b，正数表示 a > b，0 表示相等
   */
  constructor(compareFn: (a: T, b: T) => number) {
    this.compareFn = compareFn;
  }

  /**
   * 从数组构建堆
   *
   * @param items - 要插入的元素数组
   * @param compareFn - 比较函数，返回负数表示 a < b，正数表示 a > b，0 表示相等
   */
  static fromArray<T>(items: T[], compareFn: (a: T, b: T) => number): MinHeap<T> {
    const heap = new MinHeap(compareFn);
    heap.heap = [...items];

    // 从最后一个非叶子节点开始堆化
    for (let i = Math.floor(heap.heap.length / 2) - 1; i >= 0; i--) {
      heap.heapifyDown(i);
    }

    return heap;
  }

  /**
   * 插入元素
   *
   * @param item - 要插入的元素
   */
  push(item: T): void {
    this.heap.push(item);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * 提取最小元素
   *
   * @returns 最小元素，如果堆为空则返回 undefined
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const min = this.heap[0];
    const last = this.heap.pop();
    if (last !== undefined) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }

    return min;
  }

  /**
   * 提取最小的 k 个元素
   *
   * @param k - 要提取的元素数量
   * @returns 最小的 k 个元素数组
   */
  extractMin(k: number): T[] {
    const result: T[] = [];
    const count = Math.min(k, this.heap.length);

    for (let i = 0; i < count; i++) {
      const min = this.pop();
      if (min !== undefined) {
        result.push(min);
      }
    }

    return result;
  }

  /**
   * 获取堆的大小
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * 清空堆
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * 向上调整堆（用于插入）
   *
   * @param index - 要调整的元素索引
   */
  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const current = this.heap[index];
      const parent = this.heap[parentIndex];

      if (current === undefined || parent === undefined || this.compareFn(current, parent) >= 0) {
        break;
      }

      // 交换
      [this.heap[index], this.heap[parentIndex]] = [parent, current];
      index = parentIndex;
    }
  }

  /**
   * 向下调整堆（用于删除）
   *
   * @param index - 要调整的元素索引
   */
  private heapifyDown(index: number): void {
    const heapLength = this.heap.length;
    while (index < heapLength) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      const currentMin = this.heap[minIndex];
      const leftValue = this.heap[leftChild];
      const rightValue = this.heap[rightChild];

      // 找出父节点和两个子节点中最小的
      if (
        leftChild < heapLength &&
        leftValue !== undefined &&
        currentMin !== undefined &&
        this.compareFn(leftValue, currentMin) < 0
      ) {
        minIndex = leftChild;
      }

      const newMin = this.heap[minIndex];
      if (
        rightChild < heapLength &&
        rightValue !== undefined &&
        newMin !== undefined &&
        this.compareFn(rightValue, newMin) < 0
      ) {
        minIndex = rightChild;
      }

      // 如果父节点已经是最小的，堆化完成
      if (minIndex === index) {
        break;
      }

      // 交换
      const minValue = this.heap[minIndex];
      const indexValue = this.heap[index];
      if (minValue !== undefined && indexValue !== undefined) {
        [this.heap[index], this.heap[minIndex]] = [minValue, indexValue];
      }
      index = minIndex;
    }
  }
}

/**
 * 从数组中获取最小的 k 个元素
 *
 * @param items - 元素数组
 * @param k - 要获取的元素数量
 * @param compareFn - 比较函数
 * @returns 最小的 k 个元素数组
 */
export function getMinK<T>(items: T[], k: number, compareFn: (a: T, b: T) => number): T[] {
  if (k >= items.length) {
    return [...items].sort(compareFn);
  }

  const heap = MinHeap.fromArray(items, compareFn);
  return heap.extractMin(k);
}
