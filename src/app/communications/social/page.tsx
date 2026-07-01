import { MediumGenerator } from "@/components/communications/MediumGenerator"
import { MEDIUM_LABELS } from "@/lib/comms/prompts"
import { loadMediumData } from "../mediumData"

export default async function SocialPage() {
  const data = await loadMediumData("social")
  return <MediumGenerator medium="social" mediumLabel={MEDIUM_LABELS.social} {...data} />
}
