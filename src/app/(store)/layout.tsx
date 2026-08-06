import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StoreMain } from "@/components/store-main";
import { StoreMobileChrome } from "@/components/store-mobile-chrome";
import { prepareDatabase } from "@/lib/db";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await prepareDatabase();
  } catch (err) {
    console.error("[store] prepareDatabase failed:", err);
  }

  return (
    <div className="flex min-h-full flex-col">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <SiteHeader />
      <StoreMain>{children}</StoreMain>
      <SiteFooter />
      <StoreMobileChrome />
    </div>
  );
}
