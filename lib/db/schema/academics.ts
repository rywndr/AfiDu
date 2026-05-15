import {
    pgTable,
    text,
    integer,
    timestamp,
    date,
    uniqueIndex,
    json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// School Settings – config controlled by super admin
export const schoolSettings = pgTable("school_setting", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    semesterDurationMonths: integer("semester_duration_months")
        .notNull()
        .default(6),
    semestersPerYear: integer("semesters_per_year").notNull().default(2),
    schoolStartMonth: integer("school_start_month").notNull().default(7),
    semesterStartMonths: json("semester_start_months")
        .$type<number[]>()
        .notNull()
        .default([1, 6]),
    academicYearStartMonth: integer("academic_year_start_month")
        .notNull()
        .default(7),
    monthlyPaymentAmount: integer("monthly_payment_amount")
        .notNull()
        .default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Academic Years like "2026", "2027", manually triggered by super admin
export const academicYears = pgTable(
    "academic_year",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        year: text("year").notNull(),
        startDate: date("start_date").notNull(),
        endDate: date("end_date").notNull(),
        monthlyPaymentAmount: integer("monthly_payment_amount")
            .notNull()
            .default(0),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [uniqueIndex("academic_year_idx").on(t.year)],
);

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
    semesters: many(semesters),
}));

// Semesters, belongs to academic year, autogen from settings
export const semesters = pgTable(
    "semester",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        academicYearId: text("academic_year_id")
            .notNull()
            .references(() => academicYears.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        semesterNumber: integer("semester_number").notNull(),
        startDate: date("start_date").notNull(),
        endDate: date("end_date").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("semester_year_number_idx").on(
            t.academicYearId,
            t.semesterNumber,
        ),
    ],
);

export const semestersRelations = relations(semesters, ({ one }) => ({
    academicYear: one(academicYears, {
        fields: [semesters.academicYearId],
        references: [academicYears.id],
    }),
}));
