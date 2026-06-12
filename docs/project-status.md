# Project Status

## Current Phase

Phase 3: Runtime Core completed.

Phase 4: Core Actions completed.

Phase 5: Frontend Builder in progress.

## Completed

- Created monorepo planning directory.
- Added architecture plan.
- Added open-source scope.
- Added data model plan.
- Added API spec.
- Added worker flow.
- Added frontend builder plan.
- Added Terraform plan.
- Added testing strategy.
- Added queue and cache plan.
- Added edge-case catalog.
- Added development workflow.
- Added engineering rules.
- Added contributing guide.
- Added roadmap.
- Renamed project to Email Automation Engine.
- Confirmed AWS-first deployment direction.
- Confirmed no dependency on external private codebases or copied private implementation details.
- Confirmed MIT license.
- Confirmed PostgreSQL-only database target.
- Confirmed Redis for cache/coordination support.
- Confirmed AWS SES email step from day one.
- Confirmed frontend stack: Vite, React, Tailwind CSS, shadcn/ui, React Flow, TanStack Query, React Hook Form, and Zod.
- Confirmed raw HTML editor plus WYSIWYG editor for email content; no drag-and-drop email builder in the first version.
- Confirmed tenant creation and management from UI.
- Added simple user auth and modular tenant permission plan with dynamic tenant roles and role-permission mappings.
- Confirmed the tenant creator is tracked on the tenant record for ownership and recovery, without adding a separate root membership flag.
- Confirmed the app should create a full-permission tenant role as a starting point while keeping normal authorization permission-based, not role-name-based.
- Confirmed SES event tracking is in scope for v1, including delivery, bounce, complaint, open, and click events without app-owned tracking pixels or click redirects.
- Confirmed one private/internal workspace package: `packages/shared`; no package publishing scope needed.
- Confirmed GitHub Actions with PostgreSQL service containers for CI.
- Confirmed Terraform will not create PostgreSQL/Redis by default; it will accept externally managed connection values.
- Confirmed Node.js 24 runtime, pnpm package manager, and bounded Turborepo task orchestration.
- Completed final documentation consistency pass before scaffolding.
- Cleaned public documentation tone so it reads like maintained project documentation, not draft planning notes.
- Scaffolded pnpm workspace with Node.js 24 configuration.
- Added Turborepo task orchestration for build, test, lint, format check, integration test, and typecheck.
- Added root TypeScript, ESLint, Prettier, ignore, and package manager configuration.
- Created `apps/api`, `apps/web`, `apps/worker`, `packages/shared`, and `infra/terraform`.
- Added a NestJS API skeleton with infrastructure, config, database, pipe, and workflow module boundaries.
- Added Joi environment validation and PostgreSQL TypeORM config with snake_case naming and schema sync disabled.
- Added a shared Zod validation pipe for API DTO validation.
- Added `packages/shared` as a private internal workspace package with pure shared constants, schemas, and versioned queue envelope contract.
- Added a minimal worker package with typed health scaffold.
- Added a minimal Vite React web package scaffold.
- Added Terraform foundation files with product-neutral variables and provider constraints.
- Added initial unit/contract tests for shared queue envelopes, API health, worker health, and web scaffold.
- Generated `pnpm-lock.yaml`.
- Implemented the first API domain slice for tenant creation and management:
  - Created TypeORM-backed repository implementations for User, Tenant, Role, and TenantMembership.
  - Implemented AuthController and TenantController endpoints with shared Zod schema parsing.
  - Created AuthGuard, TenantMembershipGuard, and PermissionsGuard with @RequirePermissions and @CurrentTenant/CurrentUser decorators.
  - Bundled all components into a clean IamModule registered in the root AppModule.
  - Added unit tests for AuthService, TenantService, AuthController, TenantController, AuthGuard, TenantMembershipGuard, and PermissionsGuard.
  - Resolved strict compiler checks and ESLint issues for type safety.
- Implemented the core workflow management slice:
  - Created Workflow, WorkflowTrigger, WorkflowStep, and WorkflowExitCondition domain aggregates with TypeORM entities.
  - Created repository interfaces and TypeORM implementations for all workflow domain objects.
  - Created database migration for workflows, workflow_triggers, workflow_steps, and workflow_exit_conditions tables with foreign keys and cascade rules.
  - Implemented WorkflowService with full CRUD for workflows, triggers, steps, and exit conditions.
  - Implemented step reorder with duplicate ID protection and transaction support.
  - Implemented activation validation: at least one trigger, at least one step, delay requires amount and unit, delay cannot be final step, conditional_split requires true/false routing, email steps require template/subject, tag steps require tagId, webhook steps require URL.
  - Implemented deactivation with idempotent behavior.
  - Implemented findStep for individual step retrieval.
  - Implemented exit condition management with GET, PUT (replace all), POST (add), PATCH (update), and DELETE endpoints.
  - Created WorkflowController with all endpoints using correct HTTP methods (PATCH for updates, POST for creation, PUT for exit condition replacement).
  - Added Zod validation schemas in shared package with z.enum() for trigger events and step actions.
  - Exported SUPPORTED_STEP_ACTIONS and SUPPORTED_TRIGGER_EVENTS constants.
  - Registered all providers in WorkflowModule with Symbol-based DI tokens.
  - Added comprehensive unit tests for WorkflowService and WorkflowController.

