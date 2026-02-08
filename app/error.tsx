"use client";

import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Section>
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="mb-8 text-muted-foreground">
            We encountered an error loading this page.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Container>
    </Section>
  );
}
