import {
    pgTable,
    text,
    integer,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

// Payments, tracks each student's monthly payment based on global
// monthly payment amount. Amount stored in idr (integer)
export const payments = pgTable(
    "payment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        studentId: text("student_id")
            .notNull()
            .references(() => students.id, { onDelete: "cascade" }),
        amount: integer("amount").notNull().default(0),
        month: integer("month").notNull(),
        year: integer("year").notNull(),
        status: text("status", {
            enum: ["paid", "unpaid", "partial"],
        })
            .notNull()
            .default("unpaid"),
        paidAmount: integer("paid_amount").notNull().default(0),
        paidAt: timestamp("paid_at"),
        notes: text("notes"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("payment_student_month_year_idx").on(
            t.studentId,
            t.month,
            t.year,
        ),
    ],
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
    student: one(students, {
        fields: [payments.studentId],
        references: [students.id],
    }),
    installments: many(paymentInstallments),
}));

// Payment Installments, tracks individual installment payments for a
// payment record, each installment represents one partial or full payment
export const paymentInstallments = pgTable("payment_installment", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    paymentId: text("payment_id")
        .notNull()
        .references(() => payments.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    paidAt: timestamp("paid_at").notNull().defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentInstallmentsRelations = relations(
    paymentInstallments,
    ({ one }) => ({
        payment: one(payments, {
            fields: [paymentInstallments.paymentId],
            references: [payments.id],
        }),
    }),
);
