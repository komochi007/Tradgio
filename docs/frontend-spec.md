# Tradgio 前端落地规范

## 1. 文档目标

本文档用于将已确认的视觉稿和设计规范，转化为可直接指导前端开发的页面结构、组件体系、设计 token、状态规范和推荐工程组织方式。

本文档关注：
- 页面信息结构
- 组件拆分边界
- 视觉 token 落地方式
- 交互状态约定
- 前端实现一致性原则

本文档不包含：
- 具体业务接口定义
- 数据库设计
- 后端实现细节
- 最终技术栈强绑定代码

## 2. 落地原则

### 2.1 总体原则

- 视觉稿优先转译为稳定的页面结构，不直接追求像素级炫技实现
- 优先建立统一页面骨架和组件语义，再做局部样式细化
- 所有样式优先通过 token 驱动，不在业务页面写散乱常量
- 列表页、录单页、详情页共享同一套布局和控件语言
- 所有交互组件必须覆盖完整状态，不允许只做默认态

### 2.2 设计到实现的优先顺序

1. 全局 token
2. App Shell
3. 基础组件
4. 页面级通用区块
5. 业务页面模板
6. 页面内容装配

## 3. 页面体系与路由结构

## 3.1 页面范围

MVP 页面建议包含：

- 登录页
- 注册页
- 总览页
- 货品列表页
- 货品新建/编辑页
- 往来单位列表页
- 往来单位新建/编辑页
- 进货单列表页
- 进货单详情/编辑页
- 出货单列表页
- 出货单详情/编辑页
- 报价单列表页
- 报价单详情/编辑页
- 合同列表页
- 合同上传页
- 合同详情页
- 综合查询页

## 3.2 推荐路由

```text
/login
/register

/overview

/products
/products/new
/products/:id

/counterparties
/counterparties/new
/counterparties/:id

/purchases
/purchases/new
/purchases/:id

/sales
/sales/new
/sales/:id

/quotes
/quotes/new
/quotes/:id

/contracts
/contracts/new
/contracts/:id

/search
```

说明：
- `:id` 页面默认兼容查看和编辑模式
- 是否拆出 `/edit` 可在开发阶段根据实现风格决定，但视觉结构不变

## 4. App Shell 结构

## 4.1 全局结构

主应用采用固定左侧导航 + 右侧内容区结构。

推荐层级：

```text
AppShell
├── Sidebar
├── Main
│   ├── Topbar
│   └── PageContainer
```

## 4.2 Sidebar

承载内容：
- 品牌标识
- 一级导航
- 底部辅助入口

一级导航建议顺序：
- 总览
- 货品
- 往来单位
- 进货
- 出货
- 报价
- 合同
- 查询

底部辅助区建议：
- 当前账号信息
- 退出登录

实现原则：
- 宽度固定
- 选中态使用浅蓝底色 + 深色文字
- 不使用高饱和整条高亮
- 图标统一线性风格

## 4.3 Topbar

按页面类型承载不同信息。

可包含：
- 页面标题
- 页面描述
- 面包屑
- 搜索入口
- 页面级操作按钮

原则：
- 不是每页都必须完整显示所有元素
- 保持高度稳定
- 不堆叠过多功能

## 4.4 PageContainer

推荐结构：

```text
PageContainer
├── PageHeader
├── PageToolbar
├── PageBody
└── OptionalPageAside
```

说明：
- 列表页常用 `PageHeader + PageToolbar + PageBody`
- 表单页常用 `PageHeader + PageBody`
- 详情页可增加 `OptionalPageAside`

## 5. 页面模板规范

## 5.1 总览页模板

结构建议：

```text
OverviewPage
├── WelcomeBlock
├── QuickActionsBlock
├── SummaryGrid
├── RecentRecordsBlock
├── ReminderBlock
└── SecondaryBlocks
```

要求：
- 使用克制的 Bento 结构
- 卡片数不宜过多
- 重点体现“今天该做什么”和“最近发生了什么”

建议模块：
- 快捷新建
- 最近进货 / 出货 / 报价
- 当前库存概览
- 合同提醒
- 最近查询入口

