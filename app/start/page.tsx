import type { Metadata } from "next";
import { connection } from "next/server";
import { IntakeWizard } from "@/components/intake/intake-wizard";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/start",
  title: "Build my plan",
  description:
    "Answer a few short questions about your role, product and team to get a step-by-step learning plan. No name, email or account needed.",
});

export default async function StartPage() {
  // Rendered for each visit, so a link to question 5 opens on question 5 with no flash of question 1.
  await connection();
  return <IntakeWizard />;
}
