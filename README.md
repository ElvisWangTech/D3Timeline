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
- 🛠️ **自定义插件** - 支持 自定义插件，内置常用的的插件（minimap, cursorline, viewsync）

## 效果
<img width="2091" height="678" alt="image" src="https://github.com/user-attachments/assets/f6a9ad64-1e1b-4cb5-b2e4-4ca3b22b2b65" />
<img width="2067" height="662" alt="image" src="https://github.com/user-attachments/assets/d8dba78b-bc11-49a8-9ab7-c7304672f2d8" />


## 安装

```bash
npm install
```

## 开发

#### 启动开发服务器
```bash
npm run example
```

#### 构建生产版本
```bash
npm run build
```

#### 生成文档
```bash
npm run doc
```

## 快速开始
```typescript
import D3Timeline from 'd3timeline';

// 创建实例
const timeline = new D3Timeline(container);

// 添加时间线
timeline.addTimeline('开发阶段', '#667eea', 'dev');

// 添加事件
timeline.addEvent({
  title: '项目启动',
  startTime: new Date('2026-01-15'),
  color: '#667eea'
}, 'dev');

// 监听事件
timeline.on('click', ({ data }) => {
  console.log('点击了:', data.title);
});
```

## API 文档
详见 TypeDoc 生成的文档

## 许可证
MIT
