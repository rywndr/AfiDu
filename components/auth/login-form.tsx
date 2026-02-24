"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GoogleIcon } from "@/components/auth/google-icon"
import { signIn } from "@/lib/auth-client"
import { zodResolver } from "@/lib/zod-resolver"
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth"
import { cn } from "@/lib/utils"

function LoginFormFields({
  register,
  errors,
  rememberMe,
  onToggleRemember,
}: {
  register: ReturnType<typeof useForm<LoginFormValues>>["register"]
  errors: ReturnType<typeof useForm<LoginFormValues>>["formState"]["errors"]
  rememberMe: boolean
  onToggleRemember: () => void
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <Link
            href="#"
            className="ml-auto inline-block text-sm underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={onToggleRemember}
        />
        <Label htmlFor="remember">Remember me</Label>
      </div>
    </div>
  )
}

function SocialLoginButton({
  loading,
  onGoogleSignIn,
}: {
  loading: boolean
  onGoogleSignIn: () => Promise<void>
}) {
  return (
    <div
      className={cn(
        "w-full gap-2 flex items-center",
        "justify-between flex-col"
      )}
    >
      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={loading}
        onClick={onGoogleSignIn}
        type="button"
      >
        <GoogleIcon />
        Sign in with Google
      </Button>
    </div>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)

    await signIn.email({
      email: data.email,
      password: data.password,
      rememberMe,
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onSuccess: () => router.push("/dashboard"),
        onError: (ctx) => {
          setAuthError(ctx.error.message ?? "Invalid email or password")
        },
      },
    })
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null)

    await signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      fetchOptions: {
        onRequest: () => setLoading(true),
        onResponse: () => setLoading(false),
        onError: (ctx) => {
          setAuthError(ctx.error.message ?? "Google sign-in failed")
        },
      },
    })
  }

  const handleToggleRemember = () => {
    setRememberMe((prev) => !prev)
  }

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <LoginFormFields
            register={register}
            errors={errors}
            rememberMe={rememberMe}
            onToggleRemember={handleToggleRemember}
          />

          {authError && (
            <p className="text-sm text-destructive text-center">{authError}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <span>Login</span>
            )}
          </Button>

          <SocialLoginButton
            loading={loading}
            onGoogleSignIn={handleGoogleSignIn}
          />
        </form>
      </CardContent>
    </Card>
  )
}
