const quickActions = [
  { title: "新建进货单", description: "创建进货记录并增加库存" },
  { title: "新建出货单", description: "创建出货记录并触发库存校验" },
  { title: "新建报价单", description: "生成报价单，不影响库存" },
];

const summaryCards = [
  { label: "当前阶段", value: "Project Bootstrap", detail: "前端工程与全局样式已初始化" },
  { label: "目标架构", value: "React SPA", detail: "Vite + TypeScript + Router 骨架" },
  { label: "设计基调", value: "冷静 / 高效 / 精致", detail: "遵循 design.md 的浅色 B 端风格" },
];

const infoBlocks = [
  {
    title: "当前重点",
    items: ["搭建工程脚手架", "建立 App Shell", "沉淀全局 token 与布局基线"],
  },
  {
    title: "下一阶段",
    items: ["接入 Auth", "落地 Master Data", "开始单据系统页面骨架"],
  },
];

export function OverviewPage() {
  return (
    <div className="overview-page">
      <section className="hero-card">
        <div className="hero-card__content">
          <p className="section-eyebrow">Project Overview</p>
          <h2 className="section-title">Tradgio / 库存管理平台</h2>
          <p className="section-description">
            当前页面用于验证项目初始化结果。浏览器运行、路由骨架、全局样式 token 和基础布局已就位，
            后续可以直接在此基础上进入业务模块实现。
          </p>
        </div>
        <div className="hero-card__badge">
          <span className="status-dot" />
          可直接运行
        </div>
      </section>

      <section className="quick-grid">
        {quickActions.map((action) => (
          <article key={action.title} className="section-card section-card--interactive">
            <p className="section-card__eyebrow">Quick Action</p>
            <h3 className="section-card__title">{action.title}</h3>
            <p className="section-card__description">{action.description}</p>
            <button className="button button--secondary" type="button">
              即将接入
            </button>
          </article>
        ))}
      </section>

      <section className="summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="section-card">
            <p className="section-card__eyebrow">{card.label}</p>
            <h3 className="summary-value">{card.value}</h3>
            <p className="section-card__description">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="insight-grid">
        {infoBlocks.map((block) => (
          <article key={block.title} className="section-card">
            <h3 className="section-card__title">{block.title}</h3>
            <ul className="detail-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}

