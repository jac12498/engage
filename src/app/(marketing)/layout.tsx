// Public marketing route group. Each marketing page renders its own SiteHeader /
// SiteFooter (the dark navy chrome), so this layout is a pass-through — it just
// scopes the group. Root layout provides <html>/<body> and base metadata.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children
}
