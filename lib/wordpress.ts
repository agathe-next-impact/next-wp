// Description: WordPress API functions
// Uses WPGraphQL plugin to fetch data from WordPress
// Types are imported from `wordpress.d.ts`

import { cache } from "react";

import type {
  Post,
  Category,
  Tag,
  Page,
  Author,
  FeaturedMedia,
  ContentTypeInfo,
  ContentNode,
  CustomTaxonomyData,
  ACFOptionsPageInfo,
  ACFOptionsPageData,
  SeoMetadata,
} from "./wordpress.d";

// Single source of truth for WordPress configuration
const baseUrl = process.env.WORDPRESS_URL?.replace(/\/+$/, "");
const isConfigured = Boolean(baseUrl);

if (!isConfigured) {
  console.warn(
    "WORDPRESS_URL environment variable is not defined - WordPress features will be unavailable"
  );
}

class WordPressAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "WordPressAPIError";
  }
}

// Pagination types
export interface WordPressPaginationHeaders {
  total: number;
  totalPages: number;
}

export interface WordPressResponse<T> {
  data: T;
  headers: WordPressPaginationHeaders;
}

const USER_AGENT = "Next.js WordPress Client";
const CACHE_TTL = 3600; // 1 hour

// ============================================================================
// GraphQL Client
// ============================================================================

async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  if (!baseUrl) {
    throw new Error("WordPress URL not configured");
  }

  const url = `${baseUrl}/graphql`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ query, variables }),
    next: { tags, revalidate: CACHE_TTL },
  });

  if (!response.ok) {
    throw new WordPressAPIError(
      `WPGraphQL request failed: ${response.statusText}`,
      response.status,
      url
    );
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new WordPressAPIError(
      `WPGraphQL errors: ${json.errors.map((e: { message: string }) => e.message).join(", ")}`,
      200,
      url
    );
  }

  return json.data as T;
}

