import { prisma } from "@/lib/prisma"

// Public, unauthenticated: the volunteer form on a published candidate site.
export async function POST(req: Request) {
  let body: { campaignId?: string; name?: string; email?: string; phone?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Bad request", { status: 400 })
  }

  const campaignId = typeof body.campaignId === "string" ? body.campaignId : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response("Name and a valid email are required.", { status: 400 })
  }

  // Only accept signups for a published site.
  const site = await prisma.website.findUnique({
    where: { campaignId },
    select: { id: true, published: true },
  })
  if (!site || !site.published) return new Response("Not found", { status: 404 })

  await prisma.volunteerSignup.create({
    data: {
      websiteId: site.id,
      name: name.slice(0, 200),
      email: email.slice(0, 200),
      phone: phone ? phone.slice(0, 50) : null,
      message: message ? message.slice(0, 2000) : null,
    },
  })

  return Response.json({ ok: true })
}
