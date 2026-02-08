import {
  getCustomPostTypes,
  getContentTypeBySlug,
  getCPTNodeBySlug,
  getAllCPTSlugs,
} from "@/lib/wordpress";
import { generateContentMetadata, stripHtml } from "@/lib/metadata";
import { Section, Container, Article, Prose } from "@/components/craft";
import { DynamicFields } from "@/components/dynamic-fields";
import { contentNodeSchema, breadcrumbSchema } from "@/lib/schema";
import { sanitizeContent, stripHtmlTags } from "@/lib/sanitize";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  const types = await getCustomPostTypes();
  const allParams: { cpt: string; slug: string }[] = [];

  for (const ct of types) {
    const slugs = await getAllCPTSlugs(ct);
    for (const { slug } of slugs) {
      allParams.push({ cpt: ct.name, slug });
    }
  }

  return allParams;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cpt: string; slug: string }>;
}): Promise<Metadata> {
  const { cpt, slug } = await params;
  const cptInfo = await getContentTypeBySlug(cpt);

  if (!cptInfo) return {};

  const node = await getCPTNodeBySlug(cptInfo, slug);

  if (!node) return {};

  const title = node.title?.rendered || "";
  const description = node.excerpt?.rendered
    ? stripHtml(node.excerpt.rendered)
    : node.content?.rendered
      ? stripHtml(node.content.rendered).slice(0, 200) + "..."
      : "";

  return generateContentMetadata({
    title,
    description,
    slug: node.slug,
    basePath: cpt,
    seo: node.seo,
  });
}

export default async function CPTDetailPage({
  params,
}: {
  params: Promise<{ cpt: string; slug: string }>;
}) {
  const { cpt, slug } = await params;
  const cptInfo = await getContentTypeBySlug(cpt);

  if (!cptInfo) notFound();

  const node = await getCPTNodeBySlug(cptInfo, slug);

  if (!node) notFound();

  const featuredMedia = node._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  const author = node._embedded?.author?.[0];
  const date = node.date
    ? new Date(node.date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            contentNodeSchema(node, cpt),
            breadcrumbSchema([
              { name: "Home", href: "/" },
              { name: cptInfo.label, href: `/${cpt}` },
              { name: stripHtmlTags(node.title?.rendered || "") || node.slug, href: `/${cpt}/${node.slug}` },
            ]),
          ]),
        }}
      />
      <Section>
        <Container>
          <Prose>
            {node.title?.rendered && (
              <h1>{stripHtmlTags(node.title.rendered)}</h1>
          )}
          <div className="flex justify-between items-center gap-4 text-sm mb-4">
            {date && (
              <h5>
                Published {date}
                {author?.name && <span> by {author.name}</span>}
              </h5>
            )}
          </div>
          {featuredMedia?.source_url && (
            <div className="h-96 my-12 md:h-[500px] overflow-hidden flex items-center justify-center border rounded-lg bg-accent/25 relative">
              <Image
                className="w-full h-full object-cover"
                src={featuredMedia.source_url}
                alt={node.title?.rendered || ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          )}
        </Prose>

        {node.content?.rendered && (
          <Article
            dangerouslySetInnerHTML={{ __html: sanitizeContent(node.content.rendered) }}
          />
        )}

        <DynamicFields acf={node.acf} customTaxonomies={node.customTaxonomies} />
      </Container>
    </Section>
    </>
  );
}
