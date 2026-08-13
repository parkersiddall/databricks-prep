import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <PageContainer
      title="Settings"
      description="Preferences and stored progress for this browser."
      crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]}
    >
      <SettingsPanel />
    </PageContainer>
  );
}
