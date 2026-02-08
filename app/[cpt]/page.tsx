import {
  getCustomPostTypes,
  getContentTypeBySlug,
  getCPTNodesPaginated,
} from "@/lib/wordpress";
import { Section, Container, Prose } from "@/components/craft";
import { ContentNodeCard } from "@/components/cpt/content-node-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  const types = await getCustomPostTypes();
  return types.map((ct) => ({ cpt: ct.name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cpt: string }>;
}): Promise<Metadata> {
  const { cpt } = await params;
  const cptInfo = await getContentTypeBySlug(cpt);

  if (!cptInfo) return {};

  return {
    title: cptInfo.label,
    description: cptInfo.description || `Browse all ${cptInfo.label}`,
    alternates: {
      canonical: `/${cpt}`,
    },
  };
}

export default async function CPTArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ cpt: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { cpt } = await params;
  const { page: pageParam } = await searchParams;

  const cptInfo = await getContentTypeBySlug(cpt);
  if (!cptInfo) notFound();

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const perPage = 9;

  const { data: nodes, headers } = await getCPTNodesPaginated(
    cptInfo,
    page,
    perPage
  );
  const { total, totalPages } = headers;

  const createPaginationUrl = (newPage: number) => {
    const p = new URLSearchParams();
    if (newPage > 1) p.set("page", newPage.toString());
    return `/${cpt}${p.toString() ? `?${p.toString()}` : ""}`;
  };

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          <Prose>
            <h2>{cptInfo.label}</h2>
            <p className="text-muted-foreground">
              {total} {total === 1 ? "item" : "items"} found
            </p>
          </Prose>

          {nodes.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {nodes.map((node) => (
                <ContentNodeCard key={node.id} node={node} basePath={cpt} />
              ))}
            </div>
          ) : (
            <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
              <p>No {cptInfo.label.toLowerCase()} found</p>
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
        </div>
      </Container>
    </Section>
  );
}
