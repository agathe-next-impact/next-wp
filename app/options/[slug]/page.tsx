import {
  getACFOptionsPages,
  getACFOptionsPageBySlug,
} from "@/lib/wordpress";
import { generateContentMetadata } from "@/lib/metadata";
import { Section, Container, Prose } from "@/components/craft";
import { DynamicFields } from "@/components/dynamic-fields";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const pages = await getACFOptionsPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getACFOptionsPageBySlug(slug);

  if (!page) return {};

  return generateContentMetadata({
    title: page.page_title || page.menu_title || slug,
    description: page.description || `Options page: ${page.page_title}`,
    slug: page.slug,
    basePath: "options",
  });
}

export default async function OptionsPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getACFOptionsPageBySlug(slug);

  if (!page) notFound();

  const hasContent = page.acf && Object.keys(page.acf).length > 0;

  return (
    <Section>
      <Container>
        <Prose>
          <h1>{page.page_title || page.menu_title}</h1>
          {page.description && (
            <p className="text-muted-foreground">{page.description}</p>
          )}
        </Prose>

        {hasContent ? (
          <DynamicFields acf={page.acf} />
        ) : (
          <div className="mt-8 h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
            <p className="text-muted-foreground">
              No fields configured for this options page
            </p>
          </div>
        )}
      </Container>
    </Section>
  );
}
