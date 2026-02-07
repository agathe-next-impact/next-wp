import { siteConfig } from "@/site.config";
import type { Metadata } from "next";
import type { SeoMetadata } from "./wordpress.d";

interface ContentMetadataOptions {
  title: string;
  description: string;
  slug: string;
  basePath: string;
  seo?: SeoMetadata;
}

export function generateContentMetadata({
  title,
  description,
  slug,
  basePath,
  seo,
}: ContentMetadataOptions): Metadata {
  const metaTitle = seo?.title || title;
  const metaDesc = seo?.metaDesc || description;
  const canonical =
    seo?.canonical || `${siteConfig.site_domain}/${basePath}/${slug}`;

  const ogTitle = seo?.opengraphTitle || metaTitle;
  const ogDesc = seo?.opengraphDescription || metaDesc;
  const ogUrl =
    seo?.opengraphUrl || `${siteConfig.site_domain}/${basePath}/${slug}`;

  const twitterTitle = seo?.twitterTitle || ogTitle;
  const twitterDesc = seo?.twitterDescription || ogDesc;

  // Image: prefer SEO image, fall back to generated OG image
  let ogImages: NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;
  let twitterImages: string[];

  if (seo?.opengraphImage?.sourceUrl) {
    ogImages = [
      {
        url: seo.opengraphImage.sourceUrl,
        width: seo.opengraphImage.width || 1200,
        height: seo.opengraphImage.height || 630,
        alt: seo.opengraphImage.altText || metaTitle,
      },
    ];
  } else {
    const ogImageUrl = new URL(`${siteConfig.site_domain}/api/og`);
    ogImageUrl.searchParams.append("title", metaTitle);
    ogImageUrl.searchParams.append("description", metaDesc);
    ogImages = [
      {
        url: ogImageUrl.toString(),
        width: 1200,
        height: 630,
        alt: metaTitle,
      },
    ];
  }

  if (seo?.twitterImage?.sourceUrl) {
    twitterImages = [seo.twitterImage.sourceUrl];
  } else if (seo?.opengraphImage?.sourceUrl) {
    twitterImages = [seo.opengraphImage.sourceUrl];
  } else {
    const ogImageUrl = new URL(`${siteConfig.site_domain}/api/og`);
    ogImageUrl.searchParams.append("title", metaTitle);
    ogImageUrl.searchParams.append("description", metaDesc);
    twitterImages = [ogImageUrl.toString()];
  }

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      type: "article",
      url: ogUrl,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle,
      description: twitterDesc,
      images: twitterImages,
    },
  };
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function truncateHtml(html: string, maxWords: number): string {
  const text = html.replace(/<[^>]*>/g, "").trim();
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
}
