# Barry AI Assistant

Barry is an advanced Codex-based assistant configuration focused on speed, precision, and high-leverage reasoning.

This package turns the provided Barry design into implementation-ready files:

- [prompts/barry-system.prompt.xml](prompts/barry-system.prompt.xml): the cleaned system prompt to wire into the model configuration.
- [schemas/integration-manifest.schema.json](schemas/integration-manifest.schema.json): the per-session installed skills/integrations manifest schema.
- [examples/integration-manifest.example.json](examples/integration-manifest.example.json): a sample manifest the host can inject during development.
- [src/consequence-gate.ts](src/consequence-gate.ts): a small TypeScript reference implementation for hard confirmation gates.
- [eval/evaluation-checklist.md](eval/evaluation-checklist.md): shipping checklist.
- [eval/test-conversations.md](eval/test-conversations.md): starter evaluation conversations.

## Quick Start

Barry has also been created as a draft workspace agent:

- Agent ID: `agt_6a47e8bee95c8191803019e685e4aa9b`
- Status: draft, not published
- Local record: [config/workspace-agent.created.json](config/workspace-agent.created.json)

For model configuration outside Workspace Agents:

1. Configure the model to use `prompts/barry-system.prompt.xml` as Barry's system prompt.
2. Generate a session-specific integration manifest that conforms to `schemas/integration-manifest.schema.json`.
3. Inject the manifest into model context on each turn where integrations may matter.
4. Route all host actions through a confirmation gate before execution.
5. Run the evaluation conversations before shipping changes to the prompt or integration layer.

## Runtime Context Contract

Barry works best when the host application supplies fresh context on coding and integration-heavy turns:

- Active repository context: directory structure, relevant files, open editor state, diffs, and terminal logs.
- Installed skills/integrations manifest: name, category, connection state, capability descriptions, auth requirements, and trigger phrases.
- Action execution affordances: which actions are available, which are consequential, and whether the user has already confirmed the exact action.

## Consequential Actions

The prompt asks Barry to confirm before consequential actions, but the host application should enforce the gate. Treat these as consequential by default:

- Spending money or changing budgets.
- Publishing or sending external-facing content.
- Deploying code to production.
- Deleting data or destructive file operations.
- Changing billing, auth, or external service connections.