## 5.2 列表页模板

适用于：
- 货品
- 往来单位
- 进货
- 出货
- 报价
- 合同

结构建议：

```text
ListPage
├── PageHeader
├── FilterToolbar
├── DataTableCard
└── PaginationArea
```

其中 `FilterToolbar` 可包含：
- 搜索框
- 标签筛选
- 状态筛选
- 日期筛选
- 主操作按钮

要求：
- 筛选区和表格区分层清晰
- 表头固定样式统一
- 单屏优先容纳有效数据

## 5.3 表单 / 录单页模板

适用于：
- 货品新建/编辑
- 往来单位新建/编辑
- 进货单详情/编辑
- 出货单详情/编辑
- 报价单详情/编辑
- 合同上传

结构建议：

```text
FormPage
├── PageHeader
├── MetaSection
├── MainFormSection
├── LineItemsSection
├── SummarySection
└── StickyActionBar
```

说明：
- 简单表单页可以没有 `LineItemsSection`
- 单据页必须有 `LineItemsSection`
- 行动按钮统一固定在右侧主内容区底部，作为独立操作栏展示
- 页面主体需要预留底部安全留白，避免表单内容被固定操作栏遮挡
- 新建页操作栏左侧显示草稿状态，默认“尚未保存草稿”，保存后显示“草稿已自动保存 HH:mm”
- 编辑页不显示“保存草稿”，仅保留取消和保存修改等正式操作
- 单据页操作栏保留合计金额，同时展示草稿状态；普通表单页左侧展示草稿状态

## 5.4 查询页模板

结构建议：

```text
SearchPage
├── PageHeader
├── SearchHero
├── SearchFilters
├── SearchResults
└── EmptyOrErrorState
```

要求：
- 搜索输入区是视觉焦点
- 结果列表支持类型标签
- 搜索前、搜索中、无结果、异常状态必须区分明确

## 5.5 登录 / 注册页模板

结构建议：

```text
AuthPage
├── AmbientBackground
├── AuthCard
│   ├── BrandBlock
│   ├── FormFields
│   ├── PrimaryAction
│   └── SecondaryLink
```

要求：
- 居中布局
- 背景使用抽象光感层次
- 不使用具象插画
- 登录页比注册页更克制

## 6. 组件体系

## 6.1 基础组件层

建议基础组件：

- `Button`
- `Input`
- `Textarea`
- `Select`
- `DatePicker`
- `Checkbox`
- `Radio`
- `Switch`
- `Tag`
- `Badge`
- `Tooltip`
- `Modal`
- `Drawer`
- `DropdownMenu`
- `Tabs`
- `Table`
- `Pagination`
- `EmptyState`
- `Skeleton`
- `Toast`

要求：
- 所有基础组件使用统一 token
- 所有组件需支持完整状态
- 组件不含业务语义

`Toast` 规范：
- 位于右侧主内容区顶部居中，不覆盖左侧导航
- 不遮挡页面右上操作按钮、表格操作列或固定底部操作栏
- 多条提示纵向堆叠，支持自动消失和手动关闭
- 成功、错误、警告、信息状态使用全局状态色

## 6.2 布局组件层

建议布局组件：

- `AppShell`
- `Sidebar`
- `Topbar`
- `PageContainer`
- `PageHeader`
- `PageToolbar`
- `SectionCard`
- `SummaryCard`
- `DetailPanel`
- `ActionBar`

## 6.3 业务组件层

建议按领域拆分：

- `ProductTable`
- `ProductForm`
- `CounterpartyTable`
- `CounterpartyForm`
- `PurchaseOrderTable`
- `PurchaseOrderForm`
- `SalesOrderTable`
- `SalesOrderForm`
- `QuoteTable`
- `QuoteForm`
- `ContractTable`
- `ContractForm`
- `GlobalSearchResultList`

原则：
- 业务组件只组合基础组件和布局组件
- 不在页面内直接堆大量原子控件

## 7. 设计 Token 落地规范

## 7.1 推荐 Token 分组

```text
color
bg
surface
text
border
state
radius
shadow
space
font
motion
zIndex
```

