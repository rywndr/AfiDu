import {
    pgTable,
    text,
    integer,
    timestamp,
    date,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { semesters } from "./academics";

// Levels, configurable progression levels
export const levels = pgTable("level", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const levelsRelations = relations(levels, ({ many }) => ({
    studentLevels: many(studentLevels),
}));

// Students, separate from auth users; students don't log in
export const students = pgTable(
    "student",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        name: text("name").notNull(),
        studentNumber: text("student_number").notNull(),
        gender: text("gender"), // "male" | "female"
        dateOfBirth: date("date_of_birth"),
        address: text("address"),
        parentPhone: text("parent_phone"),
        enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("student_number_idx").on(t.studentNumber)],
);

export const studentsRelations = relations(students, ({ many }) => ({
    studentLevels: many(studentLevels),
}));

// Student Levels, tracks level history per semester
export const studentLevels = pgTable(
    "student_level",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        studentId: text("student_id")
            .notNull()
            .references(() => students.id, { onDelete: "cascade" }),
        levelId: text("level_id")
            .notNull()
            .references(() => levels.id, { onDelete: "restrict" }),
        semesterId: text("semester_id")
            .notNull()
            .references(() => semesters.id, { onDelete: "restrict" }),
        assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("student_level_semester_idx").on(
            t.studentId,
            t.levelId,
            t.semesterId,
        ),
    ],
);

export const studentLevelsRelations = relations(studentLevels, ({ one }) => ({
    student: one(students, {
        fields: [studentLevels.studentId],
        references: [students.id],
    }),
    level: one(levels, {
        fields: [studentLevels.levelId],
        references: [levels.id],
    }),
    semester: one(semesters, {
        fields: [studentLevels.semesterId],
        references: [semesters.id],
    }),
}));
