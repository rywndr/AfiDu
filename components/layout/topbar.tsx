"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface TopbarProps {
    title: string;
}

export function Topbar({ title }: TopbarProps) {
    return (
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear md:h-16 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <h1 className="truncate text-base font-semibold md:text-lg">
                {title}
            </h1>
        </header>
    );
}
