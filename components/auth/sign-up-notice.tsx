"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function SignUpNotice() {
  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldAlert className="size-6 text-primary" />
        </div>
        <CardTitle className="text-lg md:text-xl">Internal Application</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          This application is for authorized personnel only
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Account creation is restricted. To get access, please contact your
            organization&apos;s administrator and request an account to be
            created for you.
          </p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">Need an account?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reach out to your admin with your full name and email address.
              They will set up your account and assign the appropriate role.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="outline" className="w-full">
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
