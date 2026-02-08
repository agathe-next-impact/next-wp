import { siteConfig } from "@/site.config";
import type { Post, ContentNode } from "./wordpress.d";
import { stripHtmlTags } from "./sanitize";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.site_name,
    url: siteConfig.site_domain,
    logo: `${siteConfig.site_domain}/logo.svg`,
    description: siteConfig.site_description,
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.site_name,
    url: siteConfig.site_domain,
    description: siteConfig.site_description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.site_domain}/posts?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(post: Post) {
  const author = post._embedded?.author?.[0];
  const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: stripHtmlTags(post.title?.rendered || ""),
    description: post.excerpt?.rendered
      ? stripHtmlTags(post.excerpt.rendered).slice(0, 200)
      : undefined,
    url: `${siteConfig.site_domain}/posts/${post.slug}`,
    datePublished: post.date,
    dateModified: post.modified,
    ...(featuredMedia?.source_url && {
      image: {
        "@type": "ImageObject",
        url: featuredMedia.source_url,
      },
    }),
    author: author
      ? {
          "@type": "Person",
          name: author.name,
          url: `${siteConfig.site_domain}/posts?author=${author.id}`,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      url: siteConfig.site_domain,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.site_domain}/posts/${post.slug}`,
    },
  };
}

export function contentNodeSchema(node: ContentNode, basePath: string) {
  const author = node._embedded?.author?.[0];
  const featuredMedia = node._embedded?.["wp:featuredmedia"]?.[0];

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: stripHtmlTags(node.title?.rendered || ""),
    description: node.excerpt?.rendered
      ? stripHtmlTags(node.excerpt.rendered).slice(0, 200)
      : undefined,
    url: `${siteConfig.site_domain}/${basePath}/${node.slug}`,
    ...(node.date && { datePublished: node.date }),
    ...(node.modified && { dateModified: node.modified }),
    ...(featuredMedia?.source_url && {
      image: {
        "@type": "ImageObject",
        url: featuredMedia.source_url,
      },
    }),
    ...(author && {
      author: {
        "@type": "Person",
        name: author.name,
      },
    }),
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      url: siteConfig.site_domain,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.site_domain}/${basePath}/${node.slug}`,
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; href: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.site_domain}${item.href}`,
    })),
  };
}
