import type { FeedbackRecord } from "./feedback-types";

/** The alert email to Rinaz. Plain text, so nothing a visitor writes can be shown as a link or a picture. */
export function feedbackAlertEmail(record: FeedbackRecord): { subject: string; text: string } {
  const stars = "★".repeat(record.rating) + "☆".repeat(5 - record.rating);
  const answers = Object.entries(record.planSummary).map(([key, value]) => `  ${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
  return {
    subject: `New feedback: ${record.rating} out of 5`,
    text: [
      `Rating: ${stars} (${record.rating} out of 5)`,
      "",
      "Comment:",
      record.comment ?? "(none)",
      "",
      "Plan answers:",
      ...(answers.length > 0 ? answers : ["  (none)"]),
      "",
      `Site version: ${record.pageVersion}`,
      "",
      "Read all feedback in the feedback table in Supabase.",
    ].join("\n"),
  };
}
