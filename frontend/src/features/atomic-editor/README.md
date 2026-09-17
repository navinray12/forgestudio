# Atomic Editor

Coordinate existing atomic editing features, including classes, variables, loops and reusable components.

Components render the interface; hooks coordinate state; services and persistence adapters perform I/O; types describe contracts. Follow the files that exist here rather than adding empty layers.

| File | Responsibility |
| --- | --- |
| [components/AtomicEditor.tsx](components/AtomicEditor.tsx) | Atomic editor feature: Atomic Editor. Keep feature UI, hooks, services and types in this module. |
| [components/AtomicEditorContent.tsx](components/AtomicEditorContent.tsx) | Atomic editor feature: Atomic Editor Content. Keep feature UI, hooks, services and types in this module. |
| [components/AtomicEditorNavigation.tsx](components/AtomicEditorNavigation.tsx) | Atomic editor feature: Atomic Editor Navigation. Keep feature UI, hooks, services and types in this module. |
| [components/AtomicFormPanel.tsx](components/AtomicFormPanel.tsx) | Atomic editor feature: Atomic Form Panel. Keep feature UI, hooks, services and types in this module. |
| [components/AtomicGridPanel.tsx](components/AtomicGridPanel.tsx) | Atomic editor feature: Atomic Grid Panel. Keep feature UI, hooks, services and types in this module. |
| [components/AtomicLoopPanel.tsx](components/AtomicLoopPanel.tsx) | Atomic editor feature: Atomic Loop Panel. Keep feature UI, hooks, services and types in this module. |
| [components/ClassFormModal.tsx](components/ClassFormModal.tsx) | Atomic editor feature: Class Form Modal. Keep feature UI, hooks, services and types in this module. |
| [components/ClassesPanel.tsx](components/ClassesPanel.tsx) | Atomic editor feature: Classes Panel. Keep feature UI, hooks, services and types in this module. |
| [components/ComponentPropertyLockModal.tsx](components/ComponentPropertyLockModal.tsx) | Atomic editor feature: Component Property Lock Modal. Keep feature UI, hooks, services and types in this module. |
| [components/ControlledComponentEditor.tsx](components/ControlledComponentEditor.tsx) | Atomic editor feature: Controlled Component Editor. Keep feature UI, hooks, services and types in this module. |
| [components/DeleteClassConfirmModal.tsx](components/DeleteClassConfirmModal.tsx) | Atomic editor feature: Delete Class Confirm Modal. Keep feature UI, hooks, services and types in this module. |
| [components/DeleteComponentConfirmModal.tsx](components/DeleteComponentConfirmModal.tsx) | Atomic editor feature: Delete Component Confirm Modal. Keep feature UI, hooks, services and types in this module. |
| [components/DeleteGlobalElementConfirmModal.tsx](components/DeleteGlobalElementConfirmModal.tsx) | Atomic editor feature: Delete Global Element Confirm Modal. Keep feature UI, hooks, services and types in this module. |
| [components/DeleteVariableConfirmModal.tsx](components/DeleteVariableConfirmModal.tsx) | Atomic editor feature: Delete Variable Confirm Modal. Keep feature UI, hooks, services and types in this module. |
| [components/FormFieldList.tsx](components/FormFieldList.tsx) | Atomic editor feature: Form Field List. Keep feature UI, hooks, services and types in this module. |
| [components/FormFieldSettings.tsx](components/FormFieldSettings.tsx) | Atomic editor feature: Form Field Settings. Keep feature UI, hooks, services and types in this module. |
| [components/FormPreview.tsx](components/FormPreview.tsx) | Atomic editor feature: Form Preview. Keep feature UI, hooks, services and types in this module. |
| [components/FormSubmissionSettings.tsx](components/FormSubmissionSettings.tsx) | Atomic editor feature: Form Submission Settings. Keep feature UI, hooks, services and types in this module. |
| [components/GlobalElementFormModal.tsx](components/GlobalElementFormModal.tsx) | Atomic editor feature: Global Element Form Modal. Keep feature UI, hooks, services and types in this module. |
| [components/GlobalElementsPanel.tsx](components/GlobalElementsPanel.tsx) | Atomic editor feature: Global Elements Panel. Keep feature UI, hooks, services and types in this module. |
| [components/GridItemSettings.tsx](components/GridItemSettings.tsx) | Atomic editor feature: Grid Item Settings. Keep feature UI, hooks, services and types in this module. |
| [components/GridSettings.tsx](components/GridSettings.tsx) | Atomic editor feature: Grid Settings. Keep feature UI, hooks, services and types in this module. |
| [components/GridVisualizer.tsx](components/GridVisualizer.tsx) | Atomic editor feature: Grid Visualizer. Keep feature UI, hooks, services and types in this module. |
| [components/ImportClassesModal.tsx](components/ImportClassesModal.tsx) | Atomic editor feature: Import Classes Modal. Keep feature UI, hooks, services and types in this module. |
| [components/ImportVariablesModal.tsx](components/ImportVariablesModal.tsx) | Atomic editor feature: Import Variables Modal. Keep feature UI, hooks, services and types in this module. |
| [components/LoopDataSourceSelector.tsx](components/LoopDataSourceSelector.tsx) | Atomic editor feature: Loop Data Source Selector. Keep feature UI, hooks, services and types in this module. |
| [components/LoopItemSettings.tsx](components/LoopItemSettings.tsx) | Atomic editor feature: Loop Item Settings. Keep feature UI, hooks, services and types in this module. |
| [components/LoopPreview.tsx](components/LoopPreview.tsx) | Atomic editor feature: Loop Preview. Keep feature UI, hooks, services and types in this module. |
| [components/ReusableComponentFormModal.tsx](components/ReusableComponentFormModal.tsx) | Atomic editor feature: Reusable Component Form Modal. Keep feature UI, hooks, services and types in this module. |
| [components/ReusableComponentsPanel.tsx](components/ReusableComponentsPanel.tsx) | Atomic editor feature: Reusable Components Panel. Keep feature UI, hooks, services and types in this module. |
| [components/VariableFormModal.tsx](components/VariableFormModal.tsx) | Atomic editor feature: Variable Form Modal. Keep feature UI, hooks, services and types in this module. |
| [components/VariableReferenceControl.tsx](components/VariableReferenceControl.tsx) | Atomic editor feature: Variable Reference Control. Keep feature UI, hooks, services and types in this module. |
| [components/VariablesPanel.tsx](components/VariablesPanel.tsx) | Atomic editor feature: Variables Panel. Keep feature UI, hooks, services and types in this module. |
| [hooks/useAtomicEditor.ts](hooks/useAtomicEditor.ts) | Atomic editor feature: use Atomic Editor. Keep feature UI, hooks, services and types in this module. |
| [hooks/useAtomicForm.ts](hooks/useAtomicForm.ts) | Atomic editor feature: use Atomic Form. Keep feature UI, hooks, services and types in this module. |
| [hooks/useAtomicGrid.ts](hooks/useAtomicGrid.ts) | Atomic editor feature: use Atomic Grid. Keep feature UI, hooks, services and types in this module. |
| [hooks/useAtomicLoop.ts](hooks/useAtomicLoop.ts) | Atomic editor feature: use Atomic Loop. Keep feature UI, hooks, services and types in this module. |
| [hooks/useClasses.ts](hooks/useClasses.ts) | Atomic editor feature: use Classes. Keep feature UI, hooks, services and types in this module. |
| [hooks/useControlledComponent.ts](hooks/useControlledComponent.ts) | Atomic editor feature: use Controlled Component. Keep feature UI, hooks, services and types in this module. |
| [hooks/useGlobalElements.ts](hooks/useGlobalElements.ts) | Atomic editor feature: use Global Elements. Keep feature UI, hooks, services and types in this module. |
| [hooks/useReusableComponents.ts](hooks/useReusableComponents.ts) | Atomic editor feature: use Reusable Components. Keep feature UI, hooks, services and types in this module. |
| [hooks/useVariables.ts](hooks/useVariables.ts) | Atomic editor feature: use Variables. Keep feature UI, hooks, services and types in this module. |
| [index.ts](index.ts) | Atomic editor feature: index. Keep feature UI, hooks, services and types in this module. |
| [services/atomicEditorService.ts](services/atomicEditorService.ts) | Atomic editor feature: atomic Editor Service. Keep feature UI, hooks, services and types in this module. |
| [services/atomicFormService.ts](services/atomicFormService.ts) | Atomic editor feature: atomic Form Service. Keep feature UI, hooks, services and types in this module. |
| [services/atomicGridService.ts](services/atomicGridService.ts) | Atomic editor feature: atomic Grid Service. Keep feature UI, hooks, services and types in this module. |
| [services/atomicLoopService.ts](services/atomicLoopService.ts) | Atomic editor feature: atomic Loop Service. Keep feature UI, hooks, services and types in this module. |
| [services/classService.ts](services/classService.ts) | Atomic editor feature: class Service. Keep feature UI, hooks, services and types in this module. |
| [services/controlledComponentService.ts](services/controlledComponentService.ts) | Atomic editor feature: controlled Component Service. Keep feature UI, hooks, services and types in this module. |
| [services/globalElementService.ts](services/globalElementService.ts) | Atomic editor feature: global Element Service. Keep feature UI, hooks, services and types in this module. |
| [services/reusableComponentService.ts](services/reusableComponentService.ts) | Atomic editor feature: reusable Component Service. Keep feature UI, hooks, services and types in this module. |
| [services/variableService.ts](services/variableService.ts) | Atomic editor feature: variable Service. Keep feature UI, hooks, services and types in this module. |
| [types/atomicEditor.types.ts](types/atomicEditor.types.ts) | Atomic editor feature: atomic Editor types. Keep feature UI, hooks, services and types in this module. |
| [types/atomicForm.types.ts](types/atomicForm.types.ts) | Atomic editor feature: atomic Form types. Keep feature UI, hooks, services and types in this module. |
| [types/atomicGrid.types.ts](types/atomicGrid.types.ts) | Atomic editor feature: atomic Grid types. Keep feature UI, hooks, services and types in this module. |
| [types/atomicLoop.types.ts](types/atomicLoop.types.ts) | Atomic editor feature: atomic Loop types. Keep feature UI, hooks, services and types in this module. |
| [types/classExportImport.types.ts](types/classExportImport.types.ts) | Atomic editor feature: class Export Import types. Keep feature UI, hooks, services and types in this module. |
| [types/classes.types.ts](types/classes.types.ts) | Atomic editor feature: classes types. Keep feature UI, hooks, services and types in this module. |
| [types/controlledComponent.types.ts](types/controlledComponent.types.ts) | Atomic editor feature: controlled Component types. Keep feature UI, hooks, services and types in this module. |
| [types/globalElements.types.ts](types/globalElements.types.ts) | Atomic editor feature: global Elements types. Keep feature UI, hooks, services and types in this module. |
| [types/reusableComponents.types.ts](types/reusableComponents.types.ts) | Atomic editor feature: reusable Components types. Keep feature UI, hooks, services and types in this module. |
| [types/variableClassSync.types.ts](types/variableClassSync.types.ts) | Atomic editor feature: variable Class Sync types. Keep feature UI, hooks, services and types in this module. |
| [types/variableExportImport.types.ts](types/variableExportImport.types.ts) | Atomic editor feature: variable Export Import types. Keep feature UI, hooks, services and types in this module. |
| [types/variables.types.ts](types/variables.types.ts) | Atomic editor feature: variables types. Keep feature UI, hooks, services and types in this module. |
| [utils/class.utils.ts](utils/class.utils.ts) | Atomic editor feature: class utils. Keep feature UI, hooks, services and types in this module. |
| [utils/classExportImport.utils.ts](utils/classExportImport.utils.ts) | Atomic editor feature: class Export Import utils. Keep feature UI, hooks, services and types in this module. |
| [utils/componentOverride.utils.ts](utils/componentOverride.utils.ts) | Atomic editor feature: component Override utils. Keep feature UI, hooks, services and types in this module. |
| [utils/formField.utils.ts](utils/formField.utils.ts) | Atomic editor feature: form Field utils. Keep feature UI, hooks, services and types in this module. |
| [utils/formValidation.utils.ts](utils/formValidation.utils.ts) | Atomic editor feature: form Validation utils. Keep feature UI, hooks, services and types in this module. |
| [utils/gridLayout.utils.ts](utils/gridLayout.utils.ts) | Atomic editor feature: grid Layout utils. Keep feature UI, hooks, services and types in this module. |
| [utils/gridValidation.utils.ts](utils/gridValidation.utils.ts) | Atomic editor feature: grid Validation utils. Keep feature UI, hooks, services and types in this module. |
| [utils/loopData.utils.ts](utils/loopData.utils.ts) | Atomic editor feature: loop Data utils. Keep feature UI, hooks, services and types in this module. |
| [utils/loopValidation.utils.ts](utils/loopValidation.utils.ts) | Atomic editor feature: loop Validation utils. Keep feature UI, hooks, services and types in this module. |
| [utils/variable.utils.ts](utils/variable.utils.ts) | Atomic editor feature: variable utils. Keep feature UI, hooks, services and types in this module. |
| [utils/variableClassResolver.ts](utils/variableClassResolver.ts) | Atomic editor feature: variable Class Resolver. Keep feature UI, hooks, services and types in this module. |
| [utils/variableExportImport.utils.ts](utils/variableExportImport.utils.ts) | Atomic editor feature: variable Export Import utils. Keep feature UI, hooks, services and types in this module. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
