# Conference Deadlines Plugin for Obsidian
> [!info] All content in this Readme is auto-generated from Claude AI. 

这是一个用于 Obsidian 的插件，可以显示来自 CCF DDL 的计算机科学会议投稿截止时间。

## 功能特性

- 🕒 **实时截止时间显示**：从 CCF DDL 获取最新的会议投稿截止时间
- 📊 **分类筛选**：按学科领域（AI、DB、NW等）和CCF等级筛选会议
- ⏰ **时间提醒**：用颜色标识紧急程度（红色=今天，橙色=一周内，绿色=安全）
- 🔄 **自动刷新**：可配置的数据刷新间隔
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🌙 **主题适配**：支持 Obsidian 的明暗主题

## 安装方法

### 手动安装

1. 下载或克隆这个仓库
2. 将插件文件夹复制到你的 Obsidian vault 的 `.obsidian/plugins/` 目录下
3. 重启 Obsidian
4. 在设置中启用 "Conference Deadlines" 插件

### 开发安装

1. 克隆仓库到 `.obsidian/plugins/conference-deadlines/`
2. 安装依赖：`npm install`
3. 构建插件：`npm run build`
4. 重启 Obsidian 并启用插件

## 使用方法

### 基本使用

1. 点击左侧 ribbon 栏的日历时钟图标
2. 或使用命令面板搜索 "Show Conference Deadlines"
3. 在弹出的模态框中查看所有会议的截止时间

### 筛选功能

- **按学科筛选**：选择特定的学科领域（如 AI、DB、NW 等）
- **按CCF等级筛选**：选择 A、B、C 类会议或查看全部

### 信息显示

模态框表格包含以下列：

- **Conference**：会议名称（可点击跳转到官网）
- **Year**：会议年份
- **Deadline**：投稿截止时间（包含摘要截止时间）
- **Time Left**：剩余时间（颜色编码）
- **Subject**：学科分类
- **CCF**：CCF 等级（A/B/C，带颜色标识）
- **Location**：会议地点

### 时间颜色编码

- 🔴 **红色加粗**：今天截止
- 🟠 **橙色加粗**：7天内截止
- 🟡 **黄色**：30天内截止
- 🟢 **绿色**：30天以上
- ⚫ **灰色**：已过期

## 配置选项

在 Obsidian 设置页面的插件设置中可以配置：

- **YAML URL**：数据源地址（默认使用 CCF DDL）
- **Refresh Interval**：数据刷新间隔（分钟）

## 数据来源

插件默认使用 [CCF DDL](https://ccfddl.com/) 的数据源：
`https://ccfddl.com/conference/allconf.yml`

## 开发

### 项目结构

```
conference-deadlines/
├── main.ts              # 主插件文件
├── manifest.json        # 插件清单
├── styles.css          # 样式文件
├── package.json        # NPM 配置
├── tsconfig.json       # TypeScript 配置
├── esbuild.config.mjs  # 构建配置
└
