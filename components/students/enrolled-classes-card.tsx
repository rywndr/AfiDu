"use client";

import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";
import type { StudentEnrollment } from "@/lib/types";

// Props
interface EnrolledClassesCardProps {
    enrollments: StudentEnrollment[];
}

export function EnrolledClassesCard({ enrollments }: EnrolledClassesCardProps) {
    const router = useRouter();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kelas Terdaftar</CardTitle>
                <CardDescription>
                    Daftar kelas yang diikuti siswa
                </CardDescription>
            </CardHeader>
            <CardContent>
                {enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        Belum terdaftar di kelas mana pun
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Kelas</TableHead>
                                <TableHead>Tahun Ajaran</TableHead>
                                <TableHead>Guru</TableHead>
                                <TableHead>Tanggal Bergabung</TableHead>
                                <TableHead className="text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.map((enrollment) => (
                                <TableRow key={enrollment.id}>
                                    <TableCell className="font-medium">
                                        {enrollment.className}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {enrollment.academicYear}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {enrollment.teacherName}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(enrollment.enrolledAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                router.push(
                                                    `/classes/${enrollment.classId}`,
                                                )
                                            }
                                            aria-label="Lihat kelas"
                                        >
                                            <Eye />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
