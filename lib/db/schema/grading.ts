import {
    pgTable,
    text,
    integer,
    real,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { periods } from "./classes";
import { students } from "./students";

// Assignments, belongs to a period, has name, max score, and order
export const assignments = pgTable(
    "assignment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        periodId: text("period_id")
            .notNull()
            .references(() => periods.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        maxScore: real("max_score").notNull().default(100),
        order: integer("order").notNull().default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("assignment_period_order_idx").on(t.periodId, t.order)],
);

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
    period: one(periods, {
        fields: [assignments.periodId],
        references: [periods.id],
    }),
    scores: many(assignmentScores),
}));

// Assignment Scores, main grading table, links student + assignment +
// score value. teachers fill in gradebook
export const assignmentScores = pgTable(
    "assignment_score",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        assignmentId: text("assignment_id")
            .notNull()
            .references(() => assignments.id, { onDelete: "cascade" }),
        studentId: text("student_id")
            .notNull()
            .references(() => students.id, { onDelete: "cascade" }),
        score: real("score"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("assignment_score_student_idx").on(
            t.assignmentId,
            t.studentId,
        ),
    ],
);

export const assignmentScoresRelations = relations(
    assignmentScores,
    ({ one }) => ({
        assignment: one(assignments, {
            fields: [assignmentScores.assignmentId],
            references: [assignments.id],
        }),
        student: one(students, {
            fields: [assignmentScores.studentId],
            references: [students.id],
        }),
    }),
);
