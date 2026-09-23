# Autosave

Connect editor changes to the shared save coordinator, cloud persistence and browser recovery.

Components render the interface; hooks coordinate state; services and persistence adapters perform I/O; types describe contracts. Follow the files that exist here rather than adding empty layers.

| File | Responsibility |
| --- | --- |
| [components/AutosaveStatus.tsx](components/AutosaveStatus.tsx) | Autosave feature: Autosave Status. Keep feature UI, hooks, services and types in this module. |
| [components/DraftRecoveryTools.tsx](components/DraftRecoveryTools.tsx) | Autosave feature: Draft Recovery Tools. Keep feature UI, hooks, services and types in this module. |
| [hooks/useAutosave.ts](hooks/useAutosave.ts) | Autosave feature: use Autosave. Keep feature UI, hooks, services and types in this module. |
| [index.ts](index.ts) | Autosave feature: index. Keep feature UI, hooks, services and types in this module. |
| [persistence/cloud-draft-adapter.ts](persistence/cloud-draft-adapter.ts) | Autosave feature: cloud draft adapter. Keep feature UI, hooks, services and types in this module. |
| [persistence/local-recovery-store.ts](persistence/local-recovery-store.ts) | Autosave feature: local recovery store. Keep feature UI, hooks, services and types in this module. |
| [types/autosave.types.ts](types/autosave.types.ts) | Autosave feature: autosave types. Keep feature UI, hooks, services and types in this module. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
