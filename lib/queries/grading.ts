import { db } from "@/lib/db";
import { assignments, assignmentScores } from "@/lib/db/schema/grading";
import {
    periods,
    classSubjects,
    classes,
    classStudents,
    subjects,
} from "@/lib/db/schema/classes";
import { students } from "@/lib/db/schema/students";
import { semesters, academicYears } from "@/lib/db/schema/academics";
import { user } from "@/lib/db/schema/auth";
import { eq, asc, and, or } from "drizzle-orm";
import { evaluateFormula, buildVariableContext } from "@/lib/formula-engine";
import type {
    Assignment,
    AssignmentScore,
    FormulaConfig,
    GradebookData,
    GradebookRow,
    Period,
    Student,
    StudentReport,
    StudentReportSubject,
    StudentReportPeriod,
    StudentReportAssignment,
    ReportIndexRow,
} from "@/lib/types";

// Formula helpers
function parseFormulaConfig(raw: string | null): FormulaConfig {
    if (!raw) return { type: "average" };
    try {
        return JSON.parse(raw) as FormulaConfig;
    } catch {
        return { type: "average" };
    }
}

/**
 * Compute a single number for a period given its formula config and
 * the scored assignments (assignments that have a non-null score).
 *
 * Returns `{ total, result }` where:
 *   - `total` is always the raw sum of scores
 *   - `result` is the computed value based on the formula type
 *     (average = total/count, sum = total, weighted = weighted sum,
 *      custom = evaluated expression)
 *
 * For custom formulas, an optional `assignmentNames` map can be provided
 * to resolve variable names from assignment IDs.
 */
function computePeriodScore(
    formula: FormulaConfig,
    scoredAssignments: {
        assignmentId: string;
        score: number;
        maxScore: number;
    }[],
    assignmentNames?: Record<string, string>,
): { total: number; result: number } | null {
    if (scoredAssignments.length === 0) return null;

    const total = scoredAssignments.reduce((sum, a) => sum + a.score, 0);

    switch (formula.type) {
        case "sum":
            return { total, result: total };

        case "weighted": {
            if (!formula.weights || Object.keys(formula.weights).length === 0) {
                // Fall back to average if no weights configured
                return { total, result: total / scoredAssignments.length };
            }
            let weightedSum = 0;
            let weightTotal = 0;
            for (const a of scoredAssignments) {
                const weight = formula.weights[a.assignmentId] ?? 1;
                weightedSum += a.score * weight;
                weightTotal += weight;
            }
            const result = weightTotal > 0 ? weightedSum / weightTotal : 0;
            return { total, result };
        }

        case "custom": {
            if (!formula.expression) {
                // Fall back to average if no expression configured
                return { total, result: total / scoredAssignments.length };
            }

            try {
                // Build variable context for the custom formula
                const assignmentsWithNames = scoredAssignments.map((a) => ({
                    id: a.assignmentId,
                    name: assignmentNames?.[a.assignmentId] ?? a.assignmentId,
                    score: a.score as number | null,
                    maxScore: a.maxScore,
                }));

                const context = buildVariableContext(
                    assignmentsWithNames,
                    formula.variables,
                );

                const result = evaluateFormula(formula.expression, context);
                return { total, result: Number.isFinite(result) ? result : 0 };
            } catch {
                // If formula evaluation fails, fall back to average
                console.warn(
                    `Custom formula evaluation failed for expression: "${formula.expression}". Falling back to average.`,
                );
                return { total, result: total / scoredAssignments.length };
            }
        }

        case "average":
        default:
            return { total, result: total / scoredAssignments.length };
    }
}

// Get assignments for a period
export async function getAssignmentsByPeriod(
    periodId: string,
): Promise<Assignment[]> {
    const rows = await db
        .select()
        .from(assignments)
        .where(eq(assignments.periodId, periodId))
        .orderBy(asc(assignments.order));

    return rows as Assignment[];
}

