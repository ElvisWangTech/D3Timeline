/**
 * 生成指定长度的随机字符串ID
 *
 * @remarks
 * 使用62字符集（A-Z, a-z, 0-9）生成长度可配置的随机字符串。
 * 通过循环随机选取字符构建结果，保证每位字符概率均匀分布。
 *
 * 字符集构成：
 * - 大写字母 A-Z（26个）
 * - 小写字母 a-z（26个）
 * - 数字 0-9（10个）
 * - 总计：62个字符
 *
 * ⚠️ 注意：Math.random() 不是加密安全的随机数生成器。
 * 如需用于安全敏感场景（如密码、会话令牌、加密密钥），
 * 请使用 Web Crypto API 的 crypto.getRandomValues()。
 *
 * @param num - 生成字符串的长度，默认为 8
 * @returns 指定长度的随机字符串
 *
 * @example
 * ```typescript
 * // 默认生成8位ID
 * generateID();        // 例如: "aB3xK9pQ"
 *
 * // 生成6位短ID（适合验证码）
 * generateID(6);       // 例如: "x7K9p2"
 *
 * // 生成16位长ID（适合唯一标识）
 * generateID(16);      // 例如: "aB3xK9pQmN5vL2wR"
 *
 * // 生成32位令牌
 * generateID(32);      // 例如: "aB3xK9pQmN5vL2wRaB3xK9pQmN5vL2wR"
 * ```
 *
 * @example
 * ```typescript
 * // 生成多个ID并检查冲突概率
 * const ids = new Set();
 * for (let i = 0; i < 10000; i++) {
 *   ids.add(generateID(8));
 * }
 * console.log(ids.size); // 10000（8位时冲突概率极低）
 * ```
 */
export function generateID(num = 8): string {
  const charsTable =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const tableLength = charsTable.length;
  for (let i = 0; i < num; i++) {
    result += charsTable.charAt(Math.floor(Math.random() * tableLength));
  }
  return result;
}

/**
 * 将数值限制在指定的最小值和最大值范围内
 *
 * @remarks
 * 如果值小于最小值，返回最小值；如果值大于最大值，返回最大值。
 * 如果值在范围内，则返回原值。
 *
 * @param value - 要限制的值
 * @param min - 允许的最小值
 * @param max - 允许的最大值
 * @returns 限制后的值
 * @throws {Error} 当 min > max 时抛出范围错误
 * @throws {Error} 当任何参数为 NaN 时抛出类型错误
 *
 * @example
 * ```typescript
 * clamp(50, 0, 100);   // 返回 50
 * clamp(-10, 0, 100);  // 返回 0
 * clamp(150, 0, 100);  // 返回 100
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(
      `Invalid range: min (${min}) cannot be greater than max (${max})`,
    );
  }
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) {
    throw new Error("Clamp arguments must be valid numbers, got NaN");
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * 创建一个防抖函数，限制函数的执行频率
 *
 * @typeParam T - 被防抖函数的签名类型
 *
 * @remarks
 * 防抖函数确保在指定延迟时间内，无论触发多少次，函数只执行一次。
 * 支持两种模式：
 * - 延迟模式（默认）：延迟结束后执行最后一次调用
 * - 立即模式：首次调用立即执行，后续调用在延迟结束后执行
 *
 * 返回的函数包含一个 `cancel` 方法，用于取消待执行的调用。
 *
 * @param fn - 需要防抖的原始函数
 * @param delay - 延迟时间（毫秒）
 * @param immediate - 是否在触发时立即执行，默认为 false（延迟执行）
 * @returns 防抖处理后的函数，附带 cancel 方法
 *
 * @example
 * ```typescript
 * // 搜索输入防抖（延迟执行）
 * const search = debounce((query: string) => {
 *   console.log('搜索:', query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => search(e.target.value));
 *
 * // 按钮点击防抖（立即执行）
 * const submit = debounce(() => {
 *   console.log('提交表单');
 * }, 500, true);
 *
 * // 取消待执行的调用
 * search.cancel();
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  immediate: boolean = false,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isInvoke: boolean = false; // 是否激活了立即执行

  const _debounce = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ) {
    // 取消上一次的定时器
    if (timer) clearTimeout(timer);

    // 判断是否需要立即执行
    if (immediate && !isInvoke) {
      fn.apply(this, args);
      isInvoke = true; // 已经立即执行, 阻止下次触发的立即执行
    } else {
      // 延迟执行
      timer = setTimeout(() => {
        // 外部传入的真正要执行的函数
        fn.apply(this, args);
        isInvoke = false;
        timer = null;
      }, delay);
    }
  } as T & { cancel: () => void };

  // 封装取消功能
  _debounce.cancel = function (): void {
    if (timer) clearTimeout(timer);
    timer = null;
    isInvoke = false;
  };

  return _debounce;
}
