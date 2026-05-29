type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <article className="section-card section-card--large">
        <p className="section-eyebrow">Module Placeholder</p>
        <h2 className="section-title">{title}</h2>
        <p className="section-description">{description}</p>
        <div className="placeholder-page__actions">
          <button className="button button--primary" type="button">
            后续实现
          </button>
          <button className="button button--secondary" type="button">
            查看规划
          </button>
        </div>
      </article>
    </section>
  );
}

