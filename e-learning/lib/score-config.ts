import {
  SCORE_TARGETS,
  type ScoreTarget,
  type Semester,
  type SubjectCategory,
} from '@/lib/choices';

export type ScoreConfigSnapshot = {
  year: number | null;
  semester: string | null;
  category: string | null;
  numExercises: number;
};

type ScorePeriod = {
  year: number | null;
  semester: Semester | null;
  category: SubjectCategory;
};

const DEFAULT_EXERCISE_COUNT = 5;

function matchesConfig(
  config: ScoreConfigSnapshot,
  period: ScorePeriod,
  scope: 'global' | 'year' | 'semester' | 'category',
): boolean {
  if (scope === 'global') {
    return config.year === null && config.semester === null && config.category === null;
  }
  if (scope === 'year') {
    return (
      config.year === period.year &&
      config.semester === null &&
      config.category === null
    );
  }
  if (scope === 'semester') {
    return (
      config.year === period.year &&
      config.semester === period.semester &&
      config.category === null
    );
  }
  return (
    config.year === period.year &&
    config.semester === period.semester &&
    config.category === period.category
  );
}

export function resolvedExerciseCount(
  configs: readonly ScoreConfigSnapshot[],
  period: ScorePeriod,
): number {
  const scopes = ['category', 'semester', 'year', 'global'] as const;
  for (const scope of scopes) {
    const config = configs.findLast((item) => matchesConfig(item, period, scope));
    if (config) return config.numExercises;
  }
  return DEFAULT_EXERCISE_COUNT;
}

export function exerciseSlot(target: ScoreTarget): number | null {
  if (!target.startsWith('exercise_')) return null;
  const slot = Number(target.slice('exercise_'.length));
  return Number.isInteger(slot) ? slot : null;
}

export function scoreTargetOptions(
  exerciseCount: number,
): readonly (typeof SCORE_TARGETS)[number][] {
  return SCORE_TARGETS.filter((target) => {
    const slot = exerciseSlot(target.value);
    return slot === null || slot <= exerciseCount;
  });
}

export function scoreTargetFitsConfig(
  target: ScoreTarget,
  exerciseCount: number,
): boolean {
  const slot = exerciseSlot(target);
  return slot === null || slot <= exerciseCount;
}
