import { SectionCard } from "./SectionCard"
import { Button } from "./Button"

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <SectionCard large eyebrow="Module Placeholder" title={title} description={description}>
        <div className="placeholder-page__actions">
          <Button variant="primary" onClick={() => {}}>
            后续实现
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            查看规划
          </Button>
        </div>
      </SectionCard>
    </section>
  )
}