// Get scores for a set of assignments and students
export async function getScoresForPeriod(
    periodId: string,
): Promise<AssignmentScore[]> {
    const periodAssignments = await getAssignmentsByPeriod(periodId);
    if (periodAssignments.length === 0) return [];

    const assignmentIds = periodAssignments.map((a) => a.id);

    const rows = await db
        .select()
        .from(assignmentScores)
        .where(
            or(
                ...assignmentIds.map((id) =>
                    eq(assignmentScores.assignmentId, id),
                ),
            )!,
        );

    return rows as AssignmentScore[];
}

// Get full gradebook data for a period
export async function getGradebookData(
    periodId: string,
): Promise<GradebookData | null> {
    const period = await getPeriodWithContext(periodId);
    if (!period) return null;

    const [periodAssignments, classStudentRows] = await Promise.all([
        getAssignmentsByPeriod(periodId),
        getStudentsForPeriod(period.classSubjectId),
    ]);

    const periodStudents = classStudentRows.map((cs) => cs.student);
    const scores = await getScoresForPeriod(periodId);

    const scoreMap = buildScoreMap(scores);

    const rows: GradebookRow[] = periodStudents.map((student) => ({
        student,
        scores: buildStudentScoreRecord(
            student.id,
            periodAssignments,
            scoreMap,
        ),
    }));

    return {
        period: period as Period,
        assignments: periodAssignments,
        students: periodStudents,
        rows,
    };
}

// Get a single assignment by ID
export async function getAssignmentById(
    id: string,
): Promise<Assignment | null> {
    const rows = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, id))
        .limit(1);

    return (rows[0] as Assignment) ?? null;
}

// Get scores for a specific student across all assignments in a period
export async function getStudentScoresForPeriod(
    studentId: string,
    periodId: string,
): Promise<{ assignment: Assignment; score: number | null }[]> {
    const periodAssignments = await getAssignmentsByPeriod(periodId);
    if (periodAssignments.length === 0) return [];

    const assignmentIds = periodAssignments.map((a) => a.id);

    const scoreRows = await db
        .select()
        .from(assignmentScores)
        .where(
            and(
                eq(assignmentScores.studentId, studentId),
                or(
                    ...assignmentIds.map((id) =>
                        eq(assignmentScores.assignmentId, id),
                    ),
                )!,
            ),
        );

    const scoreMap = new Map<string, number | null>();
    for (const s of scoreRows) {
        scoreMap.set(s.assignmentId, s.score);
    }

    return periodAssignments.map((assignment) => ({
        assignment: assignment as Assignment,
        score: scoreMap.get(assignment.id) ?? null,
    }));
}

