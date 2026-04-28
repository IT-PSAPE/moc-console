import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { routes } from "@/screens/console-routes"

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-primary text-primary">
      <header className="border-b border-secondary">
        <div className="mx-auto max-w-content-md flex items-center gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-brand_solid">
              <img src="./logo.svg" alt="" className="w-full h-full" />
            </div>
            <span className="label-md">MOC Console</span>
          </Link>
          <nav className="ml-auto flex items-center gap-5">
            <Link to={`/${routes.zoomDocs}`} className="paragraph-sm text-tertiary hover:text-primary">Docs</Link>
            <Link to={`/${routes.support}`} className="paragraph-sm text-tertiary hover:text-primary">Support</Link>
            <Link to={`/${routes.privacy}`} className="paragraph-sm text-tertiary hover:text-primary">Privacy</Link>
            <Link to={`/${routes.terms}`} className="paragraph-sm text-tertiary hover:text-primary">Terms</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <article className="mx-auto max-w-content-sm px-6 py-12">
          {children}
        </article>
      </main>

      <footer className="border-t border-secondary mt-16">
        <div className="mx-auto max-w-content-md px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 items-center">
          <p className="paragraph-xs text-tertiary">© 2026 PSAPE. All rights reserved.</p>
          <div className="ml-auto flex gap-4">
            <Link to={`/${routes.privacy}`} className="paragraph-xs text-tertiary hover:text-primary">Privacy</Link>
            <Link to={`/${routes.terms}`} className="paragraph-xs text-tertiary hover:text-primary">Terms</Link>
            <Link to={`/${routes.support}`} className="paragraph-xs text-tertiary hover:text-primary">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