## 7.2 推荐命名方式

颜色 token 示例：

```text
color-primary
color-primary-hover
color-primary-active

bg-canvas
surface-base
surface-subtle

text-primary
text-secondary
text-tertiary

border-default
border-strong

state-success
state-warning
state-error
state-info
```

圆角 token 示例：

```text
radius-sm = 10px
radius-md = 14px
radius-lg = 20px
radius-xl = 24px
```

阴影 token 示例：

```text
shadow-sm
shadow-md
shadow-lg
```

间距 token 示例：

```text
space-1 = 4px
space-2 = 8px
space-3 = 12px
space-4 = 16px
space-5 = 20px
space-6 = 24px
space-8 = 32px
space-10 = 40px
space-12 = 48px
```

## 7.3 Token 使用约束

- 页面内不得直接写零散 hex 值
- 不得在同一项目中同时出现“语义 token”和“硬编码颜色”混用
- 同类组件必须复用相同 radius、shadow、font、space 体系

## 8. 交互状态规范

## 8.1 全局状态类型

每个交互组件必须覆盖：

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error

## 8.2 页面状态类型

每个页面必须明确：

- 初始状态
- 空状态
- 加载状态
- 错误状态
- 正常状态

## 8.3 列表页状态

列表页至少支持：

- 无数据空状态
- 搜索无结果状态
- 表格骨架屏
- 加载失败状态

## 8.4 表单页状态

表单页至少支持：

- 默认可编辑状态
- 提交中状态
- 字段错误状态
- 提交失败状态
- 提交成功反馈

## 8.5 单据页状态

单据页额外支持：

- 明细为空
- 自动带出字段成功
- 库存不足警告
- 导出处理中
- 导出失败

## 9. 关键组件实现规则

## 9.1 Button

要求：
- 支持 `primary / secondary / ghost`
- 支持 `small / default / large`
- 支持 `icon-left / icon-right / icon-only`
- 支持 `loading`

不允许：
- 每个页面单独做一套按钮视觉

## 9.2 Input / Select / DatePicker

要求：
- 高度统一
- 标签、帮助文本、错误提示结构一致
- 焦点态统一使用蓝色 focus ring

不允许：
- 不同页面出现不同高度输入框
- 占位文案代替字段标签

## 9.3 Table

表格必须统一：
- 表头高度
- 行高
- 单元格内边距
- 对齐规则
- 空状态结构

列对齐建议：
- 文本左对齐
- 金额右对齐
- 数量右对齐
- 状态居中或左对齐保持一致
- 操作列右对齐

## 9.4 单据明细表

单据类明细表是核心交互区。

必须满足：
- 可快速增加一行
- 可快速删除一行
- 自动带出规格、单位、默认价格
- 金额自动汇总
- 重点列对齐稳定
- 警告态清晰但不干扰其他行

## 9.5 EmptyState

空状态组件结构建议：

```text
EmptyState
├── OptionalIcon
├── Title
├── Description
└── PrimaryAction
```

要求：
- 文案业务化
- CTA 明确
- 风格简洁

## 10. 页面级实现清单

## 10.1 总览页

实现要点：
- 支持 Bento 风格模块布局
- 快捷操作优先露出
- 最近记录统一列表样式
- 关键摘要卡片不做“夸张 KPI 仪表盘”

## 10.2 货品页

实现要点：
- 搜索 + 新建按钮固定模式
- 表格展示库存和默认价格
- 停用状态可识别但不刺眼

## 10.3 往来单位页

实现要点：
- 客户 / 供应商类型切换稳定显眼
- 表格字段紧凑清楚

## 10.4 进货 / 出货 / 报价

实现要点：
- 列表页结构统一
- 新建 / 编辑页结构统一
- 仅在业务差异处改变字段和提示

## 10.5 合同页

实现要点：
- 上传动作显眼
- 附件列表层次清楚
- 搜索客户流程清楚

## 10.6 查询页

实现要点：
- 搜索框成为页面第一视觉入口
- 结果项支持类型标签和关键信息摘要
- 无结果页面要有指引

## 10.7 登录 / 注册

