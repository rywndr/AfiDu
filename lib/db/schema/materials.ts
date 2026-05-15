import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { classes, periods } from "./classes";
import { levels } from "./students";

// Study Materials, currently stores PPT and PDF files via GDrive links
export const studyMaterials = pgTable("study_material", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type", {
        enum: ["pdf", "ppt", "pptx"],
    }).notNull(),
    fileSize: integer("file_size"),
    uploadedBy: text("uploaded_by")
        .notNull()
        .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const studyMaterialsRelations = relations(
    studyMaterials,
    ({ one, many }) => ({
        uploader: one(user, {
            fields: [studyMaterials.uploadedBy],
            references: [user.id],
        }),
        assignments: many(studyMaterialAssignments),
    }),
);

// Study Material Assignments, assigns materials to classes, periods, and/or
// levels. Each FK is nullable so a material can be scoped flexibly
export const studyMaterialAssignments = pgTable("study_material_assignment", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    materialId: text("material_id")
        .notNull()
        .references(() => studyMaterials.id, { onDelete: "cascade" }),
    classId: text("class_id").references(() => classes.id, {
        onDelete: "cascade",
    }),
    periodId: text("period_id").references(() => periods.id, {
        onDelete: "cascade",
    }),
    levelId: text("level_id").references(() => levels.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studyMaterialAssignmentsRelations = relations(
    studyMaterialAssignments,
    ({ one }) => ({
        material: one(studyMaterials, {
            fields: [studyMaterialAssignments.materialId],
            references: [studyMaterials.id],
        }),
        class: one(classes, {
            fields: [studyMaterialAssignments.classId],
            references: [classes.id],
        }),
        period: one(periods, {
            fields: [studyMaterialAssignments.periodId],
            references: [periods.id],
        }),
        level: one(levels, {
            fields: [studyMaterialAssignments.levelId],
            references: [levels.id],
        }),
    }),
);
