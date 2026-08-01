import { EasyHelpBar } from "@/components/easy-help-bar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1 pb-28 sm:pb-24">{children}</main>
      <SiteFooter />
      <EasyHelpBar />
    </div>
  );
}