async function graphqlFetchGraceful<T>(
  query: string,
  fallback: T,
  variables?: Record<string, unknown>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  if (!isConfigured) return fallback;

  try {
    return await graphqlFetch<T>(query, variables, tags);
  } catch (error) {
    console.warn("WPGraphQL fetch failed:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

// ============================================================================
// Pagination Helpers
// ============================================================================

function pageNumberToCursor(page: number, perPage: number): string | null {
  if (page <= 1) return null;
  const offset = (page - 1) * perPage;
  return Buffer.from(`arrayconnection:${offset - 1}`).toString("base64");
}

// ============================================================================
// GraphQL Queries
// ============================================================================

const SEO_FIELDS = `
  seo {
    title
    metaDesc
    canonical
    opengraphTitle
    opengraphDescription
    opengraphUrl
    opengraphImage {
      sourceUrl
      width
      height
      altText
    }
    twitterTitle
    twitterDescription
    twitterImage {
      sourceUrl
      width
      height
      altText
    }
  }
`;

const POST_FIELDS = `
  databaseId
  slug
  date
  dateGmt
  modified
  modifiedGmt
  status
  link
  title
  content
  excerpt
  commentStatus
  pingStatus
  isSticky
  author {
    node {
      databaseId
      name
      slug
      url
      description
      avatar {
        url
      }
    }
  }
  featuredImage {
    node {
      databaseId
      sourceUrl
      altText
      title
      caption
      mimeType
      mediaDetails {
        width
        height
        file
        sizes {
          name
          sourceUrl
          width
          height
          mimeType
          file
        }
      }
    }
  }
  categories {
    nodes {
      databaseId
      name
      slug
      description
      count
      parentDatabaseId
    }
  }
  tags {
    nodes {
      databaseId
      name
      slug
      description
      count
    }
  }
  ${SEO_FIELDS}
`;

const POSTS_QUERY = `
  query GetPosts($first: Int!, $after: String, $where: RootQueryToPostConnectionWhereArgs) {
    posts(first: $first, after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ${POST_FIELDS}
      }
    }
  }
`;

// Count query: fetches only IDs to determine total count
// (pageInfo.total not available on WPGraphQL < 1.6)
const POSTS_COUNT_QUERY = `
  query GetPostsCount($where: RootQueryToPostConnectionWhereArgs) {
    posts(first: 10000, where: $where) {
      nodes {
        databaseId
      }
    }
  }
`;

const POST_BY_SLUG_QUERY = `
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${POST_FIELDS}
    }
  }
`;

const POST_BY_ID_QUERY = `
  query GetPostById($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      ${POST_FIELDS}
    }
  }
`;

const ALL_POST_SLUGS_QUERY = `
  query GetAllPostSlugs($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        slug
      }
    }
  }
`;

const ALL_POSTS_SITEMAP_QUERY = `
  query GetAllPostsSitemap($first: Int!, $after: String) {
    posts(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        slug
        modified
      }
    }
  }
`;

const CATEGORIES_QUERY = `
  query GetCategories($first: Int!, $where: RootQueryToCategoryConnectionWhereArgs) {
    categories(first: $first, where: $where) {
      nodes {
        databaseId
        name
        slug
        description
        count
        link
        parentDatabaseId
      }
    }
  }
`;

const CATEGORY_BY_ID_QUERY = `
  query GetCategoryById($id: ID!) {
    category(id: $id, idType: DATABASE_ID) {
      databaseId
      name
      slug
      description
      count
      link
      parentDatabaseId
    }
  }
`;

const CATEGORY_BY_SLUG_QUERY = `
  query GetCategoryBySlug($slug: ID!) {
    category(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      count
      link
      parentDatabaseId
    }
  }
`;

const TAGS_QUERY = `
  query GetTags($first: Int!, $where: RootQueryToTagConnectionWhereArgs) {
    tags(first: $first, where: $where) {
      nodes {
        databaseId
        name
        slug
        description
        count
        link
      }
    }
  }
`;

const TAG_BY_ID_QUERY = `
  query GetTagById($id: ID!) {
    tag(id: $id, idType: DATABASE_ID) {
      databaseId
      name
      slug
      description
      count
      link
    }
  }
`;

const TAG_BY_SLUG_QUERY = `
  query GetTagBySlug($slug: ID!) {
    tag(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      count
      link
    }
  }
`;

const TAGS_BY_POST_QUERY = `
  query GetTagsByPost($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      tags {
        nodes {
          databaseId
          name
          slug
          description
          count
          link
        }
      }
    }
  }
`;

const PAGES_QUERY = `
  query GetPages($first: Int!) {
    pages(first: $first) {
      nodes {
        databaseId
        slug
        date
        dateGmt
        modified
        modifiedGmt
        status
        link
        title
        content
        menuOrder
        parentDatabaseId
        commentStatus
        author {
          node {
            databaseId
          }
        }
        featuredImage {
          node {
            databaseId
          }
        }
      }
    }
  }
`;

const PAGE_BY_SLUG_QUERY = `
  query GetPageBySlug($slug: ID!) {
    page(id: $slug, idType: URI) {
      databaseId
      slug
      date
      dateGmt
      modified
      modifiedGmt
      status
      link
      title
      content
      menuOrder
      parentDatabaseId
      commentStatus
      author {
        node {
          databaseId
        }
      }
      featuredImage {
        node {
          databaseId
        }
      }
      ${SEO_FIELDS}
    }
  }
`;

const PAGE_BY_ID_QUERY = `
  query GetPageById($id: ID!) {
    page(id: $id, idType: DATABASE_ID) {
      databaseId
      slug
      date
      dateGmt
      modified
      modifiedGmt
      status
      link
      title
      content
      menuOrder
      parentDatabaseId
      commentStatus
      author {
        node {
          databaseId
        }
      }
      featuredImage {
        node {
          databaseId
        }
      }
      ${SEO_FIELDS}
    }
  }
`;

const AUTHORS_QUERY = `
  query GetAuthors($first: Int!, $where: RootQueryToUserConnectionWhereArgs) {
    users(first: $first, where: $where) {
      nodes {
        databaseId
        name
        slug
        url
        description
        link: url
        avatar {
          url
        }
      }
    }
  }
`;

const AUTHOR_BY_ID_QUERY = `
  query GetAuthorById($id: ID!) {
    user(id: $id, idType: DATABASE_ID) {
      databaseId
      name
      slug
      url
      description
      link: url
      avatar {
        url
      }
    }
  }
`;

const AUTHOR_BY_SLUG_QUERY = `
  query GetAuthorBySlug($slug: ID!) {
    user(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      url
      description
      link: url
      avatar {
        url
      }
    }
  }
`;

const MEDIA_BY_ID_QUERY = `
  query GetMediaById($id: ID!) {
    mediaItem(id: $id, idType: DATABASE_ID) {
      databaseId
      sourceUrl
      altText
      title
      caption
      mimeType
      mediaDetails {
        width
        height
        file
        sizes {
          name
          sourceUrl
          width
          height
          mimeType
          file
        }
      }
    }
  }
`;

// ============================================================================
// Response Transformers
// ============================================================================

// Transformer functions use `any` for raw GraphQL response nodes
function transformSeo(seo: any): SeoMetadata | undefined {
  if (!seo) return undefined;
  return {
    title: seo.title || "",
    metaDesc: seo.metaDesc || "",
    canonical: seo.canonical || "",
    opengraphTitle: seo.opengraphTitle || "",
    opengraphDescription: seo.opengraphDescription || "",
    opengraphUrl: seo.opengraphUrl || "",
    opengraphImage: seo.opengraphImage
      ? {
          sourceUrl: seo.opengraphImage.sourceUrl || "",
          width: seo.opengraphImage.width || 0,
          height: seo.opengraphImage.height || 0,
          altText: seo.opengraphImage.altText || "",
        }
      : undefined,
    twitterTitle: seo.twitterTitle || "",
    twitterDescription: seo.twitterDescription || "",
    twitterImage: seo.twitterImage
      ? {
          sourceUrl: seo.twitterImage.sourceUrl || "",
          width: seo.twitterImage.width || 0,
          height: seo.twitterImage.height || 0,
          altText: seo.twitterImage.altText || "",
        }
      : undefined,
  };
}

function transformPost(node: any): Post {
  const featuredMedia = node.featuredImage?.node;
  const categories = node.categories?.nodes || [];
  const tags = node.tags?.nodes || [];
  const author = node.author?.node;

  return {
    id: node.databaseId || 0,
    date: node.date || "",
    date_gmt: node.dateGmt || node.date || "",
    modified: node.modified || "",
    modified_gmt: node.modifiedGmt || node.modified || "",
    slug: node.slug || "",
    status: (node.status?.toLowerCase() || "publish") as Post["status"],
    link: node.link || "",
    guid: { rendered: node.link || "" },
    title: { rendered: node.title || "" },
    content: { rendered: node.content || "", protected: false },
    excerpt: node.excerpt
      ? { rendered: node.excerpt, protected: false }
      : undefined,
    author: author?.databaseId || 0,
    featured_media: featuredMedia?.databaseId || 0,
    comment_status: (node.commentStatus?.toLowerCase() || "closed") as "open" | "closed",
    ping_status: (node.pingStatus?.toLowerCase() || "closed") as "open" | "closed",
    sticky: node.isSticky || false,
    template: "",
    format: "standard",
    categories: categories
      .map((c: any) => c?.databaseId)
      .filter((id: number | undefined) => id != null),
    tags: tags
      .map((t: any) => t?.databaseId)
      .filter((id: number | undefined) => id != null),
    meta: {},
    _embedded: {
      author: author
        ? [
            {
              id: author.databaseId || 0,
              name: author.name || "",
              slug: author.slug || "",
              avatar_urls: author.avatar?.url
                ? { "96": author.avatar.url }
                : {},
            },
          ]
        : undefined,
      "wp:featuredmedia": featuredMedia
        ? [transformFeaturedMedia(featuredMedia)]
        : undefined,
      "wp:term": [
        categories.map((c: any) => ({
          id: c?.databaseId || 0,
          name: c?.name || "",
          slug: c?.slug || "",
        })),
      ],
    },
    seo: transformSeo(node.seo),
  };
}

function transformFeaturedMedia(node: any): FeaturedMedia {
  const sizes: Record<string, any> = {};
  if (node.mediaDetails?.sizes) {
    for (const s of node.mediaDetails.sizes) {
      if (!s) continue;
      sizes[s.name || "unknown"] = {
        file: s.file || "",
        width: parseInt(s.width) || 0,
        height: parseInt(s.height) || 0,
        mime_type: s.mimeType || "",
        source_url: s.sourceUrl || "",
      };
    }
  }

  return {
    id: node.databaseId || 0,
    date: "",
    date_gmt: "",
    modified: "",
    modified_gmt: "",
    slug: "",
    status: "publish",
    link: "",
    guid: { rendered: node.sourceUrl || "" },
    title: { rendered: node.title || "" },
    author: 0,
    caption: { rendered: node.caption || "" },
    alt_text: node.altText || "",
    media_type: "image",
    mime_type: node.mimeType || "image/jpeg",
    media_details: {
      width: node.mediaDetails?.width || 0,
      height: node.mediaDetails?.height || 0,
      file: node.mediaDetails?.file || "",
      sizes,
    },
    source_url: node.sourceUrl || "",
  };
}

function transformCategory(node: any): Category {
  return {
    id: node.databaseId || 0,
    count: node.count || 0,
    description: node.description || "",
    link: node.link || "",
    name: node.name || "",
    slug: node.slug || "",
    meta: {},
    taxonomy: "category",
    parent: node.parentDatabaseId || 0,
  };
}

function transformTag(node: any): Tag {
  return {
    id: node.databaseId || 0,
    count: node.count || 0,
    description: node.description || "",
    link: node.link || "",
    name: node.name || "",
    slug: node.slug || "",
    meta: {},
    taxonomy: "post_tag",
  };
}

function transformAuthor(node: any): Author {
  return {
    id: node.databaseId || 0,
    name: node.name || "",
    url: node.url || "",
    description: node.description || "",
    link: node.link || node.url || "",
    slug: node.slug || "",
    avatar_urls: node.avatar?.url ? { "96": node.avatar.url } : {},
    meta: {},
  };
}

function transformPage(node: any): Page {
  return {
    id: node.databaseId || 0,
    date: node.date || "",
    date_gmt: node.dateGmt || node.date || "",
    modified: node.modified || "",
    modified_gmt: node.modifiedGmt || node.modified || "",
    slug: node.slug || "",
    status: (node.status?.toLowerCase() || "publish") as Page["status"],
    link: node.link || "",
    guid: { rendered: node.link || "" },
    title: { rendered: node.title || "" },
    content: { rendered: node.content || "", protected: false },
    excerpt: node.excerpt ? { rendered: node.excerpt, protected: false } : undefined,
    author: node.author?.node?.databaseId || 0,
    featured_media: node.featuredImage?.node?.databaseId || 0,
    parent: node.parentDatabaseId || 0,
    menu_order: node.menuOrder || 0,
    comment_status: (node.commentStatus?.toLowerCase() || "closed") as "open" | "closed",
    ping_status: (node.pingStatus?.toLowerCase() || "closed") as "open" | "closed",
    template: "",
    meta: {},
    seo: transformSeo(node.seo),
  };
}


// ============================================================================
// Exported Functions — Posts
// ============================================================================

export async function getPostsPaginated(
  page: number = 1,
  perPage: number = 9,
  filterParams?: {
    author?: string;
    tag?: string;
    category?: string;
    search?: string;
  }
): Promise<WordPressResponse<Post[]>> {
  const cursor = pageNumberToCursor(page, perPage);
  const where: Record<string, unknown> = {};

  const cacheTags = ["wordpress", "posts", `posts-page-${page}`];

  if (filterParams?.search) {
    where.search = filterParams.search;
    cacheTags.push("posts-search");
  }
  if (filterParams?.author) {
    where.author = parseInt(filterParams.author);
    cacheTags.push(`posts-author-${filterParams.author}`);
  }
  if (filterParams?.tag) {
    where.tagId = filterParams.tag;
    cacheTags.push(`posts-tag-${filterParams.tag}`);
  }
  if (filterParams?.category) {
    where.categoryId = filterParams.category;
    cacheTags.push(`posts-category-${filterParams.category}`);
  }

  const emptyResponse: WordPressResponse<Post[]> = {
    data: [],
    headers: { total: 0, totalPages: 0 },
  };

  if (!isConfigured) return emptyResponse;

  try {
    const whereArg = Object.keys(where).length > 0 ? where : undefined;

    // Run paginated fetch and count in parallel
    const [postsData, countData] = await Promise.all([
      graphqlFetch<{
        posts: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: unknown[] };
      }>(
        POSTS_QUERY,
        { first: perPage, after: cursor, where: whereArg },
        cacheTags
      ),
      graphqlFetch<{
        posts: { nodes: { databaseId: number }[] };
      }>(
        POSTS_COUNT_QUERY,
        { where: whereArg },
        cacheTags
      ),
    ]);

    const total = countData.posts.nodes.length;

    return {
      data: postsData.posts.nodes.map(transformPost),
      headers: {
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch {
    console.warn("WordPress paginated fetch failed");
    return emptyResponse;
  }
}

export async function getRecentPosts(filterParams?: {
  author?: string;
  tag?: string;
  category?: string;
  search?: string;
}): Promise<Post[]> {
  const where: Record<string, unknown> = {};

  if (filterParams?.search) where.search = filterParams.search;
  if (filterParams?.author) where.author = parseInt(filterParams.author);
  if (filterParams?.tag) where.tagId = filterParams.tag;
  if (filterParams?.category) where.categoryId = filterParams.category;

  const data = await graphqlFetchGraceful<{
    posts: { nodes: unknown[] };
  }>(
    POSTS_QUERY,
    { posts: { nodes: [] } },
    {
      first: 100,
      where: Object.keys(where).length > 0 ? where : undefined,
    },
    ["wordpress", "posts"]
  );

  return data.posts.nodes.map(transformPost);
}

export async function getPostById(id: number): Promise<Post> {
  const data = await graphqlFetch<{ post: unknown }>(
    POST_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformPost(data.post);
}

export const getPostBySlug = cache(async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const data = await graphqlFetchGraceful<{ post: unknown | null }>(
    POST_BY_SLUG_QUERY,
    { post: null },
    { slug }
  );
  if (!data.post) return undefined;

  const post = transformPost(data.post);
  const extras = await fetchContentExtras("post", post.id);
  post.acf = extras.acf;
  post.customTaxonomies = extras.customTaxonomies;
  return post;
});

// ============================================================================
// Exported Functions — Categories
// ============================================================================

export async function getAllCategories(): Promise<Category[]> {
  const data = await graphqlFetchGraceful<{
    categories: { nodes: unknown[] };
  }>(
    CATEGORIES_QUERY,
    { categories: { nodes: [] } },
    { first: 100 },
    ["wordpress", "categories"]
  );
  return data.categories.nodes.map(transformCategory);
}

export async function getCategoryById(id: number): Promise<Category> {
  const data = await graphqlFetch<{ category: unknown }>(
    CATEGORY_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformCategory(data.category);
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const data = await graphqlFetch<{ category: unknown }>(
    CATEGORY_BY_SLUG_QUERY,
    { slug }
  );
  return transformCategory(data.category);
}

export async function getPostsByCategory(categoryId: number): Promise<Post[]> {
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { categoryId } }
  );
  return data.posts.nodes.map(transformPost);
}

// ============================================================================
// Exported Functions — Tags
// ============================================================================

export async function getAllTags(): Promise<Tag[]> {
  const data = await graphqlFetchGraceful<{
    tags: { nodes: unknown[] };
  }>(
    TAGS_QUERY,
    { tags: { nodes: [] } },
    { first: 100 },
    ["wordpress", "tags"]
  );
  return data.tags.nodes.map(transformTag);
}

export async function getTagById(id: number): Promise<Tag> {
  const data = await graphqlFetch<{ tag: unknown }>(
    TAG_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformTag(data.tag);
}

export async function getTagBySlug(slug: string): Promise<Tag> {
  const data = await graphqlFetch<{ tag: unknown }>(
    TAG_BY_SLUG_QUERY,
    { slug }
  );
  return transformTag(data.tag);
}

export async function getPostsByTag(tagId: number): Promise<Post[]> {
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { tagId: String(tagId) } }
  );
  return data.posts.nodes.map(transformPost);
}

export async function getTagsByPost(postId: number): Promise<Tag[]> {
  const data = await graphqlFetch<{ post: { tags: { nodes: unknown[] } } }>(
    TAGS_BY_POST_QUERY,
    { id: String(postId) }
  );
  return data.post.tags.nodes.map(transformTag);
}

// ============================================================================
// Exported Functions — Pages
// ============================================================================

export async function getAllPages(): Promise<Page[]> {
  const data = await graphqlFetchGraceful<{
    pages: { nodes: unknown[] };
  }>(
    PAGES_QUERY,
    { pages: { nodes: [] } },
    { first: 100 },
    ["wordpress", "pages"]
  );
  return data.pages.nodes.map(transformPage);
}

export async function getPageById(id: number): Promise<Page> {
  const data = await graphqlFetch<{ page: unknown }>(
    PAGE_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformPage(data.page);
}

export const getPageBySlug = cache(async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const data = await graphqlFetchGraceful<{ page: unknown | null }>(
    PAGE_BY_SLUG_QUERY,
    { page: null },
    { slug }
  );
  if (!data.page) return undefined;

  const page = transformPage(data.page);
  const extras = await fetchContentExtras("page", page.id);
  page.acf = extras.acf;
  page.customTaxonomies = extras.customTaxonomies;
  return page;
});

// ============================================================================
// Exported Functions — Authors
// ============================================================================

export async function getAllAuthors(): Promise<Author[]> {
  const data = await graphqlFetchGraceful<{
    users: { nodes: unknown[] };
  }>(
    AUTHORS_QUERY,
    { users: { nodes: [] } },
    { first: 100 },
    ["wordpress", "authors"]
  );
  return data.users.nodes.map(transformAuthor);
}

export async function getAuthorById(id: number): Promise<Author> {
  const data = await graphqlFetch<{ user: unknown }>(
    AUTHOR_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformAuthor(data.user);
}

export async function getAuthorBySlug(slug: string): Promise<Author> {
  const data = await graphqlFetch<{ user: unknown }>(
    AUTHOR_BY_SLUG_QUERY,
    { slug }
  );
  return transformAuthor(data.user);
}

export async function getPostsByAuthor(authorId: number): Promise<Post[]> {
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { author: authorId } }
  );
  return data.posts.nodes.map(transformPost);
}

export async function getPostsByAuthorSlug(
  authorSlug: string
): Promise<Post[]> {
  const author = await getAuthorBySlug(authorSlug);
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { author: author.id } }
  );
  return data.posts.nodes.map(transformPost);
}

