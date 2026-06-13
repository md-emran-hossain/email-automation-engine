import { z } from 'zod';
import { queueMessageEnvelopeSchema } from '../contracts/queue-message';

export const EMAIL_TRACKING_EVENTS = {
  DELIVERED: 'delivered',
  BOUNCED: 'bounced',
  COMPLAINED: 'complained',
  OPENED: 'opened',
  CLICKED: 'clicked',
} as const;

export const emailTrackingEventMessageSchema = queueMessageEnvelopeSchema.extend({
  contactId: z.string().uuid(),
  emailMessageId: z.string().uuid(),
  eventType: z.enum([
    EMAIL_TRACKING_EVENTS.DELIVERED,
    EMAIL_TRACKING_EVENTS.BOUNCED,
    EMAIL_TRACKING_EVENTS.COMPLAINED,
    EMAIL_TRACKING_EVENTS.OPENED,
    EMAIL_TRACKING_EVENTS.CLICKED,
  ]),
  url: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});

export type EmailTrackingEventMessage = z.infer<typeof emailTrackingEventMessageSchema>;

export function isEmailTrackingEventMessage(
  message: unknown,
): message is EmailTrackingEventMessage {
  return emailTrackingEventMessageSchema.safeParse(message).success;
}
