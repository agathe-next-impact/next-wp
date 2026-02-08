import { Section, Container } from "@/components/craft";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
            <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-muted animate-pulse rounded-md"
                />
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 space-y-4 bg-accent/30"
              >
                <div className="h-48 bg-muted animate-pulse rounded-md" />
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