实现要点：
- 最大程度保持纯净
- 背景抽象而轻
- 卡片内部节奏比业务页更松

## 11. 推荐前端目录组织

以下为推荐结构，不强绑定具体框架：

```text
src/
  app/
    routes/
      login/
      register/
      overview/
      products/
      counterparties/
      purchases/
      sales/
      quotes/
      contracts/
      search/

  components/
    ui/
      button/
      input/
      select/
      table/
      tabs/
      modal/
      empty-state/
      skeleton/

    layout/
      app-shell/
      sidebar/
      topbar/
      page-header/
      page-toolbar/
      section-card/

    business/
      products/
      counterparties/
      purchases/
      sales/
      quotes/
      contracts/
      search/

  styles/
    tokens/
    themes/
    globals/

  lib/
    formatters/
    constants/
    utils/
```

## 12. 样式落地建议

## 12.1 优先级

建议样式来源顺序：

1. Design token
2. 基础组件样式
3. 布局组件样式
4. 页面局部样式

## 12.2 约束

- 页面文件中不直接堆大量样式常量
- 同类页面共享布局类名或共享布局组件
- 不因“赶进度”绕开基础组件体系

## 13. 验收标准

## 13.1 视觉一致性

- 所有页面使用统一 token 体系
- 所有按钮、输入框、表格样式统一
- 左侧导航与主内容区结构统一

## 13.2 可用性

- 列表页首屏具备可扫读性
- 录单页首屏能完成主要输入
- 错误提示就近出现
- 焦点态可见

## 13.3 可扩展性

- 新页面能复用既有模板
- 新业务模块能复用基础组件和布局组件
- 暗黑模式未来可通过 token 扩展

## 14. 建议的开发顺序

建议按以下顺序落地：

1. 全局 token 与全局样式
2. App Shell
3. Button / Input / Select / Table / Tag / EmptyState / Skeleton
4. 登录 / 注册页
5. 总览页
6. 货品页与往来单位页
7. 进货 / 出货 / 报价页
8. 合同页
9. 查询页

## 15. 最终结论

Tradgio 的前端实现不应从单页开始“凭感觉写界面”，而应先建立统一的视觉 token、页面骨架和组件层级，再装配业务页面。这样才能把当前确认的高级、克制、空灵的视觉方向稳定转成一套可持续扩展的产品前端体系。

## 16. 2026-06 优化方案

本节用于记录 2026-06-01 确认的第二阶段视觉与交互优化方案，作为后续开发任务的直接输入。

### 16.1 优化目标

- 把当前 MVP 的“文档骨架感”界面升级为更成熟的企业效率工具界面
- 收紧页面结构，减少重复页头与冗余说明文字
- 统一导航、图标、下拉框、搜索与导出入口的交互语言
- 在不破坏现有业务规则的前提下，增强录单效率与总览页的信息密度

### 16.2 已锁定的高层决策

- 只有总览页保留顶部欢迎卡片，其他页面改为紧凑页头
- 独立“查询”页与左侧“查询”导航彻底移除，跨模块搜索并入总览页卡片
- 总览页天气信息固定显示广东省东莞市，不请求浏览器定位权限
- 货品新增字段 `产品类型`，先做自由输入
- 单据里的“货品”字段改为可搜索下拉，不保留原生 `select`
- 导出按钮加在进货 / 出货 / 报价列表页的每行单据操作列
- 品牌 Logo 采用“圆角六边形 T 标 + 立体货箱”方案
- 导航图标、快捷入口图标与通用操作图标统一采用 `lucide-react`
- 左侧底部帐号卡片采用“用户名 + 退出按钮”
- 总览页欢迎语采用更生活化的英文表达

### 16.3 视觉与布局优化清单

#### App Shell

- 重新设计品牌图标，替换当前侧边栏左上角 `T`，最终采用“圆角六边形 T 标 + 立体货箱”方案
- 左侧导航改为“图标 + 标题”，移除每个模块下方的说明文字
- 左侧导航选中态改为：
  - 无边框
  - 主蓝色背景
  - 白色文字
- 顶部区域移除当前账号展示与退出登录
- 退出登录迁移到左侧导航底部帐号卡片中

