import { logger } from "@/utils";
import type { CacheItemMeta } from "./CacheTypes";

/**
 * LRU 缓存节点
 *
 * @template K - 缓存键类型
 */
class LRUNode<K extends string> {
  public key: K;
  public item: CacheItemMeta;
  public prev: LRUNode<K> | null = null;
  public next: LRUNode<K> | null = null;

  constructor(key: K, item: CacheItemMeta) {
    this.key = key;
    this.item = item;
  }
}

/**
 * LRU 缓存结构
 *
 * 使用双向链表和哈希表实现。
 *
 * @template K - 缓存键类型（必须为 string）
 */
export class LRUCache<K extends string> {
  private readonly map = new Map<K, LRUNode<K>>();
  private head: LRUNode<K> | null = null;
  private tail: LRUNode<K> | null = null;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存项
   *
   * @param key - 缓存键
   * @returns 缓存项或 undefined
   */
  get(key: K): CacheItemMeta | undefined {
    const node = this.map.get(key);
    if (node === undefined) {
      return undefined;
    }

    // 移动到尾部（标记为最近使用）
    this.moveToTail(node);

    return node.item;
  }

  /**
   * 设置缓存项
   *
   * @param key - 缓存键
   * @param item - 缓存项元数据
   */
  set(key: K, item: CacheItemMeta): void {
    const existingNode = this.map.get(key);

    if (existingNode !== undefined) {
      // 更新现有节点
      existingNode.item = item;
      this.moveToTail(existingNode);
      return;
    }

    // 创建新节点
    const newNode = new LRUNode(key, item);

    if (this.map.size >= this.maxSize) {
      // 删除最久未使用的节点（头节点）
      this.removeLRU();
    }

    // 添加新节点到尾部
    this.addToTail(newNode);
    this.map.set(key, newNode);
  }

  /**
   * 删除缓存项
   *
   * @param key - 缓存键
   * @returns 是否成功删除
   */
  delete(key: K): boolean {
    const node = this.map.get(key);
    if (node === undefined) {
      return false;
    }

    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * 获取所有条目
   *
   * 按照最近使用顺序返回（从旧到新）
   */
  entries(): [K, CacheItemMeta][] {
    const result: [K, CacheItemMeta][] = [];
    let current = this.head;

    while (current !== null) {
      result.push([current.key, current.item]);
      current = current.next;
    }

    return result;
  }

  /**
   * 遍历所有条目
   *
   * @param callback - 回调函数
   */
  forEach(callback: (item: CacheItemMeta, key: K) => void): void {
    let current = this.head;

    while (current !== null) {
      callback(current.item, current.key);
      current = current.next;
    }
  }

  /**
   * 移动节点到尾部（标记为最近使用）
   *
   * @param node - 要移动的节点
   */
  private moveToTail(node: LRUNode<K>): void {
    // 如果已经在尾部，无需移动
    if (node === this.tail) {
      return;
    }

    // 从当前位置移除
    this.removeNode(node);

    // 添加到尾部
    this.addToTail(node);
  }

  /**
   * 将节点添加到链表尾部
   *
   * @param node - 要添加的节点
   */
  private addToTail(node: LRUNode<K>): void {
    node.prev = this.tail;
    node.next = null;

    if (this.tail !== null) {
      this.tail.next = node;
    }

    this.tail = node;

    this.head ??= node;
  }

  /**
   * 从链表中移除节点（不删除 map 中的引用）
   *
   * @param node - 要移除的节点
   */
  private removeNode(node: LRUNode<K>): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      // 移除的是头节点
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      // 移除的是尾节点
      this.tail = node.prev;
    }
  }

  /**
   * 删除最久未使用的节点（头节点）
   */
  private removeLRU(): void {
    if (this.head === null) {
      return;
    }

    const lruKey = this.head.key;
    this.removeNode(this.head);
    this.map.delete(lruKey);

    logger.debug(`LRU缓存已满，删除最久未使用的项: ${lruKey}`);
  }
}
