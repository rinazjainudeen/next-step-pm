import "server-only";
import { Resend } from "resend";
import { feedbackAlertEmail } from "./feedback-alert";
import type { FeedbackRecord } from "./feedback-types";

/**
 * Sends the alert email through Resend. The address that receives it comes from
 * FEEDBACK_ALERT_EMAIL, never from the code.
 *
 * Resend's shared test sender only delivers to the address the Resend account
 * was opened with. To send from your own domain, verify it in Resend first.
 */
const FROM = "Next Step PM <onboarding@resend.dev>";

export async function sendFeedbackAlert(record: FeedbackRecord): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_ALERT_EMAIL;
  if (!key || !to) throw new Error("Resend isn't set up: RESEND_API_KEY or FEEDBACK_ALERT_EMAIL is missing.");
  const { subject, text } = feedbackAlertEmail(record);
  const { error } = await new Resend(key).emails.send({ from: FROM, to, subject, text });
  if (error) throw new Error(`Couldn't send the alert email: ${error.message}`);
}
