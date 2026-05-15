"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { StudentReport } from "@/lib/types";

// Helpers
/**
 * Strip trailing year from a semester name so report only shows
 * semester label
 */
function stripYearFromSemesterName(name: string): string {
    return name.replace(/\s+\d{4}$/, "");
}

// Main Report View (shared between screen and print)
interface StudentReportViewProps {
    report: StudentReport;
}

export function StudentReportView({ report }: StudentReportViewProps) {
    return (
        <div className="space-y-6 print:space-y-4">
            <ReportHeader report={report} />
            <ReportSubjectsList report={report} />
            <ReportSummary report={report} />
            <ReportSignatures
                studentName={report.student.name}
                teacherName={report.teacherName}
            />
        </div>
    );
}

// Report Header
interface ReportHeaderProps {
    report: StudentReport;
}

function ReportHeader({ report }: ReportHeaderProps) {
    return (
        <Card className="print:shadow-none print:border print:rounded-none">
            <CardContent className="pt-6 print:pt-4">
                <div className="flex items-center justify-between print:block">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold print:text-lg">
                            {report.student.name}
                        </h2>
                        <p className="text-sm text-muted-foreground font-mono">
                            {report.student.studentNumber}
                        </p>
                    </div>
                    <div className="text-right print:text-left print:mt-2">
                        <StatusBadge
                            status={
                                report.isComplete ? "complete" : "incomplete"
                            }
                        />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
                    <InfoItem label="Kelas" value={report.className} />
                    <InfoItem label="Guru" value={report.teacherName} />
                    <InfoItem
                        label="Tahun Ajaran"
                        value={report.academicYear}
                    />
                    <InfoItem
                        label="Semester"
                        value={stripYearFromSemesterName(report.semesterName)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

// Info Item (key-value pair in the header)
interface InfoItemProps {
    label: string;
    value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
    return (
        <div className="space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground print:text-[9px]">
                {label}
            </p>
            <p className="text-sm font-medium print:text-xs">{value}</p>
        </div>
    );
}

// Report Subjects List
interface ReportSubjectsListProps {
    report: StudentReport;
}

function ReportSubjectsList({ report }: ReportSubjectsListProps) {
    if (report.subjects.length === 0) {
        return (
            <Card className="print:shadow-none print:border print:rounded-none">
                <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        Belum ada mata pelajaran yang dikonfigurasi untuk
                        semester ini.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 print:space-y-3">
            {report.subjects.map((subject) => (
                <SubjectCard key={subject.subjectId} subject={subject} />
            ))}
        </div>
    );
}

// Subject Card
interface SubjectCardProps {
    subject: StudentReport["subjects"][number];
}

function SubjectCard({ subject }: SubjectCardProps) {
    return (
        <Card className="print:shadow-none print:border print:rounded-none print:break-inside-avoid">
            <CardHeader className="pb-2 print:pb-1">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base print:text-sm">
                        {subject.subjectName}
                    </CardTitle>
                    <FinalScoreBadge score={subject.finalScore} />
                </div>
            </CardHeader>
            <CardContent>
                {subject.periods.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                        Belum ada period yang dibuat.
                    </p>
                ) : (
                    <div className="space-y-3 print:space-y-2">
                        {subject.periods.map((period) => (
                            <PeriodSection
                                key={period.periodId}
                                period={period}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Final Score Badge
interface FinalScoreBadgeProps {
    score: number | null;
}

function FinalScoreBadge({ score }: FinalScoreBadgeProps) {
    if (score === null) {
        return (
            <Badge variant="outline" className="text-xs">
                Belum ada nilai
            </Badge>
        );
    }

    const rounded = Math.round(score * 100) / 100;

    return (
        <Badge variant="default" className="text-xs tabular-nums">
            Nilai Akhir: {rounded}
        </Badge>
    );
}

// Period Section
interface PeriodSectionProps {
    period: StudentReport["subjects"][number]["periods"][number];
}

function PeriodSection({ period }: PeriodSectionProps) {
    return (
        <div className="rounded-md border">
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 print:bg-gray-50">
                <span className="text-xs font-medium">{period.periodName}</span>
                <PeriodStats
                    total={period.periodTotal}
                    average={period.periodAverage}
                />
            </div>

            {period.assignments.length === 0 ? (
                <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        Belum ada tugas.
                    </p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs h-8">Tugas</TableHead>
                            <TableHead className="text-xs h-8 text-center w-24">
                                Skor Maks
                            </TableHead>
                            <TableHead className="text-xs h-8 text-center w-24">
                                Nilai
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {period.assignments.map((assignment) => (
                            <AssignmentRow
                                key={assignment.assignmentId}
                                assignment={assignment}
                            />
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}

// Period Stats
interface PeriodStatsProps {
    total: number | null;
    average: number | null;
}

function PeriodStats({ total, average }: PeriodStatsProps) {
    return (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums print:text-[9px]">
            <span>
                Total:{" "}
                <span className="font-medium text-foreground">
                    {total !== null ? Math.round(total * 100) / 100 : "—"}
                </span>
            </span>
            <span>
                Rata-rata:{" "}
                <span className="font-medium text-foreground">
                    {average !== null ? Math.round(average * 100) / 100 : "—"}
                </span>
            </span>
        </div>
    );
}

// Assignment Row
interface AssignmentRowProps {
    assignment: StudentReport["subjects"][number]["periods"][number]["assignments"][number];
}

function AssignmentRow({ assignment }: AssignmentRowProps) {
    const hasScore = assignment.score !== null;

    return (
        <TableRow>
            <TableCell className="text-xs py-1.5 print:py-1">
                {assignment.assignmentName}
            </TableCell>
            <TableCell className="text-xs py-1.5 text-center tabular-nums text-muted-foreground print:py-1">
                {assignment.maxScore}
            </TableCell>
            <TableCell className="text-xs py-1.5 text-center tabular-nums print:py-1">
                {hasScore ? (
                    <span className="font-medium">{assignment.score}</span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
        </TableRow>
    );
}

// Report Signatures
interface ReportSignaturesProps {
    studentName: string;
    teacherName: string;
}

function ReportSignatures({ studentName, teacherName }: ReportSignaturesProps) {
    return (
        // Signature section
        <div className="pt-6 print:pt-4">
            <div className="flex items-end justify-between px-4 print:px-2">
                {/* Student signature */}
                <div className="flex flex-col items-center gap-16 print:gap-20">
                    <p className="text-sm font-medium print:text-xs">Siswa</p>
                    <div className="w-40 border-b border-foreground" />
                    <p className="text-sm print:text-xs -mt-14 print:-mt-18 text-center">
                        {studentName}
                    </p>
                </div>
                {/* Teacher signature */}
                <div className="flex flex-col items-center gap-16 print:gap-20">
                    <p className="text-sm font-medium print:text-xs">
                        Guru Pengajar
                    </p>
                    <div className="w-40 border-b border-foreground" />
                    <p className="text-sm print:text-xs -mt-14 print:-mt-18 text-center">
                        {teacherName}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Report Summary
interface ReportSummaryProps {
    report: StudentReport;
}

function ReportSummary({ report }: ReportSummaryProps) {
    const subjectsWithScores = report.subjects.filter(
        (s) => s.finalScore !== null,
    );

    if (subjectsWithScores.length === 0) {
        return null;
    }

    const overallAverage =
        subjectsWithScores.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) /
        subjectsWithScores.length;

    const roundedOverall = Math.round(overallAverage * 100) / 100;

    return (
        <Card className="print:shadow-none print:border print:rounded-none print:break-inside-avoid">
            <CardHeader className="pb-2 print:pb-1">
                <CardTitle className="text-base print:text-sm">
                    Ringkasan Nilai
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs h-8">
                                Mata Pelajaran
                            </TableHead>
                            <TableHead className="text-xs h-8 text-center w-32">
                                Nilai Akhir
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {report.subjects.map((subject) => (
                            <TableRow key={subject.subjectId}>
                                <TableCell className="text-sm py-1.5 print:py-1 print:text-xs">
                                    {subject.subjectName}
                                </TableCell>
                                <TableCell className="text-sm py-1.5 text-center tabular-nums print:py-1 print:text-xs">
                                    {subject.finalScore !== null ? (
                                        <span className="font-medium">
                                            {Math.round(
                                                subject.finalScore * 100,
                                            ) / 100}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                            <TableCell className="text-sm font-semibold py-2 print:py-1 print:text-xs">
                                Rata-rata Keseluruhan
                            </TableCell>
                            <TableCell className="text-sm font-bold py-2 text-center tabular-nums print:py-1 print:text-xs">
                                {roundedOverall}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