- Implemented the Event Ingestion and core execution loop for traversing active workflow steps using SQS:
  - Created POST `/automation/events` API endpoint for generic event ingestion.
  - Implemented trigger matching to find active workflows matching incoming events.
  - Defined Zod schemas and queue message contracts in `packages/shared` for core workflow execution (automation events, waiting steps, finished steps).
  - Implemented `start-workflows` worker handler.
  - Implemented `start-workflow-steps` worker handler with delay processing.
  - Implemented `finish-workflow-steps` worker handler with exit conditions check.
  - Implemented `watch-workflow-steps` worker handler to manage delayed steps.
  - Fixed workflow trigger entity relations and added integration tests for trigger matching.
  - Added worker idempotency and partial batch failure mechanisms for the `start-workflows` handler (needs to be expanded to other handlers).

- Implemented Phase 4 Core Actions (AWS SES email step, webhook, conditional split, email tracking):
  - Created email module with full CRUD for email templates (TypeORM entities, repository, service, controller).
  - Added 5 database migrations for `email_templates`, `email_messages`, `email_events`, `workflow_step_conditions`, and `webhook_deliveries` tables.
  - Developed 5 queue message contracts and Zod schemas (`email-step`, `conditional-split`, `email-tracking-event`, `webhook-step`, `webhook-delivery`).
  - Implemented `send-workflow-email` handler with SES integration, idempotent message tracking, and template resolution.
  - Implemented `conditional-split` handler evaluating tag, tag_missing, and contact_field conditions.
  - Implemented `process-email-tracking-event` handler storing email events and updating message aggregate timestamps.
  - Implemented `webhook-step` handler creating delivery records and enqueuing webhook delivery work.
  - Implemented `call-webhook` handler performing HTTP requests with timeout, recording response status and body.
  - Built SES webhook controller at `POST /webhooks/ses` with event type mapping (PascalCase → lowercase).
  - Added activation validation for email, webhook, and conditional split steps (SSRF protection, template existence checks, condition validation).
  - Updated worker config with all queue URLs and `FROM_EMAIL_ADDRESS`.
  - Switched all UUID generation to time-ordered v7 for better index performance.
  - Added spec files and contract tests for all 5 new handlers and 5 new message schemas.
  - All 5 gates pass: format, lint, typecheck, test, build.

- Implemented Phase 5 Frontend Builder foundations:
  - Standardized Lucide React icons across all modals and components.
  - Built domain-driven React Query hooks (`useWorkflow`, `useWorkflowSteps`, `useWorkflowTriggers`) to decouple data fetching and mutations from UI.
  - Refactored `WorkflowBuilder.tsx` to operate purely as a React Flow graph orchestrator.
  - Extracted dynamic UI form schemas (`StepFormSchema`, `TriggerFormSchema`) directly into `@email-automation-engine/shared` Zod contracts to ensure full "Write Once, Validate Everywhere" parity between the API payload and React Hook Form.
  - Eradicated all `any` casting and generic hacks from builder form validation.
  - Stripped out redundant backend validation methods (`validateDelayConfig`) because the Zod validation pipes fully process the shared schemas automatically.

## Blockers

- None.

## Last Test Commands

- `pnpm build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm format:check`
- Open-source safety scan over scaffold files for private identifiers, cloud account identifiers, secrets, and unsafe infrastructure examples.

`terraform fmt -check -recursive infra/terraform` was attempted, but the Terraform CLI is not installed in this environment.

## Known Failing Tests

- None.

## Files Touched In Current Planning Task

- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `docs/open-source-scope.md`
- `docs/architecture.md`
- `docs/data-model.md`
- `docs/api-spec.md`
- `docs/auth-and-permissions.md`
- `docs/worker-flow.md`
- `docs/frontend-builder.md`
- `docs/terraform.md`
- `docs/tooling.md`
- `docs/queue-and-cache.md`
- `docs/edge-cases.md`
- `docs/testing.md`
- `docs/development-workflow.md`
- `docs/engineering-rules.md`
- `docs/roadmap.md`
- `docs/project-status.md`
- `.gitignore`
- `.node-version`
- `.npmrc`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc.json`
- `eslint.config.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `tsconfig.json`
- `turbo.json`
- `apps/api`
- `apps/web`
- `apps/worker`
- `packages/shared`
- `infra/terraform`

## Next Exact Task

Continue Phase 5: Frontend Builder. We have completed the Workflow Builder UI refactor (domain-driven hooks, React Flow integration, Zod schema validation forms). Next is likely the workflow list view, tenant creation/management, and execution summary.
