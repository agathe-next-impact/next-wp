// Common types that are reused across multiple entities
interface WPEntity {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: "publish" | "future" | "draft" | "pending" | "private";
  link: string;
  guid: {
    rendered: string;
  };
}

interface RenderedContent {
  rendered: string;
  protected: boolean;
}

interface RenderedTitle {
  rendered: string;
}

// Media types
interface MediaSize {
  file: string;
  width: number;
  height: number;
  mime_type: string;
  source_url: string;
}

interface MediaDetails {
  width: number;
  height: number;
  file: string;
  sizes: Record<string, MediaSize>;
}

export interface FeaturedMedia extends WPEntity {
  title: RenderedTitle;
  author: number;
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: MediaDetails;
  source_url: string;
}

// SEO metadata (from Yoast or native WordPress fallback)
export interface SeoImage {
  sourceUrl: string;
  width: number;
  height: number;
  altText: string;
}

export interface SeoMetadata {
  title: string;
  metaDesc: string;
  canonical: string;
  opengraphTitle: string;
  opengraphDescription: string;
  opengraphUrl: string;
  opengraphImage?: SeoImage;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage?: SeoImage;
}

// Content types
export interface Post extends WPEntity {
  title: RenderedTitle;
  content: RenderedContent;
  excerpt?: RenderedContent;
  author: number;
  featured_media: number;
  comment_status: "open" | "closed";
  ping_status: "open" | "closed";
  sticky: boolean;
  template: string;
  format:
    | "standard"
    | "aside"
    | "chat"
    | "gallery"
    | "link"
    | "image"
    | "quote"
    | "status"
    | "video"
    | "audio";
  categories: number[];
  tags: number[];
  meta: Record<string, unknown>;
  _embedded?: PostEmbedded;
  acf?: Record<string, unknown>;
  customTaxonomies?: CustomTaxonomyData[];
  seo?: SeoMetadata;
}

export interface Page extends WPEntity {
  title: RenderedTitle;
  content: RenderedContent;
  excerpt?: RenderedContent;
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: "open" | "closed";
  ping_status: "open" | "closed";
  template: string;
  meta: Record<string, unknown>;
  acf?: Record<string, unknown>;
  customTaxonomies?: CustomTaxonomyData[];
  seo?: SeoMetadata;
}

// Custom taxonomy data for dynamic rendering
export interface CustomTaxonomyData {
  taxonomy: string;
  label: string;
  terms: Array<{ id: number; name: string; slug: string }>;
}

// CPT Discovery types
export interface ContentTypeInfo {
  name: string;
  graphqlSingleName: string;
  graphqlPluralName: string;
  label: string;
  description: string;
  hasArchive: boolean;
}

// Generic content node for any CPT item
export interface ContentNode {
  id: number;
  slug: string;
  date: string;
  modified: string;
  link: string;
  status: "publish" | "future" | "draft" | "pending" | "private";
  title?: { rendered: string };
  content?: { rendered: string; protected: boolean };
  excerpt?: { rendered: string; protected: boolean };
  author?: number;
  featured_media?: number;
  _embedded?: {
    author?: EmbeddedAuthor[];
    "wp:featuredmedia"?: FeaturedMedia[];
  };
  contentType: string;
  acf?: Record<string, unknown>;
  customTaxonomies?: CustomTaxonomyData[];
  seo?: SeoMetadata;
}

// ACF Options Page types
export interface ACFOptionsPageInfo {
  slug: string;
  page_title: string;
  menu_title: string;
  description: string;
  icon_url: string;
  parent_slug: string;
  post_id: string;
}

export interface ACFOptionsPageData extends ACFOptionsPageInfo {
  acf: Record<string, unknown>;
}

// Taxonomy types
interface Taxonomy {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  meta: Record<string, unknown>;
}

export interface Category extends Taxonomy {
  taxonomy: "category";
  parent: number;
}

export interface Tag extends Taxonomy {
  taxonomy: "post_tag";
}

export interface Author {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
  meta: Record<string, unknown>;
}

// Embedded types (returned when _embed=true)
interface EmbeddedAuthor {
  id: number;
  name: string;
  slug: string;
  avatar_urls: Record<string, string>;
}

interface EmbeddedTerm {
  id: number;
  name: string;
  slug: string;
}

export interface PostEmbedded {
  author?: EmbeddedAuthor[];
  "wp:featuredmedia"?: FeaturedMedia[];
  "wp:term"?: EmbeddedTerm[][];
}

// Block types
interface BlockSupports {
  align?: boolean | string[];
  anchor?: boolean;
  className?: boolean;
  color?: {
    background?: boolean;
    gradients?: boolean;
    text?: boolean;
  };
  spacing?: {
    margin?: boolean;
    padding?: boolean;
  };
  typography?: {
    fontSize?: boolean;
    lineHeight?: boolean;
  };
  [key: string]: unknown;
}

interface BlockStyle {
  name: string;
  label: string;
  isDefault: boolean;
}

export interface BlockType {
  api_version: number;
  title: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  keywords: string[];
  parent: string[];
  supports: BlockSupports;
  styles: BlockStyle[];
  textdomain: string;
  example: Record<string, unknown>;
  attributes: Record<string, unknown>;
  provides_context: Record<string, string>;
  uses_context: string[];
  editor_script: string;
  script: string;
  editor_style: string;
  style: string;
}

export interface EditorBlock {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  innerBlocks: EditorBlock[];
  innerHTML: string;
  innerContent: string[];
}

export interface TemplatePart {
  id: string;
  slug: string;
  theme: string;
  type: string;
  source: string;
  origin: string;
  content: string | EditorBlock[];
  title: {
    raw: string;
    rendered: string;
  };
  description: string;
  status: "publish" | "future" | "draft" | "pending" | "private";
  wp_id: number;
  has_theme_file: boolean;
  author: number;
  area: string;
}

export interface SearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
  _links: {
    self: Array<{
      embeddable: boolean;
      href: string;
    }>;
    about: Array<{
      href: string;
    }>;
  };
}

// Component Props Types
export interface FilterBarProps {
  authors: Author[];
  tags: Tag[];
  categories: Category[];
  selectedAuthor?: Author["id"];
  selectedTag?: Tag["id"];
  selectedCategory?: Category["id"];
  onAuthorChange?: (authorId: Author["id"] | undefined) => void;
  onTagChange?: (tagId: Tag["id"] | undefined) => void;
  onCategoryChange?: (categoryId: Category["id"] | undefined) => void;
}
