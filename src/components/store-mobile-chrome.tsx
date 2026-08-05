"use client";

import { useState } from "react";
import { EasyHelpBar } from "@/components/easy-help-bar";
import { MobileOnboardingSheet } from "@/components/mobile-onboarding-sheet";

/** Bottom chrome: help bar stays; profile sheet can cover it; PWA sits above. */
export function StoreMobileChrome() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      {!profileOpen ? <EasyHelpBar /> : null}
      <MobileOnboardingSheet onProfileOpenChange={setProfileOpen} />
    </>
  );
}
