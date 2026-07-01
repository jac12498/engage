import Link from "next/link"
import { MailCheck } from "lucide-react"
import { VerifyPoller } from "@/components/auth/VerifyPoller"

export const metadata = { title: "Check your email · Engage Campaign" }

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] px-6">
      <VerifyPoller />
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-base font-black text-[#0f2044]">
            E
          </span>
          <span className="text-xl font-bold tracking-tight text-[#1a1a2e]">Engage Campaign</span>
        </Link>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-[#1a1a2e]">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a secure sign-in link to your inbox. Click it to continue — it expires in 10
            minutes. This page will move along on its own once you&apos;re signed in.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            Didn&apos;t get it? Check spam, or{" "}
            <Link href="/sign-in" className="font-medium text-[#1b3a6b] hover:underline">
              try again
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
