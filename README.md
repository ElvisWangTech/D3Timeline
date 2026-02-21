# D3Timeline

一个基于 D3.js 的轻量级时间轴可视化库，支持多时间线、点和范围事件、阶段连线、缩放拖拽等功能。

## 特性

- 📊 **多时间线支持** - 同时展示多个平行时间线
- 🎯 **事件类型** - 支持时间点（point）和时间段（range）两种事件
- 🔗 **阶段连线** - 跨时间线连接相关事件，支持多种连线样式（直线、弧线、磁吸线等）
- 🔍 **交互操作** - 支持缩放、拖拽、平移
- 🌍 **多语言** - 内置中英文支持，可扩展更多语言
- 📱 **响应式** - 自动适应容器尺寸变化
- 💾 **数据导入导出** - 支持 JSON 序列化/反序列化
- 🛠️ **自定义插件** - 支持 自定义插件，内置常用的的插件（ZoomSlider, CursorLine, MultiSyncV等）

## 效果
<img width="2091" height="678" alt="image" src="https://github.com/user-attachments/assets/f6a9ad64-1e1b-4cb5-b2e4-4ca3b22b2b65" />
<img width="2067" height="662" alt="image" src="https://github.com/user-attachments/assets/d8dba78b-bc11-49a8-9ab7-c7304672f2d8" />

📚 [演示地址](https://elviswangtech.github.io/d3timeline-example/)


## 快速开始
### 安装npm包
```bash
npm install @yiwei016/d3timeline
```
### 安装官方插件
```bash
npm install @yiwei016/d3timeline-plugins
```
📚 [官方插件仓库地址](https://github.com/ElvisWangTech/d3timeline-plugins.git)

### 使用示例
```typescript
import { type Locale, D3Timeline } from "@yiwei016/d3timeline";
import "@yiwei016/d3timeline/index.css";
import { ZoomSlider } from "@yiwei016/d3timeline-plugins";
import "@yiwei016/d3timeline-plugins/ZoomSlider.css";

// 指定时间轴容器
const container = document.getElementById(
  "project-timeline",
) as HTMLDivElement;
// 指定缩放滑块容器
const sliderContainer = document.getElementById(
  "project-zoom-slider",
) as HTMLDivElement;
// 创建缩放滑块插件实例
const zoomSliderPlugin = new ZoomSlider(sliderContainer, {
  range: [0.49, 0.52],
  sparks: [
    { id: "1", pos: [0.1], color: "#667eea" },
    {
      id: "2",
      pos: [0.49, 0.52],
      color: "#f093fb",
    },
    { id: "3", pos: [0.8], color: "#4facfe" },
  ],
  dateFormat: (date: Date) => {
    // YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
});
// 创建时间轴实例
const projectTimeline = new D3Timeline(container, {
  plugins: [zoomSliderPlugin],
});

// 添加时间线
projectTimeline.addTimeline('开发阶段', '#667eea', 'dev');

// 添加事件
projectTimeline.addEvent({
  title: '项目启动',
  startTime: new Date('2026-01-15'),
  color: '#667eea'
}, 'dev');

// 监听事件
projectTimeline.on('click', ({ data }) => {
  console.log('点击了:', data.title);
});
```

## API 文档
详见 [TypeDoc 生成的文档](https://elviswangtech.github.io/d3timeline-doc/)

## 本地安装

```bash
npm install
```

## 本地开发

### 构建生产版本
```bash
npm run build
```

### 生成文档
```bash
npm run doc
```


## 许可证
MIT
