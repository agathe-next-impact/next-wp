import { Section, Container } from "@/components/craft";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border rounded-lg p-4"
              >
                <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
