"use client";

import { useCallback } from "react";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { deleteStudentLevel } from "@/lib/actions/students";
import { Trash2 } from "lucide-react";
import type { StudentLevelRecord } from "@/lib/types";

// Props
interface LevelHistoryCardProps {
    records: StudentLevelRecord[];
    onDelete?: (id: string) => void;
}

export function LevelHistoryCard({ records, onDelete }: LevelHistoryCardProps) {
    const router = useRouter();

    const handleDelete = useCallback(
        async (id: string) => {
            if (onDelete) {
                onDelete(id);
                return;
            }
            const result = await deleteStudentLevel({ id });
            if (result.success) {
                router.refresh();
            }
        },
        [onDelete, router],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Riwayat Level</CardTitle>
                <CardDescription>
                    Progres level siswa per semester
                </CardDescription>
            </CardHeader>
            <CardContent>
                {records.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        Belum ada riwayat level
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Semester</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Tanggal Ditetapkan</TableHead>
                                <TableHead className="text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell>
                                        {record.semester.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {record.level.name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(record.assignedAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ConfirmDialog
                                            title="Hapus Riwayat Level"
                                            description={`Hapus riwayat level "${record.level.name}" untuk semester "${record.semester.name}"? Tindakan ini tidak dapat dibatalkan.`}
                                            confirmLabel="Hapus"
                                            onConfirm={() =>
                                                handleDelete(record.id)
                                            }
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="Hapus riwayat level"
                                                >
                                                    <Trash2 className="text-destructive" />
                                                </Button>
                                            }
                                        />
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
