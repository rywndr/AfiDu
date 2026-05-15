import {
    pgTable,
    text,
    integer,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { academicYears, semesters } from "./academics";
import { students, levels } from "./students";

// Subjects, speaking, reading, writing, listening, etc etc
export const subjects = pgTable(
    "subject",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        name: text("name").notNull(),
        description: text("description"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("subject_name_idx").on(t.name)],
);

export const subjectsRelations = relations(subjects, ({ many }) => ({
    classSubjects: many(classSubjects),
}));

// Classes, class record with name, academic year, teacher, capacity
export const classes = pgTable("class", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    academicYearId: text("academic_year_id")
        .notNull()
        .references(() => academicYears.id, { onDelete: "restrict" }),
    teacherId: text("teacher_id")
        .notNull()
        .references(() => user.id, { onDelete: "restrict" }),
    capacity: integer("capacity").notNull().default(30),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const classesRelations = relations(classes, ({ one, many }) => ({
    academicYear: one(academicYears, {
        fields: [classes.academicYearId],
        references: [academicYears.id],
    }),
    teacher: one(user, {
        fields: [classes.teacherId],
        references: [user.id],
    }),
    classStudents: many(classStudents),
    classSubjects: many(classSubjects),
}));

// Class Students, join table linking students to classes (many-to-many)
export const classStudents = pgTable(
    "class_student",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        classId: text("class_id")
            .notNull()
            .references(() => classes.id, { onDelete: "cascade" }),
        studentId: text("student_id")
            .notNull()
            .references(() => students.id, { onDelete: "cascade" }),
        enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("class_student_idx").on(t.classId, t.studentId)],
);

export const classStudentsRelations = relations(classStudents, ({ one }) => ({
    class: one(classes, {
        fields: [classStudents.classId],
        references: [classes.id],
    }),
    student: one(students, {
        fields: [classStudents.studentId],
        references: [students.id],
    }),
}));

// Class Subjects, links subject to class scoped per semester,
// stores subject-level formula config
export const classSubjects = pgTable(
    "class_subject",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        classId: text("class_id")
            .notNull()
            .references(() => classes.id, { onDelete: "cascade" }),
        subjectId: text("subject_id")
            .notNull()
            .references(() => subjects.id, { onDelete: "restrict" }),
        semesterId: text("semester_id")
            .notNull()
            .references(() => semesters.id, { onDelete: "restrict" }),
        levelId: text("level_id").references(() => levels.id, {
            onDelete: "set null",
        }),
        formulaConfig: text("formula_config"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("class_subject_semester_idx").on(
            t.classId,
            t.subjectId,
            t.semesterId,
        ),
    ],
);

export const classSubjectsRelations = relations(
    classSubjects,
    ({ one, many }) => ({
        class: one(classes, {
            fields: [classSubjects.classId],
            references: [classes.id],
        }),
        subject: one(subjects, {
            fields: [classSubjects.subjectId],
            references: [subjects.id],
        }),
        semester: one(semesters, {
            fields: [classSubjects.semesterId],
            references: [semesters.id],
        }),
        level: one(levels, {
            fields: [classSubjects.levelId],
            references: [levels.id],
        }),
        periods: many(periods),
    }),
);

// Periods, belongs to class_subject, grading period within a semester
// (e.g. "Period 1", "Period 2"), stores period-level formula config
// Created/triggered manually by the super-admin
export const periods = pgTable(
    "period",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        classSubjectId: text("class_subject_id")
            .notNull()
            .references(() => classSubjects.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        order: integer("order").notNull().default(0),
        formulaConfig: text("formula_config"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("period_class_subject_order_idx").on(
            t.classSubjectId,
            t.order,
        ),
    ],
);

export const periodsRelations = relations(periods, ({ one }) => ({
    classSubject: one(classSubjects, {
        fields: [periods.classSubjectId],
        references: [classSubjects.id],
    }),
}));
