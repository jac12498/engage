import { MediumGenerator } from "@/components/communications/MediumGenerator"
import { MEDIUM_LABELS } from "@/lib/comms/prompts"
import { loadMediumData } from "../mediumData"

export default async function SpeechesPage() {
  const data = await loadMediumData("speeches")
  return <MediumGenerator medium="speeches" mediumLabel={MEDIUM_LABELS.speeches} {...data} />
}
