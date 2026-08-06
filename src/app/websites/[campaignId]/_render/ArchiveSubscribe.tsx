import { NewsletterSignupForm } from "@/components/website/NewsletterSignupForm"

// Inline subscribe prompt for the public newsletter archive (list + each issue) —
// where reader intent is highest. Reuses the same double-opt-in form as the
// newsletterSignup block. Inherits the site theme (--site-primary) from ArchiveShell.
export function ArchiveSubscribe({ campaignId, accent }: { campaignId: string; accent: string }) {
  return (
    <section id="subscribe" className="scroll-mt-6 border-t border-black/5 bg-[#f7f8fa]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h2 className="text-2xl font-bold" style={{ color: "var(--site-primary)" }}>
          Subscribe to our newsletter
        </h2>
        <p className="mt-2 text-[#555]">Get campaign updates delivered to your inbox.</p>
        <div className="mt-5">
          <NewsletterSignupForm campaignId={campaignId} accent={accent} />
        </div>
      </div>
    </section>
  )
}
