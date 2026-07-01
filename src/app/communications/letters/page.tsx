import { MediumGenerator } from "@/components/communications/MediumGenerator"
import { MEDIUM_LABELS } from "@/lib/comms/prompts"
import { loadMediumData } from "../mediumData"

export default async function LettersPage() {
  const data = await loadMediumData("letters")
  return <MediumGenerator medium="letters" mediumLabel={MEDIUM_LABELS.letters} {...data} />
}
