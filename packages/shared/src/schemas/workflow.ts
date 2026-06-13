import { z } from 'zod';

export const STEP_ACTIONS = {
  DELAY: 'delay',
  SEND_EMAIL: 'send_email',
  ATTACH_TAG: 'attach_tag',
  DETACH_TAG: 'detach_tag',
  UNSUBSCRIBE_CONTACT: 'unsubscribe_contact',
  DELETE_CONTACT: 'delete_contact',
  CONDITIONAL_SPLIT: 'conditional_split',
  WEBHOOK: 'webhook',
} as const;

export const WEBHOOK_DELIVERY_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const SUPPORTED_WEBHOOK_DELIVERY_STATUSES = [
  WEBHOOK_DELIVERY_STATUS.PENDING,
  WEBHOOK_DELIVERY_STATUS.COMPLETED,
  WEBHOOK_DELIVERY_STATUS.FAILED,
] as const;

export const LOGICAL_OPERATORS = {
  ALL: 'ALL',
  ANY: 'ANY',
  NONE: 'NONE',
} as const;

export const SUPPORTED_LOGICAL_OPERATORS = [
  LOGICAL_OPERATORS.ALL,
  LOGICAL_OPERATORS.ANY,
  LOGICAL_OPERATORS.NONE,
] as const;

export type LogicalOperator = (typeof SUPPORTED_LOGICAL_OPERATORS)[number];

export const CONDITION_TYPES = {
  TAG_HAS: 'tag_has',
  TAG_MISSING: 'tag_missing',
  CONTACT_FIELD: 'contact_field',
  CONTACT_UNSUBSCRIBED: 'contact_unsubscribed',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',
} as const;

export const SUPPORTED_CONDITION_TYPES = [
  CONDITION_TYPES.TAG_HAS,
  CONDITION_TYPES.TAG_MISSING,
  CONDITION_TYPES.CONTACT_FIELD,
  CONDITION_TYPES.CONTACT_UNSUBSCRIBED,
  CONDITION_TYPES.TAG_ADDED,
  CONDITION_TYPES.TAG_REMOVED,
  CONDITION_TYPES.EMAIL_OPENED,
  CONDITION_TYPES.EMAIL_CLICKED,
] as const;

export const CONDITION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
} as const;

export const SUPPORTED_CONDITION_OPERATORS = [
  CONDITION_OPERATORS.EQUALS,
  CONDITION_OPERATORS.NOT_EQUALS,
  CONDITION_OPERATORS.CONTAINS,
] as const;

export const SUPPORTED_STEP_ACTIONS = [
  STEP_ACTIONS.DELAY,
  STEP_ACTIONS.SEND_EMAIL,
  STEP_ACTIONS.ATTACH_TAG,
  STEP_ACTIONS.DETACH_TAG,
  STEP_ACTIONS.UNSUBSCRIBE_CONTACT,
  STEP_ACTIONS.DELETE_CONTACT,
  STEP_ACTIONS.CONDITIONAL_SPLIT,
  STEP_ACTIONS.WEBHOOK,
] as const;

export const TRIGGER_EVENTS = {
  CONTACT_SUBSCRIBED: 'contact.subscribed',
  CONTACT_UNSUBSCRIBED: 'contact.unsubscribed',
  TAG_ATTACHED: 'tag.attached',
  TAG_DETACHED: 'tag.detached',
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_COMPLAINED: 'email.complained',
  EMAIL_OPENED: 'email.opened',
  EMAIL_LINK_CLICKED: 'email.link_clicked',
  FORM_SUBMITTED: 'form.submitted',
  CUSTOM_EVENT: 'custom.event',
} as const;

