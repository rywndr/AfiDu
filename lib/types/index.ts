// Shared type defs

// Levels
export interface Level {
    id: string;
    name: string;
    description: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

// Students
export interface Student {
    id: string;
    name: string;
    studentNumber: string;
    gender: "male" | "female" | null;
    dateOfBirth: string | null;
    address: string | null;
    parentPhone: string | null;
    enrolledAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface StudentWithLevel extends Student {
    currentLevel: Level | null;
}

// Student Levels (history)
export interface StudentLevelRecord {
    id: string;
    studentId: string;
    levelId: string;
    semesterId: string;
    assignedAt: Date;
    level: Level;
    semester: SemesterSummary;
}

// Academics
export interface SchoolSettings {
    id: string;
    semesterDurationMonths: number;
    semestersPerYear: number;
    schoolStartMonth: number;
    semesterStartMonths: number[];
    academicYearStartMonth: number;
    monthlyPaymentAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface AcademicYear {
    id: string;
    year: string;
    startDate: string;
    endDate: string;
    monthlyPaymentAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface AcademicYearWithSemesters extends AcademicYear {
    semesters: Semester[];
}

export interface Semester {
    id: string;
    academicYearId: string;
    name: string;
    semesterNumber: number;
    startDate: string;
    endDate: string;
    createdAt: Date;
}

export interface SemesterSummary {
    id: string;
    name: string;
    semesterNumber: number;
}

// Student Enrollments (classes a student belongs to)
export interface StudentEnrollment {
    id: string;
    classId: string;
    studentId: string;
    enrolledAt: Date;
    className: string;
    academicYear: string;
    teacherName: string;
}

// Subjects
export interface Subject {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Classes
export interface ClassRecord {
    id: string;
    name: string;
    academicYearId: string;
    teacherId: string;
    capacity: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClassWithDetails extends ClassRecord {
    academicYear: AcademicYear;
    teacher: { id: string; name: string; email: string };
    studentCount: number;
}

// Class Students
export interface ClassStudent {
    id: string;
    classId: string;
    studentId: string;
    enrolledAt: Date;
    student: Student;
}

// Class Subjects
export interface ClassSubject {
    id: string;
    classId: string;
    subjectId: string;
    semesterId: string;
    levelId: string | null;
    formulaConfig: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClassSubjectWithDetails extends ClassSubject {
    subject: Subject;
    semester: SemesterSummary;
    level: Level | null;
    periods: Period[];
}

// Periods
export interface Period {
    id: string;
    classSubjectId: string;
    name: string;
    order: number;
    formulaConfig: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Assignments
export interface Assignment {
    id: string;
    periodId: string;
    name: string;
    maxScore: number;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

// Assignment Scores
export interface AssignmentScore {
    id: string;
    assignmentId: string;
    studentId: string;
    score: number | null;
    createdAt: Date;
    updatedAt: Date;
}

// Gradebook, view for grading grid
export interface GradebookRow {
    student: Student;
    scores: Record<string, number | null>; // assignmentId → score
}

export interface GradebookData {
    period: Period;
    assignments: Assignment[];
    students: Student[];
    rows: GradebookRow[];
}

// Payments
export interface Payment {
    id: string;
    studentId: string;
    amount: number;
    month: number;
    year: number;
    status: "paid" | "unpaid" | "partial";
    paidAmount: number;
    paidAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentInstallment {
    id: string;
    paymentId: string;
    amount: number;
    paidAt: Date;
    notes: string | null;
    createdAt: Date;
}

export interface PaymentWithStudent extends Payment {
    student: Student;
}

export interface PaymentWithInstallments extends Payment {
    installments: PaymentInstallment[];
}

export interface PaymentWithStudentAndInstallments extends PaymentWithStudent {
    installments: PaymentInstallment[];
}

// Study Materials
export interface StudyMaterial {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    fileType: "pdf" | "ppt" | "pptx";
    fileSize: number | null;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface StudyMaterialWithAssignments extends StudyMaterial {
    uploader: { id: string; name: string };
    assignments: MaterialAssignment[];
}

export interface MaterialAssignment {
    id: string;
    materialId: string;
    classId: string | null;
    periodId: string | null;
    levelId: string | null;
    createdAt: Date;
}

// Reports
export interface StudentReportSubject {
    subjectId: string;
    subjectName: string;
    periods: StudentReportPeriod[];
    finalScore: number | null;
}

export interface StudentReportPeriod {
    periodId: string;
    periodName: string;
    periodOrder: number;
    assignments: StudentReportAssignment[];
    periodTotal: number | null;
    periodAverage: number | null;
}

export interface StudentReportAssignment {
    assignmentId: string;
    assignmentName: string;
    maxScore: number;
    score: number | null;
}

export interface StudentReport {
    student: Student;
    className: string;
    teacherName: string;
    academicYear: string;
    semesterName: string;
    subjects: StudentReportSubject[];
    isComplete: boolean;
}

// Report Index (for /classes/[classId]/reports)
export interface ReportIndexRow {
    student: Student;
    subjectScores: Record<string, number | null>; // subjectId → final score
    isComplete: boolean;
}

// Formula Config (parsed JSON from formula_config columns)
export interface FormulaConfig {
    type: "average" | "weighted" | "sum" | "custom";
    weights?: Record<string, number>;
    /** Custom formula expression, e.g. "(UH1 + UH2) / 2 * 0.6 + UTS * 0.2 + UAS * 0.2" */
    expression?: string;
    /**
     * Maps variable names used in the expression to assignment IDs.
     * e.g. { "UH1": "assignment-id-1", "UTS": "assignment-id-2" }
     * When empty/undefined with type "custom", variables are matched by
     * assignment name (case-insensitive, spaces replaced with underscores).
     */
    variables?: Record<string, string>;
}

// Calendar Preview (for settings page)
export interface CalendarPreviewSemester {
    semesterNumber: number;
    name: string;
    startDate: string;
    endDate: string;
}

export interface CalendarPreviewYear {
    year: string;
    semesters: CalendarPreviewSemester[];
}

// Common/Util types
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ActionResult {
    success: boolean;
    error?: string;
}

export interface ActionResultWithData<T> extends ActionResult {
    data?: T;
}