export async function getPostsByCategorySlug(
  categorySlug: string
): Promise<Post[]> {
  const category = await getCategoryBySlug(categorySlug);
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { categoryId: category.id } }
  );
  return data.posts.nodes.map(transformPost);
}

export async function getPostsByTagSlug(tagSlug: string): Promise<Post[]> {
  const tag = await getTagBySlug(tagSlug);
  const data = await graphqlFetch<{ posts: { nodes: unknown[] } }>(
    POSTS_QUERY,
    { first: 100, where: { tagId: String(tag.id) } }
  );
  return data.posts.nodes.map(transformPost);
}

// ============================================================================
// Exported Functions — Media
// ============================================================================

export async function getFeaturedMediaById(id: number): Promise<FeaturedMedia> {
  const data = await graphqlFetch<{ mediaItem: unknown }>(
    MEDIA_BY_ID_QUERY,
    { id: String(id) }
  );
  return transformFeaturedMedia(data.mediaItem);
}

// ============================================================================
// Exported Functions — Search
// ============================================================================

export async function searchCategories(query: string): Promise<Category[]> {
  const data = await graphqlFetchGraceful<{
    categories: { nodes: unknown[] };
  }>(
    CATEGORIES_QUERY,
    { categories: { nodes: [] } },
    { first: 100, where: { search: query } }
  );
  return data.categories.nodes.map(transformCategory);
}

