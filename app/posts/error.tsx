"use client";

import { Section, Container } from "@/components/craft";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
          <h1 className="text-4xl font-bold mb-4">Error loading posts</h1>
          <p className="mb-8 text-muted-foreground">
            We couldn&apos;t load the blog content. Please try again.
          </p>
          <div className="flex gap-4">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
