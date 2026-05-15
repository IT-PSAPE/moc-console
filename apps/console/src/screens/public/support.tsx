import { Title, Paragraph, Label } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { Link } from "react-router-dom"
import { routes } from "@/screens/console-routes"
import { PublicLayout } from "./layout"

export function SupportScreen() {
  return (
    <PublicLayout>
      <Title.h3 className="mb-2">Support</Title.h3>
      <Paragraph.sm className="text-tertiary mb-8">
        Help with connecting Zoom, syncing meetings, managing users, and everything else in MOC Console.
      </Paragraph.sm>

      <Section title="Contact us">
        <Paragraph.md className="mb-3">
          The fastest way to reach the team is by email. We read every message and respond in the order received.
        </Paragraph.md>
        <div className="rounded-lg border border-tertiary bg-secondary_alt p-5 mb-4">
          <Label.sm className="block mb-1">Email</Label.sm>
          <a href="mailto:psape.dev@gmail.com" className="title-h6 text-brand hover:underline">psape.dev@gmail.com</a>
        </div>
        <Paragraph.md>
          <strong>Response time:</strong> we aim to reply within <strong>2 business days</strong>.
          Urgent issues affecting a live broadcast are prioritized — put <em>URGENT</em> in the subject line.
        </Paragraph.md>
      </Section>

      <Section title="What to include in a support request">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>The email address associated with your MOC Console account.</Paragraph.md></li>
          <li><Paragraph.md>Your workspace name.</Paragraph.md></li>
          <li><Paragraph.md>A short description of what you were trying to do and what happened instead.</Paragraph.md></li>
          <li><Paragraph.md>The approximate time the problem occurred (including timezone).</Paragraph.md></li>
          <li><Paragraph.md>Screenshots or screen recordings where possible.</Paragraph.md></li>
          <li><Paragraph.md>For Zoom issues, the affected meeting ID or topic.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="Common questions">
        <FAQ
          question="How do I connect my Zoom account?"
          answer={<>Open <em>Streams → Zoom</em> and click <strong>Connect Zoom</strong>. You'll be redirected to Zoom to approve the requested scopes, then returned to MOC Console. The full walkthrough is in the <Link to={`/${routes.zoomDocs}`} className="text-brand hover:underline">Zoom integration guide</Link>.</>}
        />
        <FAQ
          question="My Zoom meetings aren't showing up."
          answer={<>Click the <strong>refresh</strong> icon in the Zoom Meetings section to trigger a manual sync. If meetings created outside MOC Console still don't appear, disconnect and reconnect Zoom to re-issue your access tokens.</>}
        />
        <FAQ
          question="How do I disconnect Zoom?"
          answer={<>Open <em>Streams → Zoom</em> and click <strong>Disconnect</strong>. This revokes the OAuth token with Zoom and removes the stored connection. You can also uninstall the app from the Zoom Marketplace under <em>Settings → Integrations</em>.</>}
        />
        <FAQ
          question="What data does MOC Console read from Zoom?"
          answer={<>Only what the workflow needs: your Zoom user profile and metadata for the meetings you manage through the Service. No recordings, transcripts, chat messages, or participant lists. See the <Link to={`/${routes.privacy}`} className="text-brand hover:underline">Privacy Policy</Link> for details.</>}
        />
        <FAQ
          question="How do I delete my account or my data?"
          answer={<>Email <a href="mailto:psape.dev@gmail.com" className="text-brand hover:underline">psape.dev@gmail.com</a> from the address associated with your account and we will process the request within the timeframe required by applicable law. You can also disconnect Zoom at any time directly from the Streams screen.</>}
        />
      </Section>

      <Section title="Status and incidents">
        <Paragraph.md>
          Major incidents and planned maintenance are communicated by email to workspace administrators. If
          the Service appears unreachable, check that third-party dependencies (Zoom, YouTube, Supabase) are
          operating normally on their respective status pages before filing a ticket.
        </Paragraph.md>
      </Section>
    </PublicLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <Divider className="mb-6" />
      <Label.lg className="block mb-4">{title}</Label.lg>
      {children}
    </section>
  )
}

function FAQ({ question, answer }: { question: string; answer: React.ReactNode }) {
  return (
    <div className="mb-5">
      <Label.md className="block mb-1.5">{question}</Label.md>
      <Paragraph.md className="text-tertiary">{answer}</Paragraph.md>
    </div>
  )
}
