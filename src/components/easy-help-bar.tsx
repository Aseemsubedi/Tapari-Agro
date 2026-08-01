import { callLink, shopConfig, whatsappLink } from "@/lib/shop";

export function EasyHelpBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-sm overflow-hidden border border-pine/10 bg-pine/95 text-chalk backdrop-blur-sm">
        <a
          href={callLink()}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-3.5 text-center transition hover:bg-white/5"
          aria-label={`Call ${shopConfig.phoneDisplay}`}
        >
          <span className="text-xs font-medium tracking-wide">Call</span>
        </a>
        <div className="w-px bg-chalk/10" />
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-brass px-3 py-3.5 text-center text-pine transition hover:bg-brass/90"
        >
          <span className="text-xs font-semibold tracking-wide">WhatsApp</span>
        </a>
        <div className="w-px bg-chalk/10" />
        <a
          href="/cart"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-3.5 text-center transition hover:bg-white/5"
        >
          <span className="text-xs font-medium tracking-wide">Bag</span>
        </a>
      </div>
    </div>
  );
}
