import 'server-only';

import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { scoreConfig } from '@/db/schema';
import type { ScoreConfigSnapshot } from '@/lib/score-config';

export async function listScoreConfigs(): Promise<ScoreConfigSnapshot[]> {
  return db
    .select({
      year: scoreConfig.year,
      semester: scoreConfig.semester,
      category: scoreConfig.category,
      numExercises: scoreConfig.numExercises,
    })
    .from(scoreConfig)
    .orderBy(asc(scoreConfig.id));
}