export async function searchTags(query: string): Promise<Tag[]> {
  const data = await graphqlFetchGraceful<{
    tags: { nodes: unknown[] };
  }>(
    TAGS_QUERY,
    { tags: { nodes: [] } },
    { first: 100, where: { search: query } }
  );
  return data.tags.nodes.map(transformTag);
}

export async function searchAuthors(query: string): Promise<Author[]> {
  const data = await graphqlFetchGraceful<{
    users: { nodes: unknown[] };
  }>(
    AUTHORS_QUERY,
    { users: { nodes: [] } },
    { first: 100, where: { search: query } }
  );
  return data.users.nodes.map(transformAuthor);
}

// ============================================================================
// Exported Functions — Bulk Fetches (pagination through all items)
// ============================================================================

export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  if (!isConfigured) return [];

  try {
    const allSlugs: { slug: string }[] = [];
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
      const result: {
        posts: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: { slug: string }[];
        };
      } = await graphqlFetch(ALL_POST_SLUGS_QUERY, { first: 100, after: cursor });

      allSlugs.push(...result.posts.nodes.map((n) => ({ slug: n.slug })));
      hasMore = result.posts.pageInfo.hasNextPage;
      cursor = result.posts.pageInfo.endCursor;
    }

    return allSlugs;
  } catch {
    console.warn("WordPress unavailable, skipping static generation for posts");
    return [];
  }
}

