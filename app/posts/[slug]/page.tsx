import { getPostBySlug, getAllPostSlugs } from "@/lib/wordpress";
import { generateContentMetadata, stripHtml } from "@/lib/metadata";

import { Section, Container, Article, Prose } from "@/components/craft";
import { DynamicFields } from "@/components/dynamic-fields";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { articleSchema, breadcrumbSchema } from "@/lib/schema";
import { sanitizeContent, stripHtmlTags } from "@/lib/sanitize";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return await getAllPostSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const description = post.excerpt?.rendered
    ? stripHtml(post.excerpt.rendered)
    : post.content?.rendered
      ? stripHtml(post.content.rendered).slice(0, 200) + "..."
      : "";

  return generateContentMetadata({
    title: post.title?.rendered || "",
    description,
    slug: post.slug,
    basePath: "posts",
    seo: post.seo,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  const author = post._embedded?.author?.[0];
  const category = post._embedded?.["wp:term"]?.[0]?.[0];
  const date = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleSchema(post),
            breadcrumbSchema([
              { name: "Home", href: "/" },
              { name: "Posts", href: "/posts" },
              { name: stripHtmlTags(post.title?.rendered || "") || post.slug, href: `/posts/${post.slug}` },
            ]),
          ]),
        }}
      />
      <Section>
        <Container>
          <Prose>
            <h1>{stripHtmlTags(post.title?.rendered || "")}</h1>
          <div className="flex justify-between items-center gap-4 text-sm mb-4">
            <h5>
              Published {date} by{" "}
              {author?.name && (
                <span>
                  <a href={`/posts/?author=${author.id}`}>{author.name}</a>{" "}
                </span>
              )}
            </h5>

            {category && (
              <Link
                href={`/posts/?category=${category.id}`}
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  "no-underline!"
                )}
              >
                {category.name}
              </Link>
            )}
          </div>
          {featuredMedia?.source_url && (
            <div className="h-96 my-12 md:h-[500px] overflow-hidden flex items-center justify-center border rounded-lg bg-accent/25 relative">
              <Image
                className="w-full h-full object-cover"
                src={featuredMedia.source_url}
                alt={post.title?.rendered || ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          )}
        </Prose>

        <Article dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content?.rendered || "") }} />

        <DynamicFields acf={post.acf} customTaxonomies={post.customTaxonomies} />
      </Container>
    </Section>
    </>
  );
}
