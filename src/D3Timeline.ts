// D3Timeline.ts
import * as d3 from "d3";
import { generateID, clamp, debounce } from "./D3Utility";
import Logger from "./D3Logger";
import JSONSerializer from "./D3Serializer";
import { Locale, TimeLocaleDefinitions } from "./D3LocaleDefinitions";

/**
 * 时间轴配置选项接口
 * @interface TimelineOptions
 */
export interface TimelineOptions {
  /** 时间轴ID */
  id?: ID;
  /** 图表宽度（像素） */
  width?: number;
  /** 图表高度（像素） */
  height?: number;
  /** 图表边距设置 */
  margin?: {
    /** 上边距（像素） */
    top: number;
    /** 右边距（像素） */
    right: number;
    /** 下边距（像素） */
    bottom: number;
    /** 左边距（像素） */
    left: number;
  };
  /** 时间线高度（像素） */
  timelineHeight?: number;
  /** 时间线之间的垂直间距（像素） */
  timelineSpacing?: number;
  /** X轴高度（像素） */
  axisHeight?: number;
  /** 最小缩放时间范围（毫秒），默认2周 */
  zoomMin?: number;
  /** 最大缩放时间范围（毫秒），默认1年 */
  zoomMax?: number;
  /** 动画持续时间（毫秒） */
  animationDuration?: number;
  /** 阶段线参数 */
  stageLineParams?: StageLineParams;
  /** 语言：符合ISO639_1，比如：'zh', 'en'，默认：en */
  locale?: Locale;
}

/**
 * 阶段线参数
 * @interface StageLineParams
 */
export interface StageLineParams {
  /** 线条类型，默认: straight */
  path: "straight" | "arc" | "fluid" | "magnet" | "grid";
  /** 线条宽度 */
  size: number;
  /** 线条颜色 */
  color: string;
  /** 是否是虚线 */
  dash: boolean;
  /** 是否显示箭头 */
  arrow: boolean;
  /** 是否显示动画 */
  animation: boolean;
}
/**
 * 暴露给插件的上下文对象
 * @interface D3TimelineContext
 */
export interface D3TimelineContext {
  instance: D3Timeline;
  container: d3.Selection<HTMLElement, unknown, null, undefined>;
  options: Required<TimelineOptions>;
  timeRange: TimeRange;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
}

/**
 * D3Timeline插件接口
 * @interface D3TimelinePlugin
 */
export interface D3TimelinePlugin {
  /** 安装方法 */
  install: (context: D3TimelineContext) => void;
  /** 卸载方法 */
  uninstall: () => void;
}

/**
 * 时间轴数据结构接口
 * @interface TimelineData
 */
export interface TimelineData {
  /** 时间轴唯一标识符 */
  id: ID;
  /** 时间轴名称 */
  name: string;
  /** 时间轴颜色（十六进制或CSS颜色值） */
  color: string;
}

/**
 * ID-Like
 * @type ID
 */
export type ID = number | string;

/**
 * 事件阶段
 * @interface EventStage
 */
export interface EventStage {
  /** 事件阶段唯一标识符 */
  id: ID;
  /** 事件阶段的序号，标识同一阶段的先后顺序 */
  index: number;
}

/**
 * 事件数据结构接口
 * @interface EventData
 */
export interface EventData {
  /** 事件唯一标识符 */
  id: ID;
  /** 所属时间轴ID */
  timelineId: ID;
  /** 事件标题 */
  title: string;
  /** 事件描述（可选） */
  description?: string;
  /** 事件开始时间 */
  startTime: Date;
  /** 事件结束时间 */
  endTime: Date;
  /** 事件颜色（十六进制或CSS颜色值） */
  color: string;
  /** 事件类型：'point'表示时间点，'range'表示时间范围 */
  type: "point" | "range";
  /** 事件阶段（可选） */
  stage?: EventStage;
}

/**
 * 时间范围接口
 * @interface TimeRange
 */
export interface TimeRange {
  /** 开始时间 */
  start: Date;
  /** 结束时间 */
  end: Date;
}

/**
 * 导出数据接口，包含时间轴和事件的完整状态
 * @interface ExportData
 */
export interface ExportData {
  /** 时间轴数据数组 */
  timelines: TimelineData[];
  /** 事件数据数组 */
  events: EventData[];
  /** 当前时间范围 */
  timeRange: TimeRange;
}
/**
 * 支持的事件类型
 * @type EventType
 */
export type EventType = "click" | "zoom" | "zoom.end";
/**
 * 事件类型和事件数据的映射
 * @type EventType
 */
export type EventMap = {
  click: { data: EventData };
  zoom: { scale: number; x: number; y: number };
  "zoom.end": { scale: number; x: number; y: number };
};
/**
 * 事件回调函数类型定义
 * @type EventHandler
 */
export type EventHandler<T extends EventType> = (event: EventMap[T]) => void;

/**
 * D3Timeline - 基于D3.js的时间轴可视化组件
 * @class D3Timeline
 */
export class D3Timeline {
  private logger: Logger = new Logger("D3Timeline");
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;
  private options: Required<TimelineOptions>;
  private timelines: TimelineData[] = [];
  private events: EventData[] = [];
  private timeRange!: TimeRange;
  private eventBindings: {
    [T in EventType]: Set<Function>;
  } = {
    click: new Set(),
    zoom: new Set(),
    "zoom.end": new Set(),
  };
  private boundResize = debounce(this.resize.bind(this), 300);

  // D3 元素
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private mainGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private gridGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private timelineGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private stageLineGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private stageLinesVisible: boolean = true;
  private eventGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private axisGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;

  // D3 比例尺和轴
  private xScale!: d3.ScaleTime<number, number>;
  private xAxis!: d3.Axis<Date>;

  // D3 行为
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private lastTransform?: d3.ZoomTransform;