export async function getAllPostsForSitemap(): Promise<
  { slug: string; modified: string }[]
> {
  if (!isConfigured) return [];

  try {
    const allPosts: { slug: string; modified: string }[] = [];
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
      const result: {
        posts: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: { slug: string; modified: string }[];
        };
      } = await graphqlFetch(ALL_POSTS_SITEMAP_QUERY, { first: 100, after: cursor });

      allPosts.push(
        ...result.posts.nodes.map((n) => ({
          slug: n.slug,
          modified: n.modified,
        }))
      );
      hasMore = result.posts.pageInfo.hasNextPage;
      cursor = result.posts.pageInfo.endCursor;
    }

    return allPosts;
  } catch {
    console.warn("WordPress unavailable, skipping sitemap generation");
    return [];
  }
}

// ============================================================================
// Exported Functions — Paginated by Entity
// ============================================================================

export async function getPostsByCategoryPaginated(
  categoryId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return getPostsPaginated(page, perPage, {
    category: String(categoryId),
  });
}

export async function getPostsByTagPaginated(
  tagId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return getPostsPaginated(page, perPage, {
    tag: String(tagId),
  });
}

export async function getPostsByAuthorPaginated(
  authorId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return getPostsPaginated(page, perPage, {
    author: String(authorId),
  });
}

