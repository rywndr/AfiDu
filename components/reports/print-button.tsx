"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    return (
        <Button variant="default" size="sm" onClick={handlePrint}>
            <Printer className="mr-1" />
            Cetak Rapor
        </Button>
    );
}
