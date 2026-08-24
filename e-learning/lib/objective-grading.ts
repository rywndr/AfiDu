/**
 * Scoring the answers that carry an answer key.
 */
import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  question,
  questionChoice,
  submissionAnswer,
  submissionAnswerChoice,
} from '@/db/schema';
import { questionHasChoices } from '@/lib/choices';

/** One stored answer, with the question fields scoring depends on. */
export type ObjectiveAnswer = {
  id: number;
  questionId: number;
  kind: string;
  points: string;
  selectedChoiceId: number | null;
};

export type ObjectiveMark = {
  /** Null when the question has no correct option configured. */
  isCorrect: boolean | null;
  awardedPoints: number | null;
};

export type ObjectiveScores = {
  /** Every answer on the submission, whether or not it can be auto-scored. */
  answers: ObjectiveAnswer[];
  /** The marks for the choice answers only, keyed by answer id. */
  marks: Map<number, ObjectiveMark>;
  /**
   * The sum of the awarded points, or null when nothing could be scored at all.
   * An assignment of essays alone stays unscored rather than scoring zero.
   */
  autoScore: number | null;
};

export async function scoreObjectiveAnswers(
  submissionId: number,
): Promise<ObjectiveScores> {
  const answers = await db
    .select({
      id: submissionAnswer.id,
      questionId: submissionAnswer.questionId,
      selectedChoiceId: submissionAnswer.selectedChoiceId,
      kind: question.kind,
      points: question.points,
    })
    .from(submissionAnswer)
    .innerJoin(question, eq(submissionAnswer.questionId, question.id))
    .where(eq(submissionAnswer.submissionId, submissionId));

  const answerIds = answers.map((answer) => answer.id);
  const questionIds = answers.map((answer) => answer.questionId);

  const [choices, multiChoices] = await Promise.all([
    questionIds.length
      ? db
          .select({
            id: questionChoice.id,
            questionId: questionChoice.questionId,
            isCorrect: questionChoice.isCorrect,
          })
          .from(questionChoice)
          .where(inArray(questionChoice.questionId, questionIds))
      : [],
    answerIds.length
      ? db
          .select({
            answerId: submissionAnswerChoice.submissionAnswerId,
            choiceId: submissionAnswerChoice.questionChoiceId,
          })
          .from(submissionAnswerChoice)
          .where(inArray(submissionAnswerChoice.submissionAnswerId, answerIds))
      : [],
  ]);

  const correctByQuestion = groupIds(
    choices.filter((choice) => choice.isCorrect),
    (choice) => [choice.questionId, choice.id],
  );
  const chosenByAnswer = groupIds(multiChoices, (link) => [
    link.answerId,
    link.choiceId,
  ]);

  const marks = new Map<number, ObjectiveMark>();
  let autoScore: number | null = null;

  for (const answer of answers) {
    if (!questionHasChoices(answer.kind)) continue;

    const correct = correctByQuestion.get(answer.questionId);
    if (!correct || correct.size === 0) {
      marks.set(answer.id, { isCorrect: null, awardedPoints: null });
      continue;
    }

    const chosen =
      answer.kind === 'multi_select'
        ? (chosenByAnswer.get(answer.id) ?? new Set<number>())
        : new Set(answer.selectedChoiceId === null ? [] : [answer.selectedChoiceId]);

    const isCorrect =
      chosen.size === correct.size && [...chosen].every((id) => correct.has(id));
    const awardedPoints = isCorrect ? Number(answer.points) : 0;

    marks.set(answer.id, { isCorrect, awardedPoints });
    autoScore = (autoScore ?? 0) + awardedPoints;
  }

  return { answers, marks, autoScore };
}

/** Collect `[key, id]` pairs into a set of ids per key. */
function groupIds<T>(rows: T[], pair: (row: T) => [number, number]) {
  const grouped = new Map<number, Set<number>>();
  for (const row of rows) {
    const [key, id] = pair(row);
    const existing = grouped.get(key);
    if (existing) existing.add(id);
    else grouped.set(key, new Set([id]));
  }
  return grouped;
}
