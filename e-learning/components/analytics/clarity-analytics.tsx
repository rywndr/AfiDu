'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';
import { usePathname } from 'next/navigation';

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
let initialized = false;

export type ClarityEvent =
  | 'assignment_start_clicked'
  | 'assignment_started'
  | 'assignment_start_failed'
  | 'assignment_draft_saved'
  | 'assignment_hand_in_clicked'
  | 'assignment_validation_failed'
  | 'assignment_handed_in'
  | 'assignment_hand_in_failed'
  | 'assignment_auto_handed_in'
  | 'teacher_module_created'
  | 'teacher_assignment_created'
  | 'teacher_submission_graded';

export function trackClarityEvent(event: ClarityEvent): void {
  if (!initialized) return;
  Clarity.event(event);
}

export function ClarityAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!projectId) return;

    if (!initialized) {
      Clarity.init(projectId);
      initialized = true;
    }

    const role = pathname.startsWith('/student')
      ? 'student'
      : pathname.startsWith('/teacher')
        ? 'teacher'
        : null;

    if (!role) return;

    Clarity.setTag('app', 'afidu-e-learning');
    Clarity.setTag('role', role);
    Clarity.setTag('study', 'thesis-heatmap-v1');
  }, [pathname]);

  return null;
}
