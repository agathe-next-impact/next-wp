import { getACFOptionsPages } from "@/lib/wordpress";
import { Section, Container, Prose } from "@/components/craft";
import Link from "next/link";
import { Settings } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Options Pages",
  description: "ACF Options Pages",
  alternates: {
    canonical: "/options",
  },
};

export default async function OptionsIndexPage() {
  const optionsPages = await getACFOptionsPages();

  return (
    <Section>
      <Container>
        <div className="space-y-8">
          <Prose>
            <h2>Options Pages</h2>
          </Prose>

          {optionsPages.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {optionsPages.map((page) => (
                <Link
                  key={page.slug}
                  className="border h-48 bg-accent/50 rounded-lg p-4 flex flex-col justify-between hover:scale-[1.02] transition-all"
                  href={`/options/${page.slug}`}
                >
                  <Settings size={32} />
                  <span>
                    {page.page_title || page.menu_title}{" "}
                    <span className="block text-sm text-muted-foreground">
                      {page.description || page.slug}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
              <p className="text-muted-foreground">No options pages found</p>
            </div>
          )}
        </div>
      </Container>
    </Section>
  );
}
