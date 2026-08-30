/**
 * Shapes the workspace needs that the document model does not already provide.
 *
 * Everything about a template - its name, badge, fields and accent - lives with
 * the templates themselves in `src/lib/templates`, so there is one definition
 * of a template rather than a real one and a decorative copy.
 */

export interface WorkflowStep {
  id: number;
  label: string;
  /** The panel this step is really about, so the stepper can open it. */
  focus: 'templates' | 'details' | 'customise' | 'export';
}

export type SettingsSectionId = 'information' | 'layout' | 'appearance' | 'questions';
