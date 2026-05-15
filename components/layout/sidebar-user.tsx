"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";

function UserAvatar({
    name,
    image,
}: {
    name: string;
    image: string | undefined;
}) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <Avatar size="sm">
            <AvatarImage src={image ?? ""} alt={name} />
            <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
    );
}

function UserInfo({ name, email }: { name: string; email: string }) {
    return (
        <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
                {email}
            </span>
        </div>
    );
}

function formatRoleLabel(role: string): string {
    return role
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function RoleBadge({ role }: { role: string }) {
    const variant =
        role === "super-admin"
            ? "default"
            : role === "admin"
              ? "secondary"
              : "outline";

    return <Badge variant={variant}>{formatRoleLabel(role)}</Badge>;
}

export function SidebarUser() {
    const router = useRouter();
    const { data: session } = useSession();
    const { isMobile } = useSidebar();

    const userName = session?.user?.name ?? "User";
    const userEmail = session?.user?.email ?? "";
    const userImage = session?.user?.image ?? undefined;
    const userRole =
        ((session?.user as Record<string, unknown> | undefined)?.role as
            | string
            | undefined) ?? "teacher";

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => router.push("/login"),
            },
        });
    };

    const handleNavigateProfile = () => {
        router.push("/profile");
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        nativeButton={false}
                        render={<div role="button" tabIndex={0} />}
                    >
                        <SidebarMenuButton
                            size="lg"
                            render={<div role="button" tabIndex={-1} />}
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
                        >
                            <UserAvatar name={userName} image={userImage} />
                            <UserInfo name={userName} email={userEmail} />
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side={isMobile ? "bottom" : "top"}
                        align="end"
                        sideOffset={4}
                        className="w-56"
                    >
                        <DropdownMenuGroup>
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <UserAvatar name={userName} image={userImage} />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">
                                        {userName}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {userEmail}
                                    </span>
                                </div>
                            </div>
                            <div className="px-1 pb-1">
                                <RoleBadge role={userRole} />
                            </div>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={handleNavigateProfile}>
                                <UserCircle className="mr-2" />
                                Profile
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={handleSignOut}>
                                <LogOut className="mr-2" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
