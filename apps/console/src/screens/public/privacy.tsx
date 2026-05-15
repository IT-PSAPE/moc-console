import { Title, Paragraph, Label } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { PublicLayout } from "./layout"

export function PrivacyPolicyScreen() {
  return (
    <PublicLayout>
      <Title.h3 className="mb-2">Privacy Policy</Title.h3>
      <Paragraph.sm className="text-tertiary mb-8">Last updated: 3 May 2026</Paragraph.sm>

      <Paragraph.md className="mb-8">
        This Privacy Policy describes how PSAPE ("we," "us," or "our") collects, uses, shares,
        retains, and protects personal information when you use MOC Console (the "Service"). By using the
        Service, you agree to the practices described here. If you do not agree, do not use the Service.
      </Paragraph.md>

      <Section title="1. Information We Collect">
        <Paragraph.md className="mb-3"><strong>Account information.</strong> When you create an account or are invited to a workspace, we collect your name, email address, and the organization/workspace you belong to. Authentication is handled by Supabase Auth.</Paragraph.md>
        <Paragraph.md className="mb-3"><strong>Bug reports.</strong> When you submit a bug report through the in-app "Report a bug" form, we collect the description you write together with diagnostic context captured from your browser at the moment of submission: the page URL you were on, your user-agent string and platform, viewport size, device pixel ratio, timezone, locale, and the app version. This is the minimum information we need to reproduce the issue and is not used for any other purpose.</Paragraph.md>
        <Paragraph.md className="mb-3"><strong>Zoom information.</strong> When you connect a Zoom account, we receive and store:</Paragraph.md>
        <ul className="list-disc pl-6 space-y-1 mb-3">
          <li><Paragraph.md>Your Zoom user profile (Zoom user ID, email address, display name).</Paragraph.md></li>
          <li><Paragraph.md>Metadata for meetings you schedule, read, edit, or delete through the Service (topic, description, start time, duration, timezone, recurrence settings, join URL, passcode, meeting ID).</Paragraph.md></li>
          <li><Paragraph.md>OAuth access tokens and refresh tokens issued by Zoom.</Paragraph.md></li>
        </ul>
        <Paragraph.md className="mb-3"><strong>Data we do <em>not</em> collect from Zoom.</strong> We do not access, request, receive, or store meeting recordings, transcripts, cloud recording files, participant lists, in-meeting chat messages, or account/admin-level data.</Paragraph.md>
        <Paragraph.md><strong>Service usage.</strong> We collect standard server logs (IP address, user-agent, request timestamps) for security, debugging, and abuse prevention.</Paragraph.md>
      </Section>

      <Section title="2. How We Use Information">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>To provide, maintain, and improve the Service.</Paragraph.md></li>
          <li><Paragraph.md>To authenticate you and secure your account.</Paragraph.md></li>
          <li><Paragraph.md>To sync Zoom meetings to your workspace and apply changes you make through the Service back to Zoom on your behalf.</Paragraph.md></li>
          <li><Paragraph.md>To respond to your support requests and bug reports, reproduce reported issues, and communicate with you about the Service.</Paragraph.md></li>
          <li><Paragraph.md>To detect, prevent, and address fraud, abuse, and security incidents.</Paragraph.md></li>
          <li><Paragraph.md>To comply with legal obligations.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="3. How We Share Information">
        <Paragraph.md className="mb-3">We do not sell your personal information. We share information only in these limited cases:</Paragraph.md>
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md><strong>With Zoom.</strong> When you perform an action in the Service that affects a Zoom meeting (create, update, delete, list, read), we send the necessary data to Zoom's API on your behalf under the OAuth authorization you granted.</Paragraph.md></li>
          <li><Paragraph.md><strong>With service providers.</strong> We use Supabase (database, authentication, and storage) to host your data. Supabase processes data only under our instructions and under its own privacy and security commitments.</Paragraph.md></li>
          <li><Paragraph.md><strong>With your workspace members.</strong> Data you add to a workspace is visible to other authenticated members of that workspace.</Paragraph.md></li>
          <li><Paragraph.md><strong>For legal reasons.</strong> We may disclose information if required by law, subpoena, or other legal process, or to protect the rights, property, or safety of users or the public.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="4. Data Retention">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md><strong>Zoom tokens and connection data</strong> are retained only while the connection is active. Disconnecting Zoom inside the Service (or revoking the app from the Zoom Marketplace) triggers revocation of the tokens with Zoom and deletion of the connection row in our database.</Paragraph.md></li>
          <li><Paragraph.md><strong>Synced meeting metadata</strong> is retained while your workspace is active so you can view historical schedules. You can delete individual meetings at any time.</Paragraph.md></li>
          <li><Paragraph.md><strong>Account data</strong> is retained for the life of your account. If you delete your account, we remove your personal information within 30 days, except where longer retention is required by law (e.g., tax, audit, or legal-hold obligations).</Paragraph.md></li>
          <li><Paragraph.md><strong>Server logs</strong> are retained for up to 90 days.</Paragraph.md></li>
          <li><Paragraph.md><strong>Bug reports</strong> are retained for up to 12 months after a report is marked resolved, after which we delete them. You can request earlier deletion of your own reports at any time.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="5. Data Security">
        <Paragraph.md className="mb-3">
          Zoom access tokens, refresh tokens, and meeting metadata are stored in a managed PostgreSQL database
          on Supabase, which encrypts data at rest using <strong>AES-256</strong>. Every row is scoped by
          <code className="mx-1 px-1.5 py-0.5 rounded bg-secondary text-secondary font-mono text-[0.95em]">workspace_id</code>
          and guarded by PostgreSQL <strong>Row-Level Security</strong> policies, so only authenticated members
          of the owning workspace can read or modify the data. The Zoom
          <code className="mx-1 px-1.5 py-0.5 rounded bg-secondary text-secondary font-mono text-[0.95em]">client_secret</code>
          is never stored in the database or sent to the browser; it lives only in server-side environment
          variables on the hosting platform. All traffic between the client, our server, Supabase, and Zoom is
          transmitted over <strong>TLS 1.2+</strong>. No security program is perfect, and we cannot guarantee
          absolute security.
        </Paragraph.md>
      </Section>

      <Section title="6. Your Data Subject Rights">
        <Paragraph.md className="mb-3">
          Depending on where you live, you may have rights under applicable data-protection laws (including
          GDPR, UK GDPR, CCPA/CPRA, and similar regimes). These rights may include:
        </Paragraph.md>
        <ul className="list-disc pl-6 space-y-2 mb-4">
          <li><Paragraph.md><strong>Access</strong> — request a copy of the personal information we hold about you.</Paragraph.md></li>
          <li><Paragraph.md><strong>Correction</strong> — ask us to correct inaccurate or incomplete information.</Paragraph.md></li>
          <li><Paragraph.md><strong>Deletion</strong> — request deletion of your personal information.</Paragraph.md></li>
          <li><Paragraph.md><strong>Portability</strong> — receive your data in a machine-readable format.</Paragraph.md></li>
          <li><Paragraph.md><strong>Objection / Restriction</strong> — object to or restrict certain processing.</Paragraph.md></li>
          <li><Paragraph.md><strong>Withdraw consent</strong> — withdraw any consent you previously gave (this does not affect the lawfulness of processing before withdrawal).</Paragraph.md></li>
          <li><Paragraph.md><strong>Complain</strong> — lodge a complaint with your local data-protection authority.</Paragraph.md></li>
        </ul>
        <Paragraph.md>
          <strong>How to exercise your rights.</strong> Send a request to <strong>psape.dev@gmail.com</strong> from
          the email address associated with your account. We will respond within the timeframe required by
          applicable law (typically 30 days). We may need to verify your identity before fulfilling the request.
          You can also exercise many of these rights directly in the Service: disconnect Zoom at any time from
          the Streams screen, delete meetings you created, or request account deletion from your profile.
        </Paragraph.md>
      </Section>

      <Section title="7. International Transfers">
        <Paragraph.md>
          We may process and store data in countries other than the one in which you live. Where required, we
          use lawful transfer mechanisms (such as Standard Contractual Clauses) to protect your information.
        </Paragraph.md>
      </Section>

      <Section title="8. Children's Privacy">
        <Paragraph.md>
          The Service is not directed to children under the age of 13 (or the equivalent minimum age in your
          jurisdiction). We do not knowingly collect personal information from children. If you believe a
          child has provided us information, contact us at <strong>psape.dev@gmail.com</strong> and we will delete it.
        </Paragraph.md>
      </Section>

      <Section title="9. Changes to This Policy">
        <Paragraph.md>
          We may update this Privacy Policy from time to time. Material changes will be communicated by posting
          the updated policy on this page with a new "Last updated" date, and, where appropriate, by email.
          Continued use of the Service after changes become effective constitutes acceptance of the updated policy.
        </Paragraph.md>
      </Section>

      <Section title="10. Contact Us">
        <Paragraph.md>
          If you have questions about this Privacy Policy or our data practices, contact us at:
        </Paragraph.md>
        <ul className="list-none pl-0 mt-3 space-y-1">
          <li><Paragraph.md><strong>PSAPE</strong></Paragraph.md></li>
          <li><Paragraph.md>562 Hancock St, North End, Gqeberha</Paragraph.md></li>
          <li><Paragraph.md>Email: <strong>psape.dev@gmail.com</strong></Paragraph.md></li>
        </ul>
      </Section>
    </PublicLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <Divider className="mb-6" />
      <Label.lg className="block mb-3">{title}</Label.lg>
      {children}
    </section>
  )
}