#### 顶部页头

- 总览页保留欢迎卡片，但重写内容为：
  - 英文欢迎语
  - 日期信息
  - 天气信息
- 除总览页外，其他列表页、表单页、详情页移除当前顶部大卡片

#### 总览页

- 快捷入口图标移除卡通 emoji，改为统一 Lucide 线性图标
- “库存概览”与右侧“最近单据”卡片在视觉尺寸上保持一致
- 新增总览页内联跨模块搜索卡片
- 搜索结果直接在总览页内联展示，不再跳转独立查询页

### 16.4 表单与交互优化清单

#### 下拉框

- 所有表单下拉框统一为圆角、白底风格
- 选中项统一为圆角、浅灰底风格
- 该规则适用于普通表单下拉、筛选下拉以及导出格式下拉

#### 搜索

- 所有涉及搜索的页面在输入框右侧新增“搜索”按钮
- 只有点击“搜索”后才执行搜索，不再输入即过滤
- 合同列表页移除“全部客户”筛选组件

#### 录单货品选择

- 在进货、出货、报价的录单明细中，“货品”字段支持手动输入
- 输入后即时搜索匹配货品
- 搜索结果以可点击的下拉列表呈现
- 选择结果后继续回填规格、单位、默认价格等现有联动字段

### 16.5 业务与数据优化清单

- 货品新增字段：`产品类型`
- 新建 / 编辑货品时，单位选项收敛为：
  - 个
  - 件
  - 箱
  - 卷
  - 码
- 单据编号生成规则调整为月份后两位流水号 `01-99`
- 合同编号沿用现有前缀结构，但流水位数同步改为两位

### 16.6 导出入口优化清单

- 在进货 / 出货 / 报价列表页中，每条单据的操作列新增“导出”按钮
- 点击后弹出导出格式下拉选项
- 下拉样式要求：
  - 容器为圆角白底
  - 选项为圆角浅灰底
- 导出逻辑仍复用现有 `Export Service`

### 16.7 实施顺序

建议按以下顺序落地：

1. App Shell 与导航重构
2. 总览页欢迎卡片、搜索卡片与 Bento 区调整
3. 下拉框、搜索按钮、可搜索货品选择组件
4. 货品字段与单据编号规则调整
5. 列表行导出入口补齐与整体回归

## 17. 本地数据、备份与 PWA 交互规范

### 17.1 数据与备份设置页

- 展示应用版本、IndexedDB schema 版本、正式 Origin、存储使用量和上次成功备份时间。
- 主操作为“导出加密备份”，次操作为“恢复备份”。
- 备份密码输入与确认必须在导出时完成，并明确提示密码不保存、忘记后无法恢复。
- 恢复前展示账号数、各类记录数、附件数量、总容量、备份时间和将被替换的数据范围。
- 整机替换必须二次确认，不提供默认静默合并。

### 17.2 存储健康

- 正常状态显示中性容量信息。
- 使用率达到 70% 使用警告色，并持续提示备份和清理。
- 使用率达到 85% 使用错误状态，禁用附件及大体积写入入口。
- 单文件超过 20 MB 时在选择后立即提示，不进入保存流程。
- Storage API 不可用时显示“无法读取浏览器容量”，但仍执行单文件限制。

### 17.3 更新提示

- Service Worker 检测到新版本后使用非阻断提示，不覆盖表单操作区。
- 页面存在未保存内容时禁止自动刷新。
- 普通更新提供“稍后”和“重新启动更新”。
- schema 变化或高风险更新提供“先备份并更新”，备份未成功前不进入升级。
- 迁移失败页必须显示当前应用版本、数据版本、错误摘要和恢复入口，禁止继续写入。

### 17.4 Windows 正式使用约束

- 正式支持 Windows 最新稳定版 Chrome 和 Edge。
- 首次使用引导安装 PWA，并提示不要使用无痕模式或清理站点数据。
- 正式域名固定后，不在 UI 中引导用户切换到其他预览域名。
- 离线状态需明确展示，但已缓存的录单、查询、合同和导出功能应继续可用。