  // 默认配置
  private readonly defaultOptions: Required<TimelineOptions> = {
    id: generateID(),
    width: 0, // 0表示没有指定，自动适应容器的尺寸
    height: 0, // 0表示没有指定，自动适应容器的尺寸
    margin: { top: 20, right: 20, bottom: 20, left: 120 },
    timelineHeight: 60,
    timelineSpacing: 20,
    axisHeight: 20,
    zoomMin: 8 * 24 * 60 * 60 * 1000, // 2周
    zoomMax: 365 * 24 * 60 * 60 * 1000, // 1年
    animationDuration: 300,
    stageLineParams: {
      path: "straight",
      size: 2,
      color: "#9f86c0",
      dash: true,
      arrow: true,
      animation: false,
    },
    locale: "en",
  };

  /**
   * 创建D3Timeline实例
   * @constructor
   * @param {HTMLElement} container - 容器元素，用于渲染时间轴
   * @param {TimelineOptions} [options={}] - 配置选项
   */
  constructor(container: HTMLElement, options: TimelineOptions = {}) {
    this.container = d3.select(container);
    this.options = { ...this.defaultOptions, ...options };

    // 如果容器有尺寸，使用容器尺寸
    if (this.options.width <= 0 && container.clientWidth > 0) {
      this.options.width = container.clientWidth;
    }
    if (this.options.height <= 0 && container.clientHeight > 0) {
      this.options.height = container.clientHeight;
    }

    // 检查width和height是否合法
    if (this.options.width <= 0) {
      throw Error("D3Timeline err: width is zero.");
    }

    this.init();
  }
  /**
   * 阶段线是否显示
   */
  get isStageLineVisible() {
    return this.stageLinesVisible;
  }

  private init(): void {
    this.setupLocales();
    this.setupTimeRange();
    this.setupSVG();
    this.setupScales();
    this.setupGroups();
    this.setupZoom();
    this.setupTooltip();
    this.setupEventListeners();
    this.setupPlugins();
    this.render();
  }

  private setupTimeRange() {
    const currentDate = new Date();
    const startDate = new Date(
      currentDate.getFullYear() - 10,
      currentDate.getMonth(),
      currentDate.getDate(),
    );
    const endDate = new Date(
      currentDate.getFullYear() + 10,
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    this.timeRange = {
      start: startDate,
      end: endDate,
    };
  }

  private setupLocales() {
    d3.timeFormatDefaultLocale(TimeLocaleDefinitions[this.options.locale]);
  }

  private setupSVG(): void {
    this.svg = this.container
      .append("svg")
      .attr("viewBox", [0, 0, this.options.width, this.options.height])
      .attr("width", this.options.width)
      .attr("height", this.options.height);

    // 定义渐变和滤镜
    const defs = this.svg.append("defs");

    // 添加主内容区域的裁剪路径
    defs
      .append("clipPath")
      .attr("id", `main-clip-${this.options.id}`)
      .append("rect")
      .attr("id", `main-clip-rect-${this.options.id}`) // 添加ID方便resize时更新
      .attr("x", this.options.margin.left)
      .attr("y", this.options.margin.top)
      .attr("width", this.getTimelineInnerWidth())
      .attr("height", clamp(this.getTimelineInnerHeight(), 0, Infinity));

    // 时间线渐变
    const gradient = defs
      .append("linearGradient")
      .attr("id", `timelineGradient-${this.options.id}`)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#667eea");

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#764ba2");

    // 阴影滤镜
    const filter = defs
      .append("filter")
      .attr("id", `drop-shadow-${this.options.id}`)
      .attr("height", "130%");

    filter
      .append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 2)
      .attr("result", "blur");

    filter
      .append("feOffset")
      .attr("in", "blur")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("result", "offsetBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");
  }

  private setupScales(): void {
    this.xScale = d3
      .scaleTime()
      .domain([this.timeRange.start, this.timeRange.end])
      .range([
        this.options.margin.left,
        this.options.width - this.options.margin.right,
      ]);

    this.xAxis = d3
      .axisBottom<Date>(this.xScale)
      .ticks(this.options.width / 80);
  }

  private setupGroups(): void {
    this.mainGroup = this.svg.append("g").attr("class", "main-group");

    // 标签组（不裁剪）
    this.labelGroup = this.mainGroup.append("g").attr("class", "d3-labels");

    // 裁剪组：网格、时间线、事件
    const clipGroup = this.mainGroup
      .append("g")
      .attr("clip-path", `url(#main-clip-${this.options.id})`);
    this.gridGroup = clipGroup.append("g").attr("class", "d3-grid");
    this.timelineGroup = clipGroup.append("g").attr("class", "timelines");
    this.stageLineGroup = clipGroup.append("g").attr("class", "stage-lines");
    this.eventGroup = clipGroup.append("g").attr("class", "events");
    this.axisGroup = clipGroup
      .append("g")
      .attr("class", "d3-axis")
      .attr(
        "transform",
        `translate(0, ${this.options.height - this.options.margin.bottom - this.options.axisHeight})`,
      );
  }

  private isPointInClipArea(event: MouseEvent): boolean {
    // 获取相对于 clipGroup 的本地坐标
    const point = d3.pointer(event, this.timelineGroup.node());
    const [x, y] = point;

    const width = this.getTimelineInnerWidth();
    const height = this.getTimelineInnerHeight();

    return (
      x >= this.options.margin.left &&
      x <= width + this.options.margin.left &&
      y >= this.options.margin.top &&
      y <= height + this.options.margin.top
    );
  }

  private getTimelineInnerWidth(): number {
    return (
      this.options.width - this.options.margin.left - this.options.margin.right
    );
  }