// ============================================================================
// REST API — ACF & Custom Taxonomy Fetching
// ============================================================================

// Standard WordPress keys to exclude when discovering custom taxonomy fields
const WP_STANDARD_KEYS = new Set([
  "id", "date", "date_gmt", "guid", "modified", "modified_gmt",
  "slug", "status", "type", "link", "title", "content", "excerpt",
  "author", "featured_media", "comment_status", "ping_status",
  "sticky", "template", "format", "meta", "categories", "tags",
  "acf", "yoast_head", "yoast_head_json", "class_list", "_links",
  "parent", "menu_order", "_embedded",
]);

// Map post type names to REST API endpoint slugs
function restEndpoint(postType: string): string {
  if (postType === "post") return "posts";
  if (postType === "page") return "pages";
  return postType;
}

// Filter out null, empty, and false values from ACF data
function filterACF(
  acf: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!acf || typeof acf !== "object") return undefined;

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(acf)) {
    if (value === null || value === undefined || value === false || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    filtered[key] = value;
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

// Taxonomy label cache (populated by getCustomTaxonomies)
let taxonomyLabelCache: Map<string, string> | null = null;

const TAXONOMIES_QUERY = `
  query GetTaxonomies {
    taxonomies {
      nodes {
        name
        label
        connectedContentTypes {
          nodes {
            name
          }
        }
      }
    }
  }
`;

const BUILT_IN_TAXONOMIES = new Set([
  "category", "post_tag", "post_format", "nav_menu",
]);

export async function getCustomTaxonomies(): Promise<
  Array<{ name: string; label: string; contentTypes: string[] }>
> {
  const data = await graphqlFetchGraceful<{
    taxonomies: {
      nodes: Array<{
        name: string;
        label: string;
        connectedContentTypes: { nodes: Array<{ name: string }> };
      }>;
    };
  }>(
    TAXONOMIES_QUERY,
    { taxonomies: { nodes: [] } },
    undefined,
    ["wordpress", "taxonomies"]
  );

  return data.taxonomies.nodes
    .filter((t) => !BUILT_IN_TAXONOMIES.has(t.name))
    .map((t) => ({
      name: t.name,
      label: t.label,
      contentTypes: t.connectedContentTypes.nodes.map((ct) => ct.name),
    }));
}

async function getTaxonomyLabelMap(): Promise<Map<string, string>> {
  if (taxonomyLabelCache) return taxonomyLabelCache;

  const taxonomies = await getCustomTaxonomies();
  taxonomyLabelCache = new Map();
  for (const t of taxonomies) {
    taxonomyLabelCache.set(t.name, t.label);
  }
  return taxonomyLabelCache;
}

// Fetch REST API data for a content item and extract ACF + custom taxonomy data
async function fetchContentExtras(
  postType: string,
  id: number
): Promise<{
  acf?: Record<string, unknown>;
  customTaxonomies?: CustomTaxonomyData[];
}> {
  if (!baseUrl) return {};

  try {
    const endpoint = restEndpoint(postType);
    const url = `${baseUrl}/wp-json/wp/v2/${endpoint}/${id}`;

    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: CACHE_TTL, tags: ["wordpress", `rest-${postType}-${id}`] },
    });

    if (!response.ok) return {};

    const data = await response.json();

    // Extract ACF fields
    const acf = filterACF(data.acf);

    // Discover custom taxonomy fields from the REST response
    // Any key not in WP_STANDARD_KEYS that contains an array of numbers = taxonomy term IDs
    const customTaxonomies: CustomTaxonomyData[] = [];
    const labelMap = await getTaxonomyLabelMap();

    for (const [key, value] of Object.entries(data)) {
      if (WP_STANDARD_KEYS.has(key)) continue;
      if (!Array.isArray(value)) continue;
      if (value.length === 0) continue;
      if (!value.every((v: unknown) => typeof v === "number")) continue;

      // Validate taxonomy key format before using in URL
      if (!/^[a-z][a-z0-9_-]{0,49}$/i.test(key)) continue;

      // This is a taxonomy field — fetch the terms
      const termIds = value as number[];
      try {
        const termsUrl = `${baseUrl}/wp-json/wp/v2/${encodeURIComponent(key)}?include=${termIds.join(",")}`;
        const termsResponse = await fetch(termsUrl, {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: CACHE_TTL, tags: ["wordpress", `taxonomy-${key}`] },
        });

        if (termsResponse.ok) {
          const termsData = await termsResponse.json();
          if (Array.isArray(termsData) && termsData.length > 0) {
            customTaxonomies.push({
              taxonomy: key,
              label: labelMap.get(key) || key,
              terms: termsData.map((t: any) => ({
                id: t.id || 0,
                name: t.name || "",
                slug: t.slug || "",
              })),
            });
          }
        }
      } catch {
        // Term fetch failed — skip this taxonomy
      }
    }

    return {
      acf,
      customTaxonomies: customTaxonomies.length > 0 ? customTaxonomies : undefined,
    };
  } catch {
    console.warn(`REST API fetch failed for ${postType}/${id}`);
    return {};
  }
}

