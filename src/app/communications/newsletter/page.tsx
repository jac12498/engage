import { MediumGenerator } from "@/components/communications/MediumGenerator"
import { MEDIUM_LABELS } from "@/lib/comms/prompts"
import { loadMediumData } from "../mediumData"

export default async function NewsletterArticlesPage() {
  const data = await loadMediumData("newsletter")
  return <MediumGenerator medium="newsletter" mediumLabel={MEDIUM_LABELS.newsletter} {...data} />
}
