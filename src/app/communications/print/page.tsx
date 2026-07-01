import { MediumGenerator } from "@/components/communications/MediumGenerator"
import { MEDIUM_LABELS } from "@/lib/comms/prompts"
import { loadMediumData } from "../mediumData"

export default async function PrintPage() {
  const data = await loadMediumData("print")
  return <MediumGenerator medium="print" mediumLabel={MEDIUM_LABELS.print} {...data} />
}