export const SUPPORTED_TRIGGER_EVENTS = [
  TRIGGER_EVENTS.CONTACT_SUBSCRIBED,
  TRIGGER_EVENTS.CONTACT_UNSUBSCRIBED,
  TRIGGER_EVENTS.TAG_ATTACHED,
  TRIGGER_EVENTS.TAG_DETACHED,
  TRIGGER_EVENTS.EMAIL_SENT,
  TRIGGER_EVENTS.EMAIL_DELIVERED,
  TRIGGER_EVENTS.EMAIL_BOUNCED,
  TRIGGER_EVENTS.EMAIL_COMPLAINED,
  TRIGGER_EVENTS.EMAIL_OPENED,
  TRIGGER_EVENTS.EMAIL_LINK_CLICKED,
  TRIGGER_EVENTS.FORM_SUBMITTED,
  TRIGGER_EVENTS.CUSTOM_EVENT,
] as const;

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;

export const WorkflowResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isActive: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activatedAt: z.string().optional().nullable(),
});

export type WorkflowResponse = z.infer<typeof WorkflowResponseSchema>;

export const CreateWorkflowTriggerSchema = z.object({
  event: z.enum(SUPPORTED_TRIGGER_EVENTS),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type CreateWorkflowTriggerDto = z.infer<typeof CreateWorkflowTriggerSchema>;

export const UpdateWorkflowTriggerSchema = z.object({
  event: z.enum(SUPPORTED_TRIGGER_EVENTS).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateWorkflowTriggerDto = z.infer<typeof UpdateWorkflowTriggerSchema>;

export const WorkflowTriggerResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  event: z.string(),
  filters: z.record(z.string(), z.unknown()).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowTriggerResponse = z.infer<typeof WorkflowTriggerResponseSchema>;

export const TIME_UNITS = {
  MINUTES: 'minutes',
  HOURS: 'hours',
  DAYS: 'days',
  WEEKS: 'weeks',
} as const;

export const SUPPORTED_TIME_UNITS = [
  TIME_UNITS.MINUTES,
  TIME_UNITS.HOURS,
  TIME_UNITS.DAYS,
  TIME_UNITS.WEEKS,
] as const;

export const DelayConfigSchema = z.discriminatedUnion('unit', [
  z.object({
    unit: z.literal(TIME_UNITS.MINUTES),
    amount: z.coerce
      .number()
      .min(15, { message: 'Minimum delay is 15 minutes' })
      .multipleOf(15, { message: 'Delay in minutes must be a multiple of 15' }),
  }),
  z.object({
    unit: z.literal(TIME_UNITS.HOURS),
    amount: z.coerce.number().min(1, { message: 'Minimum delay is 1 hour' }),
  }),
  z.object({
    unit: z.literal(TIME_UNITS.DAYS),
    amount: z.coerce.number().min(1, { message: 'Minimum delay is 1 day' }),
  }),
  z.object({
    unit: z.literal(TIME_UNITS.WEEKS),
    amount: z.coerce.number().min(1, { message: 'Minimum delay is 1 week' }),
  }),
]);

const BaseStepSchema = z.object({
  parentWorkflowStepId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional(),
  trueStepId: z.string().uuid().optional().nullable(),
  falseStepId: z.string().uuid().optional().nullable(),
});

const NonDelayActions = [
  STEP_ACTIONS.SEND_EMAIL,
  STEP_ACTIONS.ATTACH_TAG,
  STEP_ACTIONS.DETACH_TAG,
  STEP_ACTIONS.UNSUBSCRIBE_CONTACT,
  STEP_ACTIONS.DELETE_CONTACT,
  STEP_ACTIONS.CONDITIONAL_SPLIT,
  STEP_ACTIONS.WEBHOOK,
] as const;

export const CreateWorkflowStepSchema = z.intersection(
  BaseStepSchema,
  z.union([
    z.object({
      action: z.literal(STEP_ACTIONS.DELAY),
      config: DelayConfigSchema,
    }),
    z.object({
      action: z.enum(NonDelayActions),
      config: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);

export type CreateWorkflowStepDto = z.infer<typeof CreateWorkflowStepSchema>;

export const UpdateWorkflowStepSchema = z.intersection(
  BaseStepSchema,
  z.union([
    z.object({
      action: z.literal(STEP_ACTIONS.DELAY),
      config: DelayConfigSchema.optional(),
    }),
    z.object({
      action: z.enum(NonDelayActions),
      config: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
      action: z.undefined().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);

export type UpdateWorkflowStepDto = z.infer<typeof UpdateWorkflowStepSchema>;

export const ReorderWorkflowStepSchema = z.object({
  parentId: z.string().uuid().nullable(),
  branch: z.union([z.literal('linear'), z.boolean()]),
});

export type ReorderWorkflowStepDto = z.infer<typeof ReorderWorkflowStepSchema>;

export const WorkflowStepResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  parentWorkflowStepId: z.string().uuid().optional().nullable(),
  action: z.string(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
  position: z.number().int(),
  trueStepId: z.string().uuid().optional().nullable(),
  falseStepId: z.string().uuid().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowStepResponse = z.infer<typeof WorkflowStepResponseSchema>;

export const CreateWorkflowExitConditionSchema = z.object({
  logicalOperator: z.enum(SUPPORTED_LOGICAL_OPERATORS),
  type: z.string().min(1).max(50),
  resource: z.string().min(1).max(255),
  operator: z.string().min(1).max(50),
  value: z.string().optional().nullable(),
});

export type CreateWorkflowExitConditionDto = z.infer<typeof CreateWorkflowExitConditionSchema>;

export const UpdateWorkflowExitConditionSchema = z.object({
  logicalOperator: z.enum(SUPPORTED_LOGICAL_OPERATORS).optional(),
  type: z.string().min(1).max(50).optional(),
  resource: z.string().min(1).max(255).optional(),
  operator: z.string().min(1).max(50).optional(),
  value: z.string().optional().nullable(),
});

export type UpdateWorkflowExitConditionDto = z.infer<typeof UpdateWorkflowExitConditionSchema>;

export const WorkflowExitConditionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowId: z.string().uuid(),
  logicalOperator: z.string(),
  type: z.string(),
  resource: z.string(),
  operator: z.string(),
  value: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowExitConditionResponse = z.infer<typeof WorkflowExitConditionResponseSchema>;

export const CreateWorkflowStepConditionSchema = z.object({
  logicalOperator: z.enum(SUPPORTED_LOGICAL_OPERATORS),
  type: z.string().min(1).max(50),
  resource: z.string().min(1).max(255),
  operator: z.string().min(1).max(50),
  value: z.string().optional().nullable(),
});

export type CreateWorkflowStepConditionDto = z.infer<typeof CreateWorkflowStepConditionSchema>;

export const WorkflowStepConditionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  workflowStepId: z.string().uuid(),
  logicalOperator: z.string(),
  type: z.string(),
  resource: z.string(),
  operator: z.string(),
  value: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowStepConditionResponse = z.infer<typeof WorkflowStepConditionResponseSchema>;

export const EmailTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(998),
  html: z.string().min(1),
  text: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional().nullable(),
});

export type EmailTemplateResponse = z.infer<typeof EmailTemplateSchema>;

export const CreateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(998),
  html: z.string().min(1),
  text: z.string().optional().nullable(),
});

export type CreateEmailTemplateDto = z.infer<typeof CreateEmailTemplateSchema>;

export const UpdateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(998).optional(),
  html: z.string().min(1).optional(),
  text: z.string().optional().nullable(),
});

export type UpdateEmailTemplateDto = z.infer<typeof UpdateEmailTemplateSchema>;

export const TriggerFormSchema = z.object({
  event: z.string().min(1, 'Event is required'),
  tagId: z.string().optional(),
});

export type TriggerFormData = z.infer<typeof TriggerFormSchema>;

export const StepFormSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  configString: z.string().optional(),
  config: z
    .object({
      amount: z.union([z.number(), z.string()]).optional(),
      unit: z.string().optional(),
      templateId: z.string().optional(),
      tagId: z.string().optional(),
    })
    .catchall(z.unknown())
    .optional(),
});

export type StepFormData = z.infer<typeof StepFormSchema>;
