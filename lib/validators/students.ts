import { z } from "zod";

// Create Student
//
// `studentNumber` is auto-generated server-side
// so it is NOT part of the create schema
export const createStudentSchema = z.object({
    name: z
        .string()
        .min(1, "Nama siswa wajib diisi")
        .max(255, "Nama terlalu panjang"),
    gender: z
        .enum(["male", "female"], {
            message: "Jenis kelamin wajib dipilih",
        })
        .optional(),
    dateOfBirth: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: "Format tanggal tidak valid" },
        ),
    address: z
        .string()
        .max(500, "Alamat terlalu panjang")
        .optional()
        .nullable(),
    parentPhone: z
        .string()
        .max(20, "Nomor telepon terlalu panjang")
        .optional()
        .nullable(),
    levelId: z.string().optional(),
    semesterId: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

// Update Student
//
// `studentNumber` is included but read-only on the UI, server
// still validates it in case someone manually submits an update
export const updateStudentSchema = z.object({
    id: z.string().min(1),
    name: z
        .string()
        .min(1, "Nama siswa wajib diisi")
        .max(255, "Nama terlalu panjang"),
    studentNumber: z
        .string()
        .min(1, "Nomor siswa wajib diisi")
        .max(50, "Nomor siswa terlalu panjang"),
    gender: z
        .enum(["male", "female"], {
            message: "Jenis kelamin wajib dipilih",
        })
        .optional()
        .nullable(),
    dateOfBirth: z
        .string()
        .optional()
        .refine(
            (val) => {
                if (!val) return true;
                const date = new Date(val);
                return !isNaN(date.getTime());
            },
            { message: "Format tanggal tidak valid" },
        ),
    address: z
        .string()
        .max(500, "Alamat terlalu panjang")
        .optional()
        .nullable(),
    parentPhone: z
        .string()
        .max(20, "Nomor telepon terlalu panjang")
        .optional()
        .nullable(),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

// Assign Level to Student
export const assignLevelSchema = z.object({
    studentId: z.string().min(1, "Student ID wajib diisi"),
    levelId: z.string().min(1, "Level wajib dipilih"),
    semesterId: z.string().min(1, "Semester wajib dipilih"),
});

export type AssignLevelInput = z.infer<typeof assignLevelSchema>;

// Delete Student (just the ID)
export const deleteStudentSchema = z.object({
    id: z.string().min(1),
});

export type DeleteStudentInput = z.infer<typeof deleteStudentSchema>;

// Delete Student Level History Entry
export const deleteStudentLevelSchema = z.object({
    id: z.string().min(1, "ID riwayat level wajib diisi"),
});

export type DeleteStudentLevelInput = z.infer<typeof deleteStudentLevelSchema>;
