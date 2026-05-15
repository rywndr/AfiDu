import { z } from "zod";

// Update School Settings
export const updateSchoolSettingsSchema = z.object({
    semesterDurationMonths: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Durasi semester minimal 1 bulan")
        .max(12, "Durasi semester maksimal 12 bulan"),
    semestersPerYear: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Minimal 1 semester per tahun")
        .max(4, "Maksimal 4 semester per tahun"),
    semesterStartMonths: z
        .array(
            z
                .number()
                .int("Harus berupa bilangan bulat")
                .min(1, "Bulan harus antara 1-12")
                .max(12, "Bulan harus antara 1-12"),
        )
        .min(1, "Minimal 1 bulan mulai semester")
        .max(4, "Maksimal 4 bulan mulai semester"),
    academicYearStartMonth: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(1, "Bulan harus antara 1-12")
        .max(12, "Bulan harus antara 1-12"),
    monthlyPaymentAmount: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Jumlah pembayaran tidak boleh negatif"),
});

export type UpdateSchoolSettingsInput = z.infer<
    typeof updateSchoolSettingsSchema
>;

// Create Academic Year
export const createAcademicYearSchema = z.object({
    year: z
        .string()
        .min(4, "Tahun harus 4 digit")
        .max(4, "Tahun harus 4 digit")
        .regex(/^\d{4}$/, "Tahun harus berupa angka 4 digit"),
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

// Create Level
export const createLevelSchema = z.object({
    name: z
        .string()
        .min(1, "Nama level wajib diisi")
        .max(100, "Nama level terlalu panjang"),
    description: z.string().max(500, "Deskripsi terlalu panjang").optional(),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
});

export type CreateLevelInput = z.infer<typeof createLevelSchema>;

// Update Level
export const updateLevelSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama level wajib diisi")
        .max(100, "Nama level terlalu panjang"),
    description: z.string().max(500, "Deskripsi terlalu panjang").optional(),
    order: z
        .number()
        .int("Harus berupa bilangan bulat")
        .min(0, "Urutan tidak boleh negatif"),
});

export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;

// Delete Level
export const deleteLevelSchema = z.object({
    id: z.string().min(1),
});

export type DeleteLevelInput = z.infer<typeof deleteLevelSchema>;

// Create Subject
export const createSubjectSchema = z.object({
    name: z
        .string()
        .min(1, "Nama mata pelajaran wajib diisi")
        .max(100, "Nama mata pelajaran terlalu panjang"),
    description: z.string().max(500, "Deskripsi terlalu panjang").optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

// Update Subject
export const updateSubjectSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama mata pelajaran wajib diisi")
        .max(100, "Nama mata pelajaran terlalu panjang"),
    description: z.string().max(500, "Deskripsi terlalu panjang").optional(),
});

export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// Delete Subject
export const deleteSubjectSchema = z.object({
    id: z.string().min(1),
});

export type DeleteSubjectInput = z.infer<typeof deleteSubjectSchema>;