// ============================================================================
// CPT Discovery & Generic Content
// ============================================================================

const BUILT_IN_CONTENT_TYPES = new Set([
  "post",
  "page",
  "attachment",
  "revision",
  "nav_menu_item",
  "wp_block",
  "wp_template",
  "wp_template_part",
  "wp_navigation",
  "wp_font_family",
  "wp_font_face",
  "wp_global_styles",
]);

const CONTENT_TYPES_QUERY = `
  query GetContentTypes {
    contentTypes(first: 100) {
      nodes {
        name
        graphqlSingleName
        graphqlPluralName
        label
        description
        hasArchive
      }
    }
  }
`;

const CONTENT_NODE_FIELDS = `
  databaseId
  slug
  date
  modified
  status
  link
  ... on NodeWithTitle {
    title
  }
  ... on NodeWithContentEditor {
    content
  }
  ... on NodeWithExcerpt {
    excerpt
  }
  ... on NodeWithFeaturedImage {
    featuredImage {
      node {
        databaseId
        sourceUrl
        altText
        title
        caption
        mimeType
        mediaDetails {
          width
          height
          file
          sizes {
            name
            sourceUrl
            width
            height
            mimeType
            file
          }
        }
      }
    }
  }
  ... on NodeWithAuthor {
    author {
      node {
        databaseId
        name
        slug
        avatar {
          url
        }
      }
    }
  }
  ${SEO_FIELDS}
`;

// Validate CPT name: only lowercase alphanumeric, hyphens, underscores (max 50 chars)
const CPT_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,49}$/;

// Convert CPT name to WPGraphQL ContentTypeEnum value
// e.g. "actualite-veille" → "ACTUALITE_VEILLE", "guide" → "GUIDE"
function toContentTypeEnum(name: string): string {
  if (!CPT_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid content type name: ${name}`);
  }
  return name.replace(/-/g, "_").toUpperCase();
}

const CPT_COLLECTION_QUERY = `
  query GetCPTCollection($contentType: ContentTypeEnum!, $first: Int!, $after: String) {
    contentNodes(where: { contentTypes: [$contentType] }, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ${CONTENT_NODE_FIELDS}
      }
    }
  }
`;

const CPT_COUNT_QUERY = `
  query GetCPTCount($contentType: ContentTypeEnum!) {
    contentNodes(where: { contentTypes: [$contentType] }, first: 10000) {
      nodes {
        databaseId
      }
    }
  }
`;

const CPT_SINGLE_QUERY = `
  query GetCPTBySlug($contentType: ContentTypeEnum!, $slug: String!) {
    contentNodes(where: { contentTypes: [$contentType], name: $slug }, first: 1) {
      nodes {
        ${CONTENT_NODE_FIELDS}
      }
    }
  }
`;

const CPT_SLUGS_QUERY = `
  query GetCPTSlugs($contentType: ContentTypeEnum!, $first: Int!, $after: String) {
    contentNodes(where: { contentTypes: [$contentType] }, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        slug
      }
    }
  }
