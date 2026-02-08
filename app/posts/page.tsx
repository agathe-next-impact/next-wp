import {
  getPostsPaginated,
  getAllAuthors,
  getAllTags,
  getAllCategories,
  searchAuthors,
  searchTags,
  searchCategories,
} from "@/lib/wordpress";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { Section, Container, Prose } from "@/components/craft";
import { PostCard } from "@/components/posts/post-card";
import { SearchInput } from "@/components/posts/search-input";
import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { z } from "zod";

const FilterPosts = nextDynamic(
  () =>
    import("@/components/posts/filter").then((mod) => ({
      default: mod.FilterPosts,
    })),
  {
    loading: () => (
      <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    ),
  }
);

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog Posts",
  description: "Browse all our blog posts",
};

export const dynamic = "auto";
export const revalidate = 3600;

const postsSearchSchema = z.object({
  author: z.string().regex(/^\d+$/).optional(),
  tag: z.string().regex(/^\d+$/).optional(),
  category: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  search: z.string().max(200).optional(),
});

type PostsSearchParams = z.infer<typeof postsSearchSchema>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<PostsSearchParams>;
}) {
  const rawParams = await searchParams;
  const parsed = postsSearchSchema.safeParse(rawParams);
  const params: PostsSearchParams = parsed.success ? parsed.data : {};

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          <Prose>
            <h2>All Posts</h2>
          </Prose>

          <SearchInput defaultValue={params.search} />

          <Suspense fallback={<PostsContentSkeleton />}>
            <PostsContent params={params} />
          </Suspense>
        </div>
      </Container>
    </Section>
  );
}

async function PostsContent({ params }: { params: PostsSearchParams }) {
  const { author, tag, category, page: pageParam, search } = params;

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const postsPerPage = 9;

  const [postsResponse, authors, tags, categories] = await Promise.all([
    getPostsPaginated(page, postsPerPage, { author, tag, category, search }),
    search ? searchAuthors(search) : getAllAuthors(),
    search ? searchTags(search) : getAllTags(),
    search ? searchCategories(search) : getAllCategories(),
  ]);

  const { data: posts, headers } = postsResponse;
  const { total, totalPages } = headers;

  const createPaginationUrl = (newPage: number) => {
    const p = new URLSearchParams();
    if (newPage > 1) p.set("page", newPage.toString());
    if (category) p.set("category", category);
    if (author) p.set("author", author);
    if (tag) p.set("tag", tag);
    if (search) p.set("search", search);
    return `/posts${p.toString() ? `?${p.toString()}` : ""}`;
  };

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {total} {total === 1 ? "post" : "posts"} found
        {search && " matching your search"}
      </p>

      <FilterPosts
        authors={authors}
        tags={tags}
        categories={categories}
        selectedAuthor={author}
        selectedTag={tag}
        selectedCategory={category}
      />

      {posts.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
          <p>No posts found</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center py-8">
          <Pagination>
            <PaginationContent>
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    href={createPaginationUrl(page - 1)}
                  />
                </PaginationItem>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pageNum) => {
                  return (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - page) <= 1
                  );
                })
                .map((pageNum, index, array) => {
                  const showEllipsis =
                    index > 0 && pageNum - array[index - 1] > 1;
                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && <span className="px-2">...</span>}
                      <PaginationItem>
                        <PaginationLink
                          href={createPaginationUrl(pageNum)}
                          isActive={pageNum === page}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    </div>
                  );
                })}

              {page < totalPages && (
                <PaginationItem>
                  <PaginationNext href={createPaginationUrl(page + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}

function PostsContentSkeleton() {
  return (
    <>
      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg p-4 space-y-4 bg-accent/30"
          >
            <div className="h-48 bg-muted animate-pulse rounded-md" />
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </>
  );
}
