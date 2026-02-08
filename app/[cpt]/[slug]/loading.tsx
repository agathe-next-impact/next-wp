import { Section, Container } from "@/components/craft";

export default function Loading() {
  return (
    <Section>
      <Container>
        <div className="space-y-6 max-w-prose">
          <div className="h-10 w-3/4 bg-muted animate-pulse rounded" />
          <div className="flex justify-between items-center gap-4">
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-96 md:h-[500px] bg-muted animate-pulse rounded-lg" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-4/6 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </Container>
    </Section>
  );
}
