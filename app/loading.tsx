import { Section, Container } from "@/components/craft";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-muted animate-pulse rounded" />
            <div className="h-5 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border h-48 bg-accent/50 rounded-lg p-4 flex flex-col justify-between"
              >
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                <div className="space-y-2">
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
