import type { WorkflowStep } from '@/types/document';

/**
 * The four moves that make a document. They are not a wizard - every panel is
 * always on screen - but naming the order helps somebody who has never made one
 * know what they are meant to do next.
 */
export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, label: 'Choose Document', focus: 'templates' },
  { id: 2, label: 'Fill in Details', focus: 'details' },
  { id: 3, label: 'Customize', focus: 'customise' },
  { id: 4, label: 'Review & Create', focus: 'export' },
];
