"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  LEAN_DOMAINS,
  VOICE_TONES,
  type InterviewData,
  type LeanAnswers,
} from "@/lib/comms/interview"
import { updateCampaignProfile, saveInterview } from "@/app/communications/actions"
import { inputCls, type ProfileDTO } from "./shared"

const STEPS = [
  { id: "about", label: "About you" },
  { id: "values", label: "Values & lean" },
  { id: "voice", label: "Voice & style" },
] as const

export function InterviewWizard({
  profile,
  startStep = 0,
  onExit,
  scope = "candidate",
}: {
  profile: ProfileDTO
  startStep?: number
  onExit: () => void
  /** "committee" for a multi-candidate committee (the committee's shared voice). */
  scope?: "committee" | "candidate"
}) {
  const router = useRouter()
  const [step, setStep] = useState(Math.min(Math.max(startStep, 0), STEPS.length - 1))
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [whyRunning, setWhyRunning] = useState(profile.whyRunning ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [experience, setExperience] = useState(profile.experience ?? "")
  const [education, setEducation] = useState(profile.education ?? "")

  const [lean, setLean] = useState<LeanAnswers>(profile.interview?.lean ?? {})
  const [admire, setAdmire] = useState(profile.interview?.admire ?? "")
  const [coreValues, setCoreValues] = useState(profile.coreValues ?? "")

  const [voiceTone, setVoiceTone] = useState(profile.voiceTone ?? "")

  // Copy adapts to who's being described: a candidate (single-candidate committee)
  // or the committee itself (multi-candidate). bio/education are person-only.
  const isCommittee = scope === "committee"
  const COPY = isCommittee
    ? {
        aboutStep: "About the committee",
        aboutTitle: "Tell us about your committee",
        aboutHint:
          "This is the spine of every message we write. The more specific, the more it sounds like your committee.",
        whyLabel: "What does the committee stand for?",
        whyPlaceholder: "In the committee's words — its mission, and what it's working to change.",
        experienceLabel: "History & background",
        experiencePlaceholder: "The committee's history, the work it does, and its roots in the area.",
        showBio: false,
        showEducation: false,
        valuesTitle: "The committee's values & political lean",
        valuesHint:
          "This helps us match positions even on topics you didn't list as key issues. There are no wrong answers.",
        coreValuesPlaceholder: "The principles that guide the committee — in your own words.",
        admireLabel: "Political figures the committee admires",
        admirePlaceholder: "e.g. local leaders or national figures whose approach the committee shares",
        voiceHint: "How should the committee's communications sound?",
      }
    : {
        aboutStep: "About you",
        aboutTitle: "Tell us about yourself",
        aboutHint:
          "This is the spine of every message we write. The more specific, the more it sounds like you.",
        whyLabel: "Why are you running?",
        whyPlaceholder: "In your own words — what's driving you to run, and what do you want to change?",
        experienceLabel: "Experience & background",
        experiencePlaceholder: "Career, public service, community roles, roots in the area.",
        showBio: true,
        showEducation: true,
        valuesTitle: "Your values & political lean",
        valuesHint:
          "This helps us match your positions even on topics you didn't list as key issues. There are no wrong answers.",
        coreValuesPlaceholder: "The principles that guide you — in your own words.",
        admireLabel: "Political figures you admire",
        admirePlaceholder: "e.g. local leaders or national figures whose approach you share",
        voiceHint: "How should your communications sound?",
      }

  function goNext() {
    if (step < STEPS.length - 1) setStep(step + 1)
    else {
      router.refresh()
      onExit()
    }
  }

  function saveAndNext() {
    setError(null)
    startSaving(async () => {
      let res: { ok: boolean; error?: string } = { ok: true }
      const id = STEPS[step].id
      if (id === "about") {
        // bio/education are person-only; a committee interview omits them.
        res = await updateCampaignProfile(
          isCommittee ? { whyRunning, experience } : { whyRunning, bio, experience, education },
        )
      } else if (id === "values") {
        res = await saveInterview({ data: { lean, admire }, coreValues })
      } else if (id === "voice") {
        res = await updateCampaignProfile({ voiceTone })
      }
      if (res.ok) goNext()
      else setError(res.error ?? "Could not save.")
    })
  }

  const current = STEPS[step]

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap gap-1 border-b border-border px-5 py-3">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              i === step
                ? "bg-[#1b3a6b] text-white"
                : i < step
                  ? "text-[#1e6b3a]"
                  : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {i < step ? <Check className="mr-1 inline h-3 w-3" /> : `${i + 1}. `}
            {s.id === "about" ? COPY.aboutStep : s.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {current.id === "about" && (
          <Section title={COPY.aboutTitle} hint={COPY.aboutHint}>
            <Field label={COPY.whyLabel} required>
              <textarea
                value={whyRunning}
                onChange={(e) => setWhyRunning(e.target.value)}
                rows={3}
                placeholder={COPY.whyPlaceholder}
                className={inputCls}
              />
            </Field>
            {COPY.showBio && (
              <Field label="Short bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="A few sentences introducing yourself to voters."
                  className={inputCls}
                />
              </Field>
            )}
            <Field label={COPY.experienceLabel}>
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={2}
                placeholder={COPY.experiencePlaceholder}
                className={inputCls}
              />
            </Field>
            {COPY.showEducation && (
              <Field label="Education">
                <input
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Schools, degrees, training"
                  className={inputCls}
                />
              </Field>
            )}
          </Section>
        )}

        {current.id === "values" && (
          <Section title={COPY.valuesTitle} hint={COPY.valuesHint}>
            <div className="space-y-4">
              {LEAN_DOMAINS.map((d) => (
                <div key={d.id}>
                  <div className="mb-1.5 text-sm font-medium text-[#1a1a2e]">{d.label}</div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                      {d.left}
                    </span>
                    <div className="flex flex-1 justify-between gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setLean({ ...lean, [d.id]: v })}
                          className={`h-7 flex-1 rounded-md border text-xs transition-colors ${
                            lean[d.id] === v
                              ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
                              : "border-border bg-white hover:border-[#1b3a6b]/40"
                          }`}
                          aria-label={`${d.label} ${v}`}
                        >
                          {lean[d.id] === v ? "●" : ""}
                        </button>
                      ))}
                    </div>
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{d.right}</span>
                  </div>
                </div>
              ))}
            </div>
            <Field label="Core values" className="mt-5">
              <textarea
                value={coreValues}
                onChange={(e) => setCoreValues(e.target.value)}
                rows={2}
                placeholder={COPY.coreValuesPlaceholder}
                className={inputCls}
              />
            </Field>
            <Field label={COPY.admireLabel}>
              <input
                value={admire}
                onChange={(e) => setAdmire(e.target.value)}
                placeholder={COPY.admirePlaceholder}
                className={inputCls}
              />
            </Field>
          </Section>
        )}

        {current.id === "voice" && (
          <Section title="Voice & style" hint={COPY.voiceHint}>
            <div className="flex flex-wrap gap-2">
              {VOICE_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setVoiceTone(t)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    voiceTone === t
                      ? "border-[#1b3a6b] bg-[#1b3a6b]/5 font-medium text-[#1a1a2e]"
                      : "border-border text-muted-foreground hover:border-[#1b3a6b]/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Field label="Or describe it yourself" className="mt-4">
              <input
                value={voiceTone}
                onChange={(e) => setVoiceTone(e.target.value)}
                placeholder="e.g. warm, plainspoken, never preachy"
                className={inputCls}
              />
            </Field>
          </Section>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <button
            onClick={() => (step === 0 ? onExit() : setStep(step - 1))}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Exit" : "Back"}
          </button>
          <Button onClick={saveAndNext} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-1.5 h-4 w-4" />
            )}
            {step === STEPS.length - 1 ? "Finish" : "Save & continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a1a2e]">{title}</h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{hint}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
