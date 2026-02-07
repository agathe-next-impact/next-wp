import { MetadataRoute } from "next";
import {
  getAllPostsForSitemap,
  getCustomPostTypes,
  getAllCPTSlugs,
  getACFOptionsPages,
} from "@/lib/wordpress";
import { siteConfig } from "@/site.config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, cptTypes, optionsPages] = await Promise.all([
    getAllPostsForSitemap(),
    getCustomPostTypes(),
    getACFOptionsPages(),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${siteConfig.site_domain}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${siteConfig.site_domain}/posts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.site_domain}/pages`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.site_domain}/posts/authors`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.site_domain}/posts/categories`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.site_domain}/posts/tags`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.site_domain}/posts/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const cptUrls: MetadataRoute.Sitemap = [];

  for (const ct of cptTypes) {
    cptUrls.push({
      url: `${siteConfig.site_domain}/${ct.name}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });

    const slugs = await getAllCPTSlugs(ct);
    for (const { slug } of slugs) {
      cptUrls.push({
        url: `${siteConfig.site_domain}/${ct.name}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  const optionsUrls: MetadataRoute.Sitemap = optionsPages.map((page) => ({
    url: `${siteConfig.site_domain}/options/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.3,
  }));

  if (optionsPages.length > 0) {
    optionsUrls.unshift({
      url: `${siteConfig.site_domain}/options`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    });
  }

  return [...staticUrls, ...postUrls, ...cptUrls, ...optionsUrls];
}