  private getTimelineInnerHeight(excludeAxis = false): number {
    return (
      this.options.height -
      this.options.margin.top -
      this.options.margin.bottom -
      (excludeAxis ? this.options.axisHeight : 0)
    );
  }

  private setupZoom(): void {
    // 根据时间范围限制计算缩放比例限制
    const initialRange =
      this.timeRange.end.getTime() - this.timeRange.start.getTime();
    const minScale = this.options.zoomMax / initialRange;
    const maxScale = initialRange / this.options.zoomMin;

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .filter(this.isPointInClipArea.bind(this))
      .scaleExtent([Math.max(1, minScale), Math.max(1, maxScale)]) // 限制最小/最大
      .extent([
        [this.options.margin.left, 0],
        [this.options.width - this.options.margin.right, this.options.height],
      ])
      .translateExtent([
        [this.options.margin.left, -Infinity],
        [this.options.width - this.options.margin.right, Infinity],
      ]);
  }

  private setupTooltip(): void {
    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-timeline-tooltip")
      .style("position", "fixed")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "12px")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "1000")
      .style("max-width", "250px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)");
  }

  private setupPlugins() {
    D3Timeline.plugins.forEach((plug) => {
      plug.install({
        instance: this,
        container: this.container,
        options: this.options,
        timeRange: this.timeRange,
        svg: this.svg,
      });
    });
  }

  private detachPlugins() {
    D3Timeline.plugins.forEach((plug) => {
      plug.uninstall();
    });
  }

  private setupEventListeners() {
    if (this.zoom) {
      this.zoom
        .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          this.handleZoom(event);
          this.emit("zoom", {
            scale: event.transform.k,
            x: event.transform.x,
            y: event.transform.y,
          });
        })
        .on("zoom.end", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          this.emit("zoom.end", {
            scale: event.transform.k,
            x: event.transform.x,
            y: event.transform.y,
          });
        });
    }

    if (this.svg) {
      this.svg.on("click", (event: MouseEvent) => {
        const eventDom = (event.target as HTMLElement).closest(".event");
        if (eventDom) {
          const eventData = d3.select(eventDom).datum() as EventData;
          this.emit("click", { data: eventData });
        }
      });
    }
    window.addEventListener("resize", this.boundResize);
  }

  private removeEventListeners() {
    if (this.zoom) {
      this.zoom.on("zoom", null).on("zoom.end", null);
    }
    if (this.svg) {
      this.svg.on("click", null);
    }
    window.removeEventListener("resize", this.boundResize);
    // 移除绑定事件
    this.eventBindings.click.clear();
    this.eventBindings.zoom.clear();
    this.eventBindings["zoom.end"].clear();
  }

  // 更新时间线位置
  private updateTimelinePositions(): void {
    this.timelineGroup
      .selectAll<SVGGElement, TimelineData>(".timeline")
      .attr(
        "transform",
        (d) => `translate(0, ${this.calculateTimelineOffsetY(d)})`,
      );
  }

  private calculateTimelineOffsetY(timeline?: TimelineData): number {
    return timeline
      ? (this.timelines.length - this.timelines.indexOf(timeline) - 1) *
          (this.options.timelineHeight + this.options.timelineSpacing) +
          this.options.margin.top
      : 0;
  }

  private calculateHeight() {
    return (
      this.options.margin.top +
      this.options.margin.bottom +
      this.options.axisHeight +
      this.timelines.length *
        (this.options.timelineSpacing + this.options.timelineHeight)
    );
  }

  // 更新事件位置
  private updateEventPositions(xScale: d3.ScaleTime<number, number>): void {
    this.eventGroup
      .selectAll<SVGGElement, EventData>(".event")
      .attr("transform", (d) => {
        const timeline = this.timelines.find((t) => t.id === d.timelineId);
        const x = xScale(d.startTime);
        const y = timeline
          ? this.calculateTimelineOffsetY(timeline) +
            this.options.timelineHeight / 2
          : 0;
        return `translate(${x}, ${y})`;
      })
      .select(".d3-event-range") // 更新范围事件的宽度
      .attr("width", (d) => {
        if (d.type === "range") {
          const endX = xScale(d.endTime);
          const startX = xScale(d.startTime);
          return Math.max(5, endX - startX);
        }
        return 0;
      });

    this.eventGroup
      .selectAll<SVGGElement, EventData>(".event")
      .filter((d) => d.type === "range")
      .select(".d3-event-text")
      .attr("x", (d) => {
        const endX = xScale(d.endTime);
        const startX = xScale(d.startTime);
        return (endX - startX) / 2;
      });

    // 更新范围事件的文字位置
    this.eventGroup
      .selectAll<SVGGElement, EventData>(".event")
      .select(".event-text")
      .filter((d) => d.type === "range")
      .attr("x", (d) => {
        if (d.type === "range") {
          const endX = xScale(d.endTime);
          const startX = xScale(d.startTime);
          return (endX - startX) / 2;
        }
        return 0;
      });
  }

  private emit<T extends EventType>(eventType: T, data: EventMap[T]) {
    this.eventBindings[eventType].forEach((handler) => {
      (handler as EventHandler<T>)(data);
    });
  }
  /**
   * 绑定事件
   * @param {EventType} eventType 事件类型
   * @param {EventHandler} handler 事件处理器
   */
  public on<T extends EventType>(eventType: T, handler: EventHandler<T>) {
    if (!this.eventBindings[eventType].has(handler)) {
      this.eventBindings[eventType].add(handler);
    }
  }
  /**
   * 事件解绑
   * @param {EventType} eventType 事件类型
   * @param {EventHandler} handler 事件处理器
   */
  public off<T extends EventType>(eventType: T, handler: EventHandler<T>) {
    this.eventBindings[eventType].delete(handler);
  }

  /**
   * 添加时间轴
   * @param {string} name - 时间轴名称
   * @param {string} [color="#667eea"] - 时间轴颜色（十六进制或CSS颜色值）
   * @param {ID} id - 时间轴ID（可选）
   * @returns {TimelineData} 新增的时间轴对象
   */
  public addTimeline(
    name: string,
    color: string = "#667eea",
    id?: ID,
    autofit = true,
  ): TimelineData {
    const timeline: TimelineData = {
      id: id ?? generateID(),
      name: name,
      color: color,
    };

    this.timelines.push(timeline);

    if (autofit) {
      this.resize();
    }

    return timeline;
  }

  /**
   * 批量添加时间轴
   * @param {Array<{name: string, color?: string, id?: ID}>} timelineConfigs - 时间轴配置数组
   * @returns {TimelineData[]} 新增的时间轴对象数组
   */
  public addTimelines(
    timelineConfigs: Array<{
      name: string;
      color?: string;
      id?: ID;
    }>,
    autofit = true,
  ): TimelineData[] {
    if (!Array.isArray(timelineConfigs) || timelineConfigs.length === 0) {
      return [];
    }

    const addedTimelines: TimelineData[] = timelineConfigs.map((config) => {
      const timeline: TimelineData = {
        id: config.id ?? generateID(),
        name: config.name,
        color: config.color ?? "#667eea",
      };
      return timeline;
    });

    this.timelines.push(...addedTimelines);

    if (autofit) {
      this.resize();
    }
    return addedTimelines;
  }

  /**
   * 移除指定ID的时间轴及其所有事件
   * @param {ID} id - 要移除的时间轴ID
   * @returns {void}
   */
  public removeTimeline(id: ID): void {
    this.timelines = this.timelines.filter((t) => t.id !== id);
    this.events = this.events.filter((e) => e.timelineId !== id);
    this.resize();
  }

  /**
   * 向指定时间轴添加事件
   * @param {Partial<EventData>} event - 事件配置对象
   * @param {ID} timelineId - 目标时间轴ID
   * @param {boolean} [autofit=true] - 是否自动调整视图范围
   * @returns {EventData | null} 成功返回事件对象，失败返回null
   */
  public addEvent(
    event: Partial<EventData>,
    timelineId?: ID,
    autofit: boolean = true,
  ): EventData | null {
    const timeline = this.timelines.find((t) => t.id === timelineId);
    if (!timeline) return null;
    timelineId = timelineId ?? event.timelineId;
    if (!timelineId) {
      throw Error("The timelineId is not specified.");
    }

    const eventData: EventData = {
      id: event.id ?? generateID(),
      timelineId: timelineId,
      title: event.title || "",
      description: event.description || "",
      startTime: event.startTime || new Date(),
      endTime: event.endTime || event.startTime || new Date(),
      color: event.color || timeline.color,
      type: event.endTime ? "range" : "point",
      stage: event.stage,
    };

    this.events.push(eventData);
    this.render();
    if (autofit) {
      this.fitRange();
    }
    return eventData;
  }

  /**
   * 向指定时间轴批量添加事件
   * @param {Partial<EventData>[]} events - 事件配置对象数组
   * @param {ID} timelineId - 目标时间轴ID
   * @param {boolean} [autofit=true] - 是否自动调整视图范围
   * @returns {EventData[] | null} 成功返回事件对象数组，失败返回null
   */
  public addEvents(
    events: Partial<EventData>[],
    timelineId?: ID,
    autofit: boolean = true,
  ): EventData[] | null {
    if (!Array.isArray(events) || events.length === 0) return null;

    const addedEvents: EventData[] = events.map((event) => {
      let targetTimelineId = timelineId ?? event.timelineId;
      if (!targetTimelineId) throw Error("The timelineId is not specified.");
      const timeline = this.timelines.find((t) => t.id === targetTimelineId);
      if (!timeline) throw Error("The timeineId is invalid.");
      const eventData: EventData = {
        id: event.id ?? generateID(),
        timelineId: targetTimelineId,
        title: event.title || "",
        description: event.description || "",
        startTime: event.startTime || new Date(),
        endTime: event.endTime || event.startTime || new Date(),
        color: event.color || timeline.color,
        type: event.endTime ? "range" : "point",
        stage: event.stage,
      };
      return eventData;
    });

    this.events.push(...addedEvents);
    this.render();

    if (autofit) {
      this.fitRange();
    }

    return addedEvents;
  }

  /**
   * 移除指定ID的事件
   * @param {number} id - 要移除的事件ID
   * @returns {void}
   */
  public removeEvent(id: number): void {
    this.events = this.events.filter((e) => e.id !== id);
    this.render();
  }
  /**
   * 切换语言
   * @param {Locale} locale 语言编码：ISO639_1
   */
  public changeLocale(locale: Locale) {
    this.options.locale = locale;
    d3.timeFormatDefaultLocale(TimeLocaleDefinitions[locale]);
    this.setupScales();
    // 如果做了变换，则需要重新渲染轴
    if (this.lastTransform) {
      // 构造一个微小的偏移
      const transform = new d3.ZoomTransform(
        this.lastTransform.k,
        this.lastTransform.x + 1,
        this.lastTransform.y,
      );
      this.renderAxis(transform.rescaleX(this.xScale));
      // 再偏移回来
      this.renderAxis(this.lastTransform.rescaleX(this.xScale));
    }
  }

  /**
   * 重新渲染整个时间轴（仅当数据量变化时完全重绘，否则只更新位置）
   * @returns {void}
   */
  public render(force = false): void {
    // 检查是否需要完全重新渲染
    const timelineCount = this.timelineGroup.selectAll(".d3-timeline").size();
    const eventCount = this.eventGroup.selectAll(".event").size();

    if (
      timelineCount !== this.timelines.length ||
      eventCount !== this.events.length ||
      force
    ) {
      this.renderTimelines();
      this.renderEvents();
      this.renderStageLines();
    } else {
      // 只需要更新位置
      this.updateTimelinePositions();
      this.updateEventPositions(this.xScale);
    }
    this.renderGrid(this.xScale);
    this.renderAxis(this.xScale);
  }

  private renderGrid(xScale: d3.ScaleTime<number, number>): void {
    this.gridGroup.selectAll("*").remove();

    const gridLines = this.xScale.ticks(20);

    this.gridGroup
      .selectAll(".vertical-grid")
      .data(gridLines)
      .enter()
      .append("line")
      .attr("class", "vertical-grid")
      .attr("x1", (d) => xScale(d))
      .attr("y1", this.options.margin.top)
      .attr("x2", (d) => xScale(d))
      .attr(
        "y2",
        this.options.height -
          this.options.margin.bottom -
          this.options.axisHeight,
      )
      .attr("class", "d3-grid");
  }

  private renderTimelines(): void {
    const timelineSelection = this.timelineGroup
      .selectAll<SVGGElement, TimelineData>(".d3-timeline")
      .data(this.timelines, (d) => d.id.toString());

    const timelineEnter = timelineSelection
      .enter()
      .append("g")
      .attr("class", "d3-timeline");

    // 时间线背景
    timelineEnter
      .append("rect")
      .attr("class", "d3-timeline-bg")
      .attr("x", this.options.margin.left)
      .attr("width", this.getTimelineInnerWidth())
      .attr("height", this.options.timelineHeight)
      .attr("filter", `url(#drop-shadow-${this.options.id})`);

    // 时间线主体
    timelineEnter
      .append("line")
      .attr("class", "d3-timeline-line")
      .attr("x1", this.options.margin.left)
      .attr("x2", this.options.margin.left + this.getTimelineInnerWidth()); // 确保x2动态计算

    // 更新所有时间线
    const timelineUpdate = timelineEnter.merge(timelineSelection);

    timelineUpdate
      .transition()
      .duration(this.options.animationDuration)
      .attr(
        "transform",
        (d) => `translate(0, ${this.calculateTimelineOffsetY(d)})`,
      );

    timelineUpdate.select(".d3-timeline-bg").attr("y", 0);

    timelineUpdate
      .select(".d3-timeline-line")
      .attr("y1", this.options.timelineHeight / 2)
      .attr("y2", this.options.timelineHeight / 2)
      .attr("stroke", (d) => d.color);

    // 移除旧时间线
    timelineSelection
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style("opacity", 0)
      .remove();

    this.renderTimelineLabels();
  }

  private renderTimelineLabels(): void {
    const labelSelection = this.labelGroup
      .selectAll<SVGTextElement, TimelineData>(".d3-timeline-label")
      .data(this.timelines, (d) => d.id.toString());

    // 进入新标签
    const labelEnter = labelSelection
      .enter()
      .append("text")
      .attr("class", "d3-timeline-label")
      .attr("x", this.options.margin.left - 10)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#333")
      .attr("font-size", "14")
      .attr("font-weight", "bold");

    // 更新所有标签
    const labelUpdate = labelEnter.merge(labelSelection);

    labelUpdate
      .transition()
      .duration(this.options.animationDuration)
      .attr(
        "y",
        (d) =>
          this.calculateTimelineOffsetY(d) + this.options.timelineHeight / 2,
      )
      .text((d) => d.name);

    // 移除旧标签
    labelSelection
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style("opacity", 0)
      .remove();
  }

  private handleZoom(event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void {
    const { transform } = event;

    const xScaleR = transform.rescaleX(this.xScale);

    // 只更新需要重新定位的元素，不重新创建
    this.updateTimelinePositions();
    this.updateEventPositions(xScaleR);

    // 更新阶段线位置
    this.updateStageLinePositions(xScaleR);

    // 更新timeline背景宽度和线条长度
    const timelineWidth = this.getTimelineInnerWidth();
    this.timelineGroup
      .selectAll<SVGRectElement, TimelineData>(".d3-timeline-bg")
      .attr("width", timelineWidth)
      .attr("fill", `url(#timelineGradient-${this.options.id})`);

    this.timelineGroup
      .selectAll<SVGLineElement, TimelineData>(".d3-timeline-line")
      .attr("x2", this.options.margin.left + timelineWidth);

    // 重新渲染轴以更新刻度和格式
    this.renderAxis(xScaleR);
    this.renderGrid(xScaleR);

    this.lastTransform = transform;
  }

  private renderEvents(): void {
    const eventSelection = this.eventGroup
      .selectAll<SVGGElement, EventData>(".event")
      .data(this.events, (d) => d.id.toString());

    // 进入新事件
    const eventEnter = eventSelection
      .enter()
      .append("g")
      .attr("class", "event");

    // 范围事件
    const rangeEvents = eventEnter.filter((d) => d.type === "range");

    rangeEvents
      .append("rect")
      .attr("class", "d3-event-range")
      .attr("height", 30)
      .attr("y", -15)
      .attr("rx", 6)
      .attr("filter", `url(#drop-shadow-${this.options.id})`);

    rangeEvents
      .append("text")
      .attr("class", "d3-event-text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("y", 0);

    // 点事件
    const pointEvents = eventEnter.filter((d) => d.type === "point");

    pointEvents
      .append("circle")
      .attr("class", "d3-event-point")
      .attr("r", 8)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("filter", `url(#drop-shadow-${this.options.id})`);

    pointEvents
      .append("text")
      .attr("class", "d3-event-text")
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .attr("y", -20);

    // 更新所有事件
    const eventUpdate = eventEnter.merge(eventSelection);

    eventUpdate
      .transition()
      .duration(this.options.animationDuration)
      .attr("transform", (d) => {
        const timeline = this.timelines.find((t) => t.id === d.timelineId);
        const x = this.xScale(d.startTime);
        const y = timeline
          ? this.calculateTimelineOffsetY(timeline) +
            this.options.timelineHeight
          : 0;
        return `translate(${x}, ${y})`;
      });

    // 更新范围事件
    eventUpdate
      .select(".d3-event-range")
      .attr("x", 0)
      .attr("width", (d) => {
        const endX = this.xScale(d.endTime);
        const startX = this.xScale(d.startTime);
        return Math.max(5, endX - startX);
      })
      .attr("fill", (d) => d.color);

    eventUpdate
      .select(".d3-event-text")
      .filter((d) => d.type === "range")
      .attr("x", (d) => {
        const endX = this.xScale(d.endTime);
        const startX = this.xScale(d.startTime);
        return (endX - startX) / 2;
      })
      .text((d) => d.title);

    // 更新点事件
    eventUpdate
      .select(".d3-event-point")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", (d) => d.color);

    eventUpdate
      .select(".d3-event-text")
      .filter((d) => d.type === "point")
      .attr("x", 0)
      .text((d) => d.title);

    // 添加交互
    eventUpdate
      .on("mouseover", (event: MouseEvent, d: EventData) => {
        const element = event.currentTarget as SVGGElement;
        this.showTooltip(event, d, element);
      })
      .on("mouseout", () => this.hideTooltip());

    // 移除旧事件
    eventSelection
      .exit()
      .transition()
      .duration(this.options.animationDuration)
      .style("opacity", 0)
      .remove();
  }

  private generatePathSegment(
    start: { x: number; y: number },
    end: { x: number; y: number },
    pathType: string,
  ): string {
    switch (pathType) {
      case "arc":
        const midX = (start.x + end.x) / 2;
        const arcHeight = Math.abs(end.x - start.x) * 0.2;
        return ` Q ${midX} ${Math.min(start.y, end.y) - arcHeight} ${end.x} ${end.y}`;

      case "fluid":
        const cp1x = start.x + (end.x - start.x) * 0.5;
        const cp1y = start.y;
        const cp2x = start.x + (end.x - start.x) * 0.5;
        const cp2y = end.y;
        return ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;

      case "magnet":
        const midY = (start.y + end.y) / 2;
        return ` L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;

      case "grid":
        const offset = 30;
        if (Math.abs(start.y - end.y) < 5) {
          return ` L ${end.x} ${end.y}`;
        }
        return ` L ${start.x + offset} ${start.y} L ${start.x + offset} ${end.y} L ${end.x} ${end.y}`;

      case "straight":
      default:
        return ` L ${end.x} ${end.y}`;
    }
  }

  // 更新阶段线位置（用于缩放时）
  private updateStageLinePositions(xScale: d3.ScaleTime<number, number>): void {
    const stageGroups = new Map<string | number, EventData[]>();

    this.events.forEach((event) => {
      if (event.stage) {
        const key = event.stage.id;
        if (!stageGroups.has(key)) {
          stageGroups.set(key, []);
        }
        stageGroups.get(key)!.push(event);
      }
    });

    const params = this.options.stageLineParams;

    stageGroups.forEach((events, stageId) => {
      events.sort((a, b) => (a.stage!.index || 0) - (b.stage!.index || 0));
      if (events.length < 2) return;

      const group = this.stageLineGroup.select<SVGGElement>(
        `.stage-${stageId}`,
      );
      if (group.empty()) return;

      // 清空 group 并重新绘制（因为 zoom 改变了 x 坐标）
      group.selectAll("*").remove();

      const points = events.map((event) => {
        const timeline = this.timelines.find((t) => t.id === event.timelineId);
        const x = xScale(event.startTime);
        const y = timeline
          ? this.calculateTimelineOffsetY(timeline) +
            this.options.timelineHeight / 2
          : 0;
        const width =
          event.type === "range"
            ? xScale(event.endTime) - xScale(event.startTime)
            : 0;
        return { x, y, event, width };
      });

      let pathData = "";
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const segment = this.generatePathSegment(start, end, params.path);
        if (i === 0) pathData += `M ${start.x} ${start.y}`;
        pathData += segment;
      }

      // 在 group 中重新绘制路径
      group
        .append("path")
        .attr("class", "stage-path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", params.color)
        .attr("stroke-width", params.size)
        .attr("stroke-dasharray", params.dash ? "5,5" : null);

      // 在 group 中重新绘制箭头
      if (params.arrow) {
        for (let i = 0; i < points.length - 1; i++) {
          this.drawArrowInGroup(
            group,
            points[i],
            points[i + 1],
            params,
            params.path,
          );
        }
      }
    });
  }

  private renderStageLines(): void {
    if (!this.stageLinesVisible) return;
    this.stageLineGroup.selectAll("*").remove();

    const stageGroups = new Map<string | number, EventData[]>();

    this.events.forEach((event) => {
      if (event.stage) {
        const key = event.stage.id;
        if (!stageGroups.has(key)) {
          stageGroups.set(key, []);
        }
        stageGroups.get(key)!.push(event);
      }
    });

    const params = this.options.stageLineParams;

    stageGroups.forEach((events, stageId) => {
      events.sort((a, b) => (a.stage!.index || 0) - (b.stage!.index || 0));
      if (events.length < 2) return;

      // 为每个 stage 创建 group
      const stageGroup = this.stageLineGroup
        .append("g")
        .attr("class", `stage-line-group stage-${stageId}`);

      const points = events.map((event) => {
        const timeline = this.timelines.find((t) => t.id === event.timelineId);
        const x = this.xScale(event.startTime);
        const y = timeline
          ? this.calculateTimelineOffsetY(timeline) +
            this.options.timelineHeight / 2
          : 0;
        const width =
          event.type === "range"
            ? this.xScale(event.endTime) - this.xScale(event.startTime)
            : 0;
        return { x, y, event, width };
      });

      let pathData = "";
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const segment = this.generatePathSegment(start, end, params.path);
        if (i === 0) pathData += `M ${start.x} ${start.y}`;
        pathData += segment;
      }

      // 路径放入 group
      const path = stageGroup
        .append("path")
        .attr("class", "stage-path")
        .attr("d", pathData)
        .attr("fill", "none")
        .attr("stroke", params.color)
        .attr("stroke-width", params.size)
        .attr("stroke-dasharray", params.dash ? "5,5" : null)
        .style("opacity", 0);

      path
        .transition()
        .duration(this.options.animationDuration)
        .style("opacity", 1);

      // 箭头放入同一个 group
      if (params.arrow && points.length >= 2) {
        for (let i = 0; i < points.length - 1; i++) {
          this.drawArrowInGroup(
            stageGroup,
            points[i],
            points[i + 1],
            params,
            params.path,
          );
        }
      }

      if (params.animation) {
        const totalLength =
          (path.node() as SVGPathElement)?.getTotalLength() || 0;
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(2000)
          .ease(d3.easeLinear)
          .attr("stroke-dashoffset", 0)
          .on("end", function () {
            d3.select(this).attr(
              "stroke-dasharray",
              params.dash ? "5,5" : null,
            );
          });
      }
    });
  }

  private drawArrowInGroup(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    start: { x: number; y: number; event: EventData; width: number },
    end: { x: number; y: number; event: EventData; width: number },
    params: StageLineParams,
    pathType: string,
  ): void {
    // 计算切线角度
    let angle: number;
    switch (pathType) {
      case "arc": {
        const midX = (start.x + end.x) / 2;
        const arcHeight = Math.abs(end.x - start.x) * 0.2;
        const controlY = Math.min(start.y, end.y) - arcHeight;
        angle = Math.atan2(end.y - controlY, end.x - midX);
        break;
      }
      case "fluid": {
        const cp2x = start.x + (end.x - start.x) * 0.5;
        const cp2y = end.y;
        angle = Math.atan2(end.y - cp2y, end.x - cp2x);
        break;
      }
      case "magnet":
      case "grid":
      case "straight":
      default:
        angle = Math.atan2(end.y - start.y, end.x - start.x);
    }

    // 计算箭头目标位置（考虑事件尺寸偏移）
    let targetX = end.x;
    let targetY = end.y;

    if (end.event.type === "point") {
      // 圆形半径8，沿反方向偏移8像素
      targetX = end.x - 8 * Math.cos(angle);
      targetY = end.y - 8 * Math.sin(angle);
    } else if (end.event.type === "range") {
      // 根据方向决定指向左边或右边的中点
      // 如果从左到右（start.x < end.x），指向左边缘（往左偏移width/2）
      // 如果从右到左（start.x > end.x），指向右边缘（往右偏移width/2）
      const direction = start.x < end.x ? -1 : 1;
      const offsetX = (end.width / 2) * direction;
      targetX = end.x + offsetX;
      targetY = end.y; // 垂直中点
    }

    // 绘制箭头（以 targetX, targetY 为顶点，沿 angle 反方向）
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    const x1 = targetX - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = targetY - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = targetX - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = targetY - arrowLength * Math.sin(angle + arrowAngle);

    group
      .append("path")
      .attr("class", "stage-arrow")
      .attr(
        "d",
        `M ${targetX} ${targetY} L ${x1} ${y1} M ${targetX} ${targetY} L ${x2} ${y2}`,
      )
      .attr("stroke", params.color)
      .attr("stroke-width", params.size)
      .attr("fill", "none");
  }

  private renderAxis(xScale: d3.ScaleTime<number, number>): void {
    this.xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(this.options.width / 80)
      .tickSizeOuter(0);

    // 重新渲染轴
    this.axisGroup.call(this.xAxis);
  }

  private showTooltip(
    _: MouseEvent,
    data: EventData,
    element: SVGGElement,
  ): void {
    this.tooltip.transition().duration(200).style("opacity", 1);

    const timeline = this.timelines.find((t) => t.id === data.timelineId);
    const content = `
            <strong>${data.title}</strong><br>
            ${data.description ? data.description + "<br>" : ""}
            时间线: ${timeline ? timeline.name : "未知"}<br>
            开始: ${data.startTime.toLocaleString("zh-CN")}<br>
            ${data.type === "range" ? `结束: ${data.endTime.toLocaleString("zh-CN")}` : ""}
        `;

    this.tooltip.html(content);
    const margin = 8;
    // 获取被悬停元素的位置信息
    const rect = element.getBoundingClientRect();
    const tooltipNode = this.tooltip.node();
    if (!tooltipNode) return;
    const tooltipRect = tooltipNode.getBoundingClientRect();

    // 计算位置：优先显示在元素上方，水平居中
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top - tooltipRect.height - margin; // 10px 间距

    // 如果上方空间不足（会超出视口顶部），则显示在元素下方
    if (top < 0) {
      top = rect.bottom + margin;
    }

    // 水平边界检查：防止超出视口左右边缘
    if (left < margin) {
      left = margin;
    } else if (left + tooltipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tooltipRect.width - margin;
    }

    this.tooltip.style("left", left + "px").style("top", top + "px");
  }

  private hideTooltip(): void {
    this.tooltip.transition().duration(200).style("opacity", 0);
  }

  private async scaleTo(range: TimeRange) {
    const fullDiffTime =
      this.timeRange.end.getTime() - this.timeRange.start.getTime();
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const diffTime = endTime - startTime;
    const oneday = 24 * 60 * 60 * 1000;
    const k = fullDiffTime / (diffTime + oneday);
    const midDate = new Date((startTime + endTime) / 2);
    return await this.svg
      .call(this.zoom)
      .transition()
      .duration(500)
      .call(this.zoom.scaleTo, k, [this.xScale(midDate), 0])
      .end();
  }

  private async translateTo(range: TimeRange) {
    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    const midDate = new Date((startTime + endTime) / 2);

    return await this.svg
      .call(this.zoom)
      .transition()
      .duration(500)
      .call(this.zoom.translateTo, this.xScale(midDate), 0)
      .end();
  }

  /**
   * 根据数据自动适应窗口显示范围
   */
  public async fitRange() {
    const range = d3.extent(
      this.events.flatMap((e) => [e.startTime, e.endTime]),
    );
    if (range[0] && range[1]) {
      const targetRange = { start: range[0], end: range[1] };
      try {
        await this.translateTo(targetRange);
        await this.scaleTo(targetRange);
      } catch (e: any) {
        this.logger.warn("Cautch fitRange error: " + String(e));
      }
    }
  }
  /**
   * 显示阶段连线
   */
  public showStageLines() {
    this.stageLinesVisible = true;
    this.stageLineGroup.attr("style", "display: ''");
  }
  /**
   * 隐藏阶段连线
   */
  public hideStageLines() {
    this.stageLinesVisible = false;
    this.stageLineGroup.attr("style", "display: none");
  }

  /**
   * 设置缩放级别
   * @param {number} zoom - 缩放比例值，大于1表示放大，小于1表示缩小
   * @returns {void}
   */
  public setZoom(zoom: number): void {
    const transform = d3.zoomIdentity.scale(zoom);
    this.svg
      .transition()
      .duration(this.options.animationDuration)
      .call(this.zoom.transform, transform);
  }

  /**
   * 重置视图为初始状态
   * @returns {void}
   */
  public resetView(): void {
    this.fitRange();
  }

  /**
   * 响应式调整大小 - 根据容器尺寸重新计算并渲染
   * @returns {void}
   */
  public resize(): void {
    const containerNode = this.container.node() as HTMLElement;
    this.options.width = containerNode.clientWidth || this.options.width;
    this.options.height = this.calculateHeight();

    this.svg
      .attr("viewBox", [0, 0, this.options.width, this.options.height])
      .attr("width", this.options.width)
      .attr("height", this.options.height);
    this.svg
      .select(`#main-clip-rect-${this.options.id}`)
      .attr("width", this.getTimelineInnerWidth())
      .attr("height", clamp(this.getTimelineInnerHeight(), 0, Infinity));

    this.setupScales();

    this.axisGroup.attr(
      "transform",
      `translate(0, ${this.options.height - this.options.margin.bottom - this.options.axisHeight})`,
    );

    this.zoom
      .extent([
        [this.options.margin.left, 0],
        [this.options.width - this.options.margin.right, this.options.height],
      ])
      .translateExtent([
        [this.options.margin.left, -Infinity],
        [this.options.width - this.options.margin.right, Infinity],
      ]);

    this.gridGroup.attr(
      "y2",
      this.options.height -
        this.options.margin.bottom -
        this.options.axisHeight,
    );

    this.render(true);
    this.fitRange();
  }

  /**
   * 设置时间轴显示的时间范围
   * @param {Date} start - 开始时间
   * @param {Date} end - 结束时间
   * @returns {void}
   * @throws {Error} 如果开始时间晚于结束时间
   */
  public setTimeRange(start: Date, end: Date): void {
    this.timeRange = { start, end };
    this.xScale.domain([start, end]);
    this.render();
  }

  /**
   * 获取所有时间轴数据的副本
   * @returns {TimelineData[]} 时间轴数组的深拷贝
   */
  public getTimelines(): TimelineData[] {
    return [...this.timelines];
  }

  /**
   * 获取所有事件数据的副本
   * @returns {EventData[]} 事件数组的深拷贝
   */
  public getEvents(): EventData[] {
    return [...this.events];
  }

  /**
   * 导出当前时间轴和事件的完整状态数据
   * @returns {ExportData} 包含时间轴、事件和时间范围的对象
   */
  public exportData(): ExportData {
    return {
      timelines: [...this.timelines],
      events: [...this.events],
      timeRange: { ...this.timeRange },
    };
  }
  /**
   * 导出当前时间轴和事件的完整状态数据并序列化为字符串
   * @param autoFormat 是否进行JSON格式化
   * @returns {string} 序列化的数据
   */
  public exportDataString(autoFormat = false): string {
    return new JSONSerializer({ space: autoFormat ? 2 : 0 }).stringify(
      this.exportData(),
    );
  }

  /**
   * 导入时间轴数据，会覆盖现有数据
   * @param {ExportData} data - 要导入的数据对象
   * @returns {boolean} 成功返回true，失败返回false
   */
  public importData(data: ExportData): boolean {
    try {
      this.timelines = [...data.timelines];
      this.events = [...data.events];
      this.timeRange = { ...data.timeRange };
      this.xScale.domain([this.timeRange.start, this.timeRange.end]);
      this.resize();
      return true;
    } catch (error: any) {
      this.logger.error(`数据导入失败: ${error.message}`);
      return false;
    }
  }
  /**
   * 导入时间轴数据，会覆盖现有数据
   * @param {string} data 要导入的数据对象
   * @returns {boolean} 成功返回true，失败返回false
   */
  public importDataString(data: string): boolean {
    return this.importData(new JSONSerializer().parse(data));
  }

  /**
   * 销毁时间轴实例，清理DOM元素和事件监听器
   * @returns {void}
   */
  public destroy(): void {
    this.removeEventListeners();
    this.tooltip.remove();
    this.svg.remove();
    this.detachPlugins();
  }
  /**
   * 插件集合
   */
  public static plugins: D3TimelinePlugin[] = [];
}

// 默认导出
export default D3Timeline;
