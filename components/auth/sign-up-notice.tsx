"use client";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SignUpNotice() {
    return (
        <Card className="max-w-md w-full">
            <CardHeader className="text-center">
                <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <ShieldAlert className="size-6 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-xl">
                    Aplikasi Internal
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                    Aplikasi ini hanya untuk staff yang berwenang
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Pembuatan akun dibatasi. Untuk mendapatkan akses,
                        hubungi administrator organisasi dan minta akun untuk
                        dibuatkan.
                    </p>
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <p className="text-sm font-medium">Butuh akun?</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Hubungi admin dengan nama lengkap dan alamat email
                            Anda.
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-center">
                <Button variant="outline" className="w-full">
                    <Link href="/login">Kembali ke Login</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
