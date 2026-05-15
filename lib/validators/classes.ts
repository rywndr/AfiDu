import { z } from "zod";

// Create Class
export const createClassSchema = z.object({
    name: z
        .string()
        .min(1, "Nama kelas wajib diisi")
        .max(100, "Nama kelas terlalu panjang"),
    academicYearId: z.string().min(1, "Tahun ajaran wajib dipilih"),
    teacherId: z.string().min(1, "Guru wajib dipilih"),
    capacity: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Kapasitas minimal 1")
        .max(100, "Kapasitas maksimal 100"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

// Update Class
export const updateClassSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama kelas wajib diisi")
        .max(100, "Nama kelas terlalu panjang"),
    academicYearId: z.string().min(1, "Tahun ajaran wajib dipilih"),
    teacherId: z.string().min(1, "Guru wajib dipilih"),
    capacity: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Kapasitas minimal 1")
        .max(100, "Kapasitas maksimal 100"),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

// Delete Class
export const deleteClassSchema = z.object({
    id: z.string().min(1),
});

export type DeleteClassInput = z.infer<typeof deleteClassSchema>;

// Enroll Student in Class
export const enrollStudentSchema = z.object({
    classId: z.string().min(1, "Kelas wajib dipilih"),
    studentId: z.string().min(1, "Siswa wajib dipilih"),
    /** When true, allow enrolling even if the class is at/over capacity. */
    forceEnroll: z.boolean().optional().default(false),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

// Remove Student from Class
export const removeStudentSchema = z.object({
    classId: z.string().min(1),
    studentId: z.string().min(1),
});

export type RemoveStudentInput = z.infer<typeof removeStudentSchema>;

// Add Subject to Class (create class_subject)
export const addClassSubjectSchema = z.object({
    classId: z.string().min(1, "Kelas wajib dipilih"),
    subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
    semesterId: z.string().min(1, "Semester wajib dipilih"),
    levelId: z.string().optional(),
    formulaConfig: z.string().optional(),
});

export type AddClassSubjectInput = z.infer<typeof addClassSubjectSchema>;

// Update Class Subject (formula config, level)
export const updateClassSubjectSchema = z.object({
    id: z.string().min(1),
    levelId: z.string().optional().nullable(),
    formulaConfig: z.string().optional().nullable(),
});

export type UpdateClassSubjectInput = z.infer<typeof updateClassSubjectSchema>;

// Remove Class Subject
export const removeClassSubjectSchema = z.object({
    id: z.string().min(1),
});

export type RemoveClassSubjectInput = z.infer<typeof removeClassSubjectSchema>;

// Create Period
export const createPeriodSchema = z.object({
    classSubjectId: z.string().min(1, "Class subject wajib dipilih"),
    name: z
        .string()
        .min(1, "Nama period wajib diisi")
        .max(100, "Nama period terlalu panjang"),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
    formulaConfig: z.string().optional(),
});

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;

// Update Period
export const updatePeriodSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama period wajib diisi")
        .max(100, "Nama period terlalu panjang"),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
    formulaConfig: z.string().optional().nullable(),
});

export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>;

// Delete Period
export const deletePeriodSchema = z.object({
    id: z.string().min(1),
});

export type DeletePeriodInput = z.infer<typeof deletePeriodSchema>;

// Create Assignment
export const createAssignmentSchema = z.object({
    periodId: z.string().min(1, "Period wajib dipilih"),
    name: z
        .string()
        .min(1, "Nama tugas wajib diisi")
        .max(200, "Nama tugas terlalu panjang"),
    maxScore: z
        .number()
        .min(1, "Skor maksimal minimal 1")
        .max(1000, "Skor maksimal terlalu tinggi"),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

// Update Assignment
export const updateAssignmentSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama tugas wajib diisi")
        .max(200, "Nama tugas terlalu panjang"),
    maxScore: z
        .number()
        .min(1, "Skor maksimal minimal 1")
        .max(1000, "Skor maksimal terlalu tinggi"),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

// Delete Assignment
export const deleteAssignmentSchema = z.object({
    id: z.string().min(1),
});

export type DeleteAssignmentInput = z.infer<typeof deleteAssignmentSchema>;

// Save Score (single cell)
export const saveScoreSchema = z.object({
    assignmentId: z.string().min(1, "Tugas wajib dipilih"),
    studentId: z.string().min(1, "Siswa wajib dipilih"),
    score: z.number().min(0, "Skor tidak boleh negatif").nullable(),
});

export type SaveScoreInput = z.infer<typeof saveScoreSchema>;

// Save Scores (batch multiple cells at once)
export const saveScoresBatchSchema = z.object({
    scores: z.array(
        z.object({
            assignmentId: z.string().min(1),
            studentId: z.string().min(1),
            score: z.number().min(0, "Skor tidak boleh negatif").nullable(),
        }),
    ),
});

export type SaveScoresBatchInput = z.infer<typeof saveScoresBatchSchema>;

// Create / Update Payment
export const upsertPaymentSchema = z.object({
    studentId: z.string().min(1, "Siswa wajib dipilih"),
    amount: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Jumlah tidak boleh negatif"),
    month: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Bulan harus antara 1-12")
        .max(12, "Bulan harus antara 1-12"),
    year: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(2020, "Tahun minimal 2020")
        .max(2100, "Tahun maksimal 2100"),
    status: z.enum(["paid", "unpaid", "partial"], {
        message: "Status pembayaran wajib dipilih",
    }),
    paidAmount: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Jumlah bayar tidak boleh negatif"),
    notes: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
});

export type UpsertPaymentInput = z.infer<typeof upsertPaymentSchema>;

// Delete Payment
export const deletePaymentSchema = z.object({
    id: z.string().min(1),
});

export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;

// Create Study Material
export const createMaterialSchema = z.object({
    title: z
        .string()
        .min(1, "Judul materi wajib diisi")
        .max(255, "Judul terlalu panjang"),
    description: z
        .string()
        .max(1000, "Deskripsi terlalu panjang")
        .optional()
        .nullable(),
    fileUrl: z
        .string()
        .min(1, "Link Google Drive wajib diisi")
        .refine(
            (url) =>
                /^https:\/\/(drive\.google\.com|docs\.google\.com)\//.test(url),
            "Hanya link Google Drive yang diperbolehkan",
        ),
    fileType: z.enum(["pdf", "ppt", "pptx"], {
        message: "Tipe file wajib dipilih",
    }),
    fileSize: z.number().int().min(0).optional().nullable(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

// Update Study Material
export const updateMaterialSchema = z.object({
    id: z.string().min(1),
    title: z
        .string()
        .min(1, "Judul materi wajib diisi")
        .max(255, "Judul terlalu panjang"),
    description: z
        .string()
        .max(1000, "Deskripsi terlalu panjang")
        .optional()
        .nullable(),
    fileUrl: z
        .string()
        .min(1, "Link Google Drive wajib diisi")
        .refine(
            (url) =>
                /^https:\/\/(drive\.google\.com|docs\.google\.com)\//.test(url),
            "Hanya link Google Drive yang diperbolehkan",
        ),
    fileType: z.enum(["pdf", "ppt", "pptx"], {
        message: "Tipe file wajib dipilih",
    }),
    fileSize: z.number().int().min(0).optional().nullable(),
});

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

// Delete Study Material
export const deleteMaterialSchema = z.object({
    id: z.string().min(1),
});

export type DeleteMaterialInput = z.infer<typeof deleteMaterialSchema>;

// Assign Material to Class/Period/Level
export const assignMaterialSchema = z.object({
    materialId: z.string().min(1, "Materi wajib dipilih"),
    classId: z.string().optional().nullable(),
    periodId: z.string().optional().nullable(),
    levelId: z.string().optional().nullable(),
});

export type AssignMaterialInput = z.infer<typeof assignMaterialSchema>;

// Remove Material Assignment
export const removeMaterialAssignmentSchema = z.object({
    id: z.string().min(1),
});

export type RemoveMaterialAssignmentInput = z.infer<
    typeof removeMaterialAssignmentSchema
>;

// Add Payment Installment
export const addInstallmentSchema = z.object({
    paymentId: z.string().min(1, "ID pembayaran wajib diisi"),
    amount: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Jumlah cicilan minimal Rp1"),
    notes: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
});

export type AddInstallmentInput = z.infer<typeof addInstallmentSchema>;

// Delete Payment Installment
export const deleteInstallmentSchema = z.object({
    id: z.string().min(1),
    paymentId: z.string().min(1, "ID pembayaran wajib diisi"),
});

export type DeleteInstallmentInput = z.infer<typeof deleteInstallmentSchema>;
