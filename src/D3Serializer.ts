interface Options {
  dateFormat?: "iso" | "timestamp" | "formatted";
  space?: string | number;
}

class JSONSerializer {
  private opts: Required<Options>;

  constructor(options: Options = {}) {
    this.opts = {
      dateFormat: options.dateFormat ?? "iso",
      space: options.space ?? 2,
    };
  }

  stringify(value: unknown): string {
    const dateReplacer = (v: Date) => {
      switch (this.opts.dateFormat) {
        case "timestamp":
          return { $type: "Date", $value: v.getTime() };
        case "formatted":
          return {
            $type: "Date",
            $value: v.toLocaleString("zh-CN"),
            $iso: v.toISOString(),
          };
        default:
          return { $type: "Date", $value: v.toISOString() };
      }
    };
    return JSON.stringify(
      value,
      (_, v) => {
        if (v && typeof v === "object") {
          for (const subKey in v) {
            const subValue = v[subKey];
            if (subValue instanceof Date) {
              v[subKey] = dateReplacer(subValue);
            }
          }
        } else if (v instanceof Date) {
          return dateReplacer(v);
        }

        return v;
      },
      this.opts.space,
    );
  }

  parse<T = unknown>(text: string): T {
    return JSON.parse(text, (k, v) => {
      if (v?.$type === "Date") {
        return new Date(
          this.opts.dateFormat === "formatted" && v.$iso ? v.$iso : v.$value,
        );
      }
      return v;
    }) as T;
  }

  deepClone<T>(obj: T): T {
    return this.parse(this.stringify(obj));
  }

  deepEqual(a: unknown, b: unknown): boolean {
    return this.stringify(a) === this.stringify(b);
  }
}

export { JSONSerializer };
export default JSONSerializer;
