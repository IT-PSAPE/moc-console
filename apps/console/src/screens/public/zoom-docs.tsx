import { Title, Paragraph, Label } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { Link } from "react-router-dom"
import { routes } from "@/screens/console-routes"
import { PublicLayout } from "./layout"

export function ZoomDocsScreen() {
  return (
    <PublicLayout>
      <Title.h3 className="mb-2">Zoom integration guide</Title.h3>
      <Paragraph.sm className="text-tertiary mb-8">
        How to add, use, and remove the MOC Console Zoom app. Applies to all MOC Console workspaces.
      </Paragraph.sm>

      <Paragraph.md className="mb-6">
        MOC Console lets your production team schedule, sync, and manage Zoom meetings alongside YouTube
        live streams in one console. This guide covers installing the Zoom app, day-to-day use, and removing
        the app when you no longer need it.
      </Paragraph.md>

      <Section title="Before you start">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>You need a MOC Console account and permission to manage the workspace's broadcast integrations.</Paragraph.md></li>
          <li><Paragraph.md>You need a Zoom account. If your organization uses Zoom with SSO, you'll authenticate via SSO during installation.</Paragraph.md></li>
          <li><Paragraph.md>Only one Zoom account can be connected per MOC Console workspace. To change which Zoom account is connected, disconnect the current one first.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="Adding the app (connecting Zoom)">
        <Step number={1} title="Open the Streams screen">
          <Paragraph.md>Sign in to MOC Console and navigate to <em>Broadcast → Streams</em> from the sidebar.</Paragraph.md>
        </Step>
        <Step number={2} title="Click Connect Zoom">
          <Paragraph.md>In the <strong>Zoom</strong> connection card, click <strong>Connect Zoom</strong>. You'll be redirected to Zoom's authorization page.</Paragraph.md>
        </Step>
        <Step number={3} title="Review and approve the requested scopes">
          <Paragraph.md className="mb-3">Zoom will display the scopes MOC Console is requesting. Approve to continue. The requested scopes and why we need each one:</Paragraph.md>
          <div className="rounded-lg border border-tertiary bg-secondary_alt">
            <ScopeRow scope="user:read:user" reason="Identify the Zoom host (user ID, email, display name) after you authorize the app." />
            <ScopeRow scope="meeting:read:meeting" reason="Read the details of an individual meeting when viewed or edited in MOC Console." />
            <ScopeRow scope="meeting:read:list_meetings" reason="List your scheduled meetings when you refresh the Streams screen." />
            <ScopeRow scope="meeting:write:meeting" reason="Create a new meeting or update an existing one when you schedule or edit it in MOC Console." />
            <ScopeRow scope="meeting:delete:meeting" reason="Delete a meeting when you remove it from the MOC Console schedule." last />
          </div>
        </Step>
        <Step number={4} title="You're connected">
          <Paragraph.md>Zoom redirects you back to MOC Console. Your meetings begin syncing automatically. The Zoom card now shows your connected account.</Paragraph.md>
        </Step>
      </Section>

      <Section title="Using the app">
        <SubSection title="Creating a meeting">
          <Paragraph.md className="mb-3">
            From the Streams screen, click the <strong>+</strong> button in the <em>Zoom Meetings</em> card. Fill in the
            topic, description, start time, duration, timezone, and recurrence. Toggle host settings (waiting room,
            mute on entry, continuous chat) as needed and click <strong>Create</strong>. The meeting is created on
            Zoom via the API and appears immediately in your workspace.
          </Paragraph.md>
        </SubSection>
        <SubSection title="Syncing meetings">
          <Paragraph.md>
            MOC Console syncs Zoom meetings automatically when the Streams screen loads. To pull in changes made
            elsewhere (Zoom client, web portal, other tools), click the refresh icon in the <em>Zoom Meetings</em> card header.
          </Paragraph.md>
        </SubSection>
        <SubSection title="Editing a meeting">
          <Paragraph.md>
            Click a meeting to open its detail drawer, then click the pencil icon. Update any field and save. Changes
            are pushed to Zoom and reflected across your workspace. Click the expand icon in the drawer to open the
            full detail page.
          </Paragraph.md>
        </SubSection>
        <SubSection title="Sharing the join link">
          <Paragraph.md>
            Open a meeting's detail view to copy the join link and passcode, or open the meeting directly in Zoom via
            the external-link icon. The join link and passcode are stored securely and only visible to authenticated
            members of your workspace.
          </Paragraph.md>
        </SubSection>
        <SubSection title="Deleting a meeting">
          <Paragraph.md>
            Open the meeting's detail drawer or full detail page and click the trash icon, then confirm. The meeting
            is deleted from Zoom and removed from your workspace. This cannot be undone.
          </Paragraph.md>
        </SubSection>
      </Section>

      <Section title="Removing the app (disconnecting Zoom)">
        <Paragraph.md className="mb-4">There are two ways to disconnect — both fully revoke MOC Console's access to your Zoom account.</Paragraph.md>

        <SubSection title="Option 1: Disconnect from MOC Console">
          <Step number={1} title="Open the Streams screen">
            <Paragraph.md>Navigate to <em>Broadcast → Streams</em>.</Paragraph.md>
          </Step>
          <Step number={2} title="Click Disconnect">
            <Paragraph.md>In the Zoom connection card, click <strong>Disconnect</strong> and confirm.</Paragraph.md>
          </Step>
          <Step number={3} title="What happens">
            <Paragraph.md>MOC Console revokes the OAuth token with Zoom, deletes the stored access and refresh tokens from our database, and removes the connection row. Synced meeting metadata stored in your workspace is retained until you delete it — Zoom is not re-contacted for any future action unless you reconnect.</Paragraph.md>
          </Step>
        </SubSection>

        <SubSection title="Option 2: Remove from the Zoom Marketplace">
          <Step number={1} title="Sign in to the Zoom Marketplace">
            <Paragraph.md>Go to <a href="https://marketplace.zoom.us" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">marketplace.zoom.us</a> and sign in with the Zoom account connected to MOC Console.</Paragraph.md>
          </Step>
          <Step number={2} title="Open Added Apps / Manage">
            <Paragraph.md>Click your avatar → <em>Manage</em> → <em>Added Apps</em>, or browse directly to the <em>Settings → Integrations</em> area.</Paragraph.md>
          </Step>
          <Step number={3} title="Find MOC Console and click Remove">
            <Paragraph.md>Locate MOC Console in your added apps and click <strong>Remove</strong>. Confirm when prompted.</Paragraph.md>
          </Step>
          <Step number={4} title="What happens">
            <Paragraph.md>Zoom immediately invalidates all tokens issued to MOC Console for your account. Any subsequent API call MOC Console attempts will fail. The next time you open the Streams screen, MOC Console will detect the revoked connection and prompt you to reconnect.</Paragraph.md>
          </Step>
        </SubSection>
      </Section>

      <Section title="Data handling summary">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md><strong>Stored:</strong> Zoom user profile (ID, email, display name), meeting metadata (topic, description, schedule, host settings, join URL, passcode), and OAuth tokens.</Paragraph.md></li>
          <li><Paragraph.md><strong>Not stored or accessed:</strong> recordings, transcripts, cloud recording files, chat messages, participant lists, account or admin-level data.</Paragraph.md></li>
          <li><Paragraph.md><strong>At rest:</strong> all Zoom data is stored in a managed PostgreSQL database on Supabase, encrypted with AES-256 and protected by Row-Level Security policies scoped to your workspace.</Paragraph.md></li>
          <li><Paragraph.md><strong>In transit:</strong> all traffic is TLS 1.2+.</Paragraph.md></li>
          <li><Paragraph.md><strong>Retention:</strong> OAuth tokens and connection data are deleted when you disconnect. Meeting metadata is retained until you delete it. Account data is deleted within 30 days of account deletion.</Paragraph.md></li>
        </ul>
        <Paragraph.md className="mt-4">
          Full details are in the <Link to={`/${routes.privacy}`} className="text-brand hover:underline">Privacy Policy</Link>.
        </Paragraph.md>
      </Section>

      <Section title="Troubleshooting">
        <Troubleshoot
          problem="OAuth redirect fails with a scope error"
          fix="Make sure you're signing in with a Zoom account that has permission to schedule meetings. If you use Zoom SSO, complete the SSO login in the same browser window before retrying."
        />
        <Troubleshoot
          problem="Meetings created in Zoom's web portal don't appear"
          fix="Click the refresh icon in the Zoom Meetings card header to trigger a manual sync. If they still don't appear, disconnect and reconnect Zoom."
        />
        <Troubleshoot
          problem="“Zoom is not connected for this workspace” error"
          fix="Your token may have been revoked externally (e.g., from the Zoom Marketplace). Reconnect Zoom from the Streams screen."
        />
        <Troubleshoot
          problem="Deleting a meeting fails"
          fix="Meetings that have already started or completed cannot be deleted via the API. You can archive or hide them on MOC Console without affecting Zoom."
        />
      </Section>

      <Section title="Need more help?">
        <Paragraph.md>
          Visit the <Link to={`/${routes.support}`} className="text-brand hover:underline">Support page</Link> or
          email <a href="mailto:psape.dev@gmail.com" className="text-brand hover:underline">psape.dev@gmail.com</a>.
        </Paragraph.md>
      </Section>
    </PublicLayout>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <Divider className="mb-6" />
      <Label.lg className="block mb-4">{title}</Label.lg>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <Label.md className="block mb-2">{title}</Label.md>
      {children}
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="size-7 shrink-0 rounded-full bg-brand_secondary text-brand flex items-center justify-center label-sm">{number}</div>
      <div className="flex-1">
        <Label.md className="block mb-1">{title}</Label.md>
        {children}
      </div>
    </div>
  )
}

function ScopeRow({ scope, reason, last }: { scope: string; reason: string; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 px-4 py-3 ${!last ? "border-b border-tertiary" : ""}`}>
      <code className="font-mono text-sm text-primary">{scope}</code>
      <Paragraph.sm className="text-tertiary">{reason}</Paragraph.sm>
    </div>
  )
}

function Troubleshoot({ problem, fix }: { problem: string; fix: string }) {
  return (
    <div className="mb-4">
      <Label.md className="block mb-1">{problem}</Label.md>
      <Paragraph.md className="text-tertiary">{fix}</Paragraph.md>
    </div>
  )
}
