import { STEP_ACTIONS, TRIGGER_EVENTS } from '@email-automation-engine/shared';

export const STEP_ACTION_LABELS: Record<string, string> = {
  [STEP_ACTIONS.DELAY]: 'Delay',
  [STEP_ACTIONS.SEND_EMAIL]: 'Send email',
  [STEP_ACTIONS.ATTACH_TAG]: 'Attach tag',
  [STEP_ACTIONS.DETACH_TAG]: 'Detach tag',
  [STEP_ACTIONS.UNSUBSCRIBE_CONTACT]: 'Unsubscribe contact',
  [STEP_ACTIONS.DELETE_CONTACT]: 'Delete contact',
  [STEP_ACTIONS.CONDITIONAL_SPLIT]: 'Conditional split',
  [STEP_ACTIONS.WEBHOOK]: 'Webhook',
};

export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  [TRIGGER_EVENTS.CONTACT_SUBSCRIBED]: 'Contact subscribed',
  [TRIGGER_EVENTS.CONTACT_UNSUBSCRIBED]: 'Contact unsubscribed',
  [TRIGGER_EVENTS.TAG_ATTACHED]: 'Tag attached',
  [TRIGGER_EVENTS.TAG_DETACHED]: 'Tag detached',
  [TRIGGER_EVENTS.EMAIL_SENT]: 'Email sent',
  [TRIGGER_EVENTS.EMAIL_DELIVERED]: 'Email delivered',
  [TRIGGER_EVENTS.EMAIL_BOUNCED]: 'Email bounced',
  [TRIGGER_EVENTS.EMAIL_COMPLAINED]: 'Email complained',
  [TRIGGER_EVENTS.EMAIL_OPENED]: 'Email opened',
  [TRIGGER_EVENTS.EMAIL_LINK_CLICKED]: 'Email link clicked',
  [TRIGGER_EVENTS.CUSTOM_EVENT]: 'Custom event',
};