`;

function transformContentNode(node: any, contentTypeName: string): ContentNode {
  const featuredMedia = node.featuredImage?.node;
  const author = node.author?.node;

  return {
    id: node.databaseId || 0,
    slug: node.slug || "",
    date: node.date || "",
    modified: node.modified || "",
    link: node.link || "",
    status: (node.status?.toLowerCase() || "publish") as ContentNode["status"],
    title: node.title ? { rendered: node.title } : undefined,
    content: node.content
      ? { rendered: node.content, protected: false }
      : undefined,
    excerpt: node.excerpt
      ? { rendered: node.excerpt, protected: false }
      : undefined,
    author: author?.databaseId,
    featured_media: featuredMedia?.databaseId,
    _embedded: {
      author: author
        ? [
            {
              id: author.databaseId || 0,
              name: author.name || "",
              slug: author.slug || "",
              avatar_urls: author.avatar?.url
                ? { "96": author.avatar.url }
                : {},
            },
          ]
        : undefined,
      "wp:featuredmedia": featuredMedia
        ? [transformFeaturedMedia(featuredMedia)]
        : undefined,
    },
    contentType: contentTypeName,
    seo: transformSeo(node.seo),
  };
}

export const getCustomPostTypes = cache(async function getCustomPostTypes(): Promise<ContentTypeInfo[]> {
  const data = await graphqlFetchGraceful<{
    contentTypes: { nodes: ContentTypeInfo[] };
  }>(
    CONTENT_TYPES_QUERY,
    { contentTypes: { nodes: [] } },
    undefined,
    ["wordpress", "content-types"]
  );

  return data.contentTypes.nodes.filter(
    (ct) => !BUILT_IN_CONTENT_TYPES.has(ct.name)
  );
});

export const getContentTypeBySlug = cache(async function getContentTypeBySlug(
  slug: string
): Promise<ContentTypeInfo | undefined> {
  const types = await getCustomPostTypes();
  return types.find((ct) => ct.name === slug);
});

export async function getCPTNodesPaginated(
  cptInfo: ContentTypeInfo,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<ContentNode[]>> {
  const cursor = pageNumberToCursor(page, perPage);
  const contentType = toContentTypeEnum(cptInfo.name);
  const cacheTags = [
    "wordpress",
    `cpt-${cptInfo.name}`,
    `cpt-${cptInfo.name}-page-${page}`,
  ];

  const emptyResponse: WordPressResponse<ContentNode[]> = {
    data: [],
    headers: { total: 0, totalPages: 0 },
  };

  if (!isConfigured) return emptyResponse;

  try {
    const [collectionData, countData] = await Promise.all([
      graphqlFetch<{
        contentNodes: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: any[];
        };
      }>(
        CPT_COLLECTION_QUERY,
        { contentType, first: perPage, after: cursor },
        cacheTags
      ),
      graphqlFetch<{
        contentNodes: { nodes: { databaseId: number }[] };
      }>(
        CPT_COUNT_QUERY,
        { contentType },
        cacheTags
      ),
    ]);

    const total = countData.contentNodes?.nodes?.length || 0;

    return {
      data: (collectionData.contentNodes?.nodes || []).map((node: any) =>
        transformContentNode(node, cptInfo.name)
      ),
      headers: {
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch {
    console.warn(`WordPress CPT fetch failed for ${cptInfo.name}`);
    return emptyResponse;
  }
}

export const getCPTNodeBySlug = cache(async function getCPTNodeBySlug(
  cptInfo: ContentTypeInfo,
  slug: string
): Promise<ContentNode | undefined> {
  const contentType = toContentTypeEnum(cptInfo.name);

  const data = await graphqlFetchGraceful<{
    contentNodes: { nodes: any[] };
  }>(
    CPT_SINGLE_QUERY,
    { contentNodes: { nodes: [] } },
    { contentType, slug },
    ["wordpress", `cpt-${cptInfo.name}`, `cpt-${cptInfo.name}-${slug}`]
  );

  const rawNode = data.contentNodes?.nodes?.[0];
  if (!rawNode) return undefined;

  const node = transformContentNode(rawNode, cptInfo.name);
  const extras = await fetchContentExtras(cptInfo.name, node.id);
  node.acf = extras.acf;
  node.customTaxonomies = extras.customTaxonomies;
  return node;
});

export async function getAllCPTSlugs(
  cptInfo: ContentTypeInfo
): Promise<{ slug: string }[]> {
  if (!isConfigured) return [];

  const contentType = toContentTypeEnum(cptInfo.name);

  try {
    const allSlugs: { slug: string }[] = [];
    let hasMore = true;
    let cursor: string | null = null;

    while (hasMore) {
      const result: {
        contentNodes: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: { slug: string }[];
        };
      } = await graphqlFetch(CPT_SLUGS_QUERY, {
        contentType,
        first: 100,
        after: cursor,
      });

      allSlugs.push(
        ...result.contentNodes.nodes.map((n) => ({ slug: n.slug }))
      );
      hasMore = result.contentNodes.pageInfo.hasNextPage;
      cursor = result.contentNodes.pageInfo.endCursor;
    }

    return allSlugs;
  } catch {
    console.warn(
      `WordPress unavailable, skipping static generation for CPT: ${cptInfo.name}`
    );
    return [];
  }
}

// ============================================================================
// ACF Options Pages (REST API — custom mu-plugin endpoint)
// ============================================================================

export async function getACFOptionsPages(): Promise<ACFOptionsPageInfo[]> {
  if (!baseUrl) return [];

  try {
    const url = `${baseUrl}/wp-json/next-wp/v1/options-pages`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: CACHE_TTL, tags: ["wordpress", "options-pages"] },
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data as ACFOptionsPageInfo[];
  } catch {
    console.warn("ACF Options Pages fetch failed (mu-plugin may not be installed)");
    return [];
  }
}

export const getACFOptionsPageBySlug = cache(async function getACFOptionsPageBySlug(
  slug: string
): Promise<ACFOptionsPageData | undefined> {
  if (!baseUrl) return undefined;

  try {
    const url = `${baseUrl}/wp-json/next-wp/v1/options-pages/${encodeURIComponent(slug)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: CACHE_TTL, tags: ["wordpress", "options-pages", `options-page-${slug}`] },
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    if (data.code) return undefined;

    return data as ACFOptionsPageData;
  } catch {
    console.warn(`ACF Options Page fetch failed for slug: ${slug}`);
    return undefined;
  }
});

export { WordPressAPIError };