// Build report data for a single student in a class
export async function getStudentReport(
    classId: string,
    studentId: string,
    semesterId: string,
): Promise<StudentReport | null> {
    const [classRow, studentRow, semesterRow] = await Promise.all([
        getClassInfo(classId),
        getStudentInfo(studentId),
        getSemesterInfo(semesterId),
    ]);

    if (!classRow || !studentRow) return null;

    const classSubjectRows = await db
        .select({
            id: classSubjects.id,
            subjectId: classSubjects.subjectId,
            subjectName: subjects.name,
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(
            and(
                eq(classSubjects.classId, classId),
                eq(classSubjects.semesterId, semesterId),
            ),
        )
        .orderBy(asc(subjects.name));

    const reportSubjects = await buildReportSubjects(
        classSubjectRows,
        studentId,
    );

    const isComplete = reportSubjects.every((subj) =>
        subj.periods.every((p) => p.assignments.every((a) => a.score !== null)),
    );

    return {
        student: studentRow,
        className: classRow.name,
        teacherName: classRow.teacherName,
        academicYear: classRow.academicYear,
        semesterName: semesterRow?.name ?? "",
        subjects: reportSubjects,
        isComplete,
    };
}

// Build report index for all students in a class (for /classes/[id]/reports)
export async function getReportIndex(
    classId: string,
    semesterId: string,
): Promise<ReportIndexRow[]> {
    const enrolledStudents = await db
        .select({
            id: students.id,
            name: students.name,
            studentNumber: students.studentNumber,
            dateOfBirth: students.dateOfBirth,
            enrolledAt: students.enrolledAt,
            createdAt: students.createdAt,
            updatedAt: students.updatedAt,
        })
        .from(classStudents)
        .innerJoin(students, eq(classStudents.studentId, students.id))
        .where(eq(classStudents.classId, classId))
        .orderBy(asc(students.name));

    const classSubjectRows = await db
        .select({
            id: classSubjects.id,
            subjectId: classSubjects.subjectId,
            subjectName: subjects.name,
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(
            and(
                eq(classSubjects.classId, classId),
                eq(classSubjects.semesterId, semesterId),
            ),
        )
        .orderBy(asc(subjects.name));

    const results: ReportIndexRow[] = [];

    for (const student of enrolledStudents) {
        const reportSubjects = await buildReportSubjects(
            classSubjectRows,
            student.id,
        );

        const subjectScores: Record<string, number | null> = {};
        let isComplete = true;

        for (const subj of reportSubjects) {
            subjectScores[subj.subjectId] = subj.finalScore;
            if (
                subj.periods.some((p) =>
                    p.assignments.some((a) => a.score === null),
                )
            ) {
                isComplete = false;
            }
        }

        results.push({
            student: student as Student,
            subjectScores,
            isComplete,
        });
    }

    return results;
}

// Helpers
function buildScoreMap(
    scores: AssignmentScore[],
): Map<string, Map<string, number | null>> {
    // Map<assignmentId, Map<studentId, score>>
    const map = new Map<string, Map<string, number | null>>();
    for (const s of scores) {
        let studentMap = map.get(s.assignmentId);
        if (!studentMap) {
            studentMap = new Map();
            map.set(s.assignmentId, studentMap);
        }
        studentMap.set(s.studentId, s.score);
    }
    return map;
}

function buildStudentScoreRecord(
    studentId: string,
    periodAssignments: Assignment[],
    scoreMap: Map<string, Map<string, number | null>>,
): Record<string, number | null> {
    const record: Record<string, number | null> = {};
    for (const assignment of periodAssignments) {
        const studentMap = scoreMap.get(assignment.id);
        record[assignment.id] = studentMap?.get(studentId) ?? null;
    }
    return record;
}

async function getPeriodWithContext(
    periodId: string,
): Promise<(Period & { classSubjectId: string }) | null> {
    const rows = await db
        .select()
        .from(periods)
        .where(eq(periods.id, periodId))
        .limit(1);

    return (rows[0] as Period & { classSubjectId: string }) ?? null;
}

async function getStudentsForPeriod(
    classSubjectId: string,
): Promise<{ student: Student }[]> {
    const csRow = await db
        .select({ classId: classSubjects.classId })
        .from(classSubjects)
        .where(eq(classSubjects.id, classSubjectId))
        .limit(1);

    if (!csRow[0]) return [];

    const rows = await db
        .select({
            student: {
                id: students.id,
                name: students.name,
                studentNumber: students.studentNumber,
                dateOfBirth: students.dateOfBirth,
                enrolledAt: students.enrolledAt,
                createdAt: students.createdAt,
                updatedAt: students.updatedAt,
            },
        })
        .from(classStudents)
        .innerJoin(students, eq(classStudents.studentId, students.id))
        .where(eq(classStudents.classId, csRow[0].classId))
        .orderBy(asc(students.name));

    return rows as { student: Student }[];
}

async function getClassInfo(classId: string): Promise<{
    name: string;
    teacherName: string;
    academicYear: string;
} | null> {
    const rows = await db
        .select({
            name: classes.name,
            teacherName: user.name,
            academicYear: academicYears.year,
        })
        .from(classes)
        .innerJoin(user, eq(classes.teacherId, user.id))
        .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
        .where(eq(classes.id, classId))
        .limit(1);

    if (!rows[0]) return null;

    return rows[0];
}

async function getSemesterInfo(semesterId: string): Promise<{
    id: string;
    name: string;
} | null> {
    const rows = await db
        .select({
            id: semesters.id,
            name: semesters.name,
        })
        .from(semesters)
        .where(eq(semesters.id, semesterId))
        .limit(1);

    return rows[0] ?? null;
}

async function getStudentInfo(studentId: string): Promise<Student | null> {
    const rows = await db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

    return (rows[0] as Student) ?? null;
}

async function buildReportSubjects(
    classSubjectRows: {
        id: string;
        subjectId: string;
        subjectName: string;
    }[],
    studentId: string,
): Promise<StudentReportSubject[]> {
    const reportSubjects: StudentReportSubject[] = [];

    for (const cs of classSubjectRows) {
        const csPeriods = await db
            .select()
            .from(periods)
            .where(eq(periods.classSubjectId, cs.id))
            .orderBy(asc(periods.order));

        // Fetch classSubject row to get its formula config
        const csRow = await db
            .select({ formulaConfig: classSubjects.formulaConfig })
            .from(classSubjects)
            .where(eq(classSubjects.id, cs.id))
            .limit(1);

        const subjectFormula = parseFormulaConfig(
            csRow[0]?.formulaConfig ?? null,
        );

        const reportPeriods: StudentReportPeriod[] = [];

        for (const period of csPeriods) {
            const periodFormula = parseFormulaConfig(period.formulaConfig);
            const periodAssignments = await getAssignmentsByPeriod(period.id);
            const studentScores = await getStudentScoresForPeriod(
                studentId,
                period.id,
            );

            const reportAssignments: StudentReportAssignment[] =
                periodAssignments.map((a) => {
                    const scoreEntry = studentScores.find(
                        (s) => s.assignment.id === a.id,
                    );
                    return {
                        assignmentId: a.id,
                        assignmentName: a.name,
                        maxScore: a.maxScore,
                        score: scoreEntry?.score ?? null,
                    };
                });

            // Build scored assignments with full info for formula
            const scoredForFormula = reportAssignments
                .filter((a) => a.score !== null)
                .map((a) => ({
                    assignmentId: a.assignmentId,
                    score: a.score!,
                    maxScore: a.maxScore,
                }));

            // Build assignment name map for custom formula variable resolution
            const assignmentNameMap: Record<string, string> = {};
            for (const a of periodAssignments) {
                assignmentNameMap[a.id] = a.name;
            }

            const computed = computePeriodScore(
                periodFormula,
                scoredForFormula,
                assignmentNameMap,
            );

            reportPeriods.push({
                periodId: period.id,
                periodName: period.name,
                periodOrder: period.order,
                assignments: reportAssignments,
                periodTotal: computed?.total ?? null,
                periodAverage: computed?.result ?? null,
            });
        }

        // Compute subject final score using the subject-level formula
        // The subject formula operates on period results (periodAverage)
        const periodResults = reportPeriods
            .filter((p) => p.periodAverage !== null)
            .map((p) => ({
                assignmentId: p.periodId, // re-use the field for period ID
                score: p.periodAverage!,
                maxScore: 100, // not used for average/sum
            }));

        // Build period name map for custom formula variable resolution at subject level
        const periodNameMap: Record<string, string> = {};
        for (const p of reportPeriods) {
            periodNameMap[p.periodId] = p.periodName;
        }

        const subjectComputed = computePeriodScore(
            subjectFormula,
            periodResults,
            periodNameMap,
        );
        const finalScore = subjectComputed?.result ?? null;

        reportSubjects.push({
            subjectId: cs.subjectId,
            subjectName: cs.subjectName,
            periods: reportPeriods,
            finalScore,
        });
    }

    return reportSubjects;
}
