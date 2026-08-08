import { Title, Paragraph } from "@moc/ui/components/display/text"
import { Card } from "@moc/ui/components/display/card"
import { PublicLayout } from "./layout"
import { PublicDocumentSection as Section } from "./public-document-section"
import { PublicDocumentStep as Step } from "./public-document-step"
import { PublicDocumentScopeRow as ScopeRow } from "./public-document-scope-row"

export function ZoomReviewTestPlanScreen() {
  return (
    <PublicLayout>
      <Title.h1 className="mb-2 title-h3">Zoom reviewer test plan</Title.h1>
      <Paragraph.sm className="text-tertiary mb-8">
        A production-app verification plan for Zoom Marketplace reviewers.
      </Paragraph.sm>

      <Paragraph.md className="mb-6">
        MOC Console accounts are free. This page contains no test credentials or secrets; use the reviewer account
        and production-app installation provided through the Zoom Marketplace review process.
      </Paragraph.md>

      <Section title="Requested scopes and test coverage">
        <Card.Content className="bg-secondary_alt">
          <ScopeRow scope="user:read:user" reason="Verify the authorized host's identity after connection." />
          <ScopeRow scope="meeting:read:list_meetings" reason="Verify the host's scheduled-meeting list after connection and during a manual refresh." />
          <ScopeRow scope="meeting:write:meeting" reason="Create a scheduled meeting from MOC Console." />
          <ScopeRow scope="meeting:update:meeting" reason="Edit a scheduled meeting from MOC Console." />
          <ScopeRow scope="meeting:delete:meeting" reason="Delete the reviewer-created test meeting from MOC Console." last />
        </Card.Content>
      </Section>

      <Section title="Reviewer workflow">
        <Step number={1} title="Authorize the production app">
          <Paragraph.md>
            Sign in to a free MOC Console account, open <em>Settings → Streaming connections</em>, and select
            <strong> Connect Zoom</strong>. Complete authorization with the reviewer Zoom account in the production app.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: Zoom returns to the Streaming connections settings tab, displays the authorized Zoom
            account, and imports its upcoming meetings. This verifies <code>user:read:user</code> and
            <code> meeting:read:list_meetings</code>.
          </Paragraph.md>
        </Step>

        <Step number={2} title="Verify the meeting list">
          <Paragraph.md>
            Open <em>Streams</em> and select <strong>Refresh</strong> in the toolbar. If needed, first create a
            scheduled test meeting in Zoom's web portal.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: upcoming meetings for the authorized Zoom host are imported into the Streams list. This
            verifies <code>meeting:read:list_meetings</code>.
          </Paragraph.md>
        </Step>

        <Step number={3} title="Create a test meeting">
          <Paragraph.md>
            In <em>Streams</em>, select <strong>+</strong>, choose <em>Zoom Meeting</em>, enter a unique topic and a
            future start time, then select <strong>Create</strong>.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: the meeting appears immediately in Streams and in the reviewer's Zoom account. This
            verifies <code>meeting:write:meeting</code>.
          </Paragraph.md>
        </Step>

        <Step number={4} title="Edit the test meeting">
          <Paragraph.md>
            Open the test meeting from <em>Streams</em>, select the edit control, change its topic or scheduled time,
            and save.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: the updated values appear in MOC Console and in Zoom. This uses
            <code> meeting:update:meeting</code> only for the reviewer-selected meeting.
          </Paragraph.md>
        </Step>

        <Step number={5} title="Delete the test meeting">
          <Paragraph.md>
            With the same future test meeting open, select the delete control and confirm the deletion.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: the meeting is removed from Streams and the reviewer's Zoom account. This verifies
            <code>meeting:delete:meeting</code>.
          </Paragraph.md>
        </Step>

        <Step number={6} title="Disconnect and reconnect">
          <Paragraph.md>
            Return to <em>Settings → Streaming connections</em>, select <strong>Disconnect</strong>, then connect the
            same reviewer account again.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: disconnect revokes MOC Console's Zoom access and deletes stored OAuth credentials,
            connection data, synced Zoom meeting metadata, and pending meeting notifications. Reconnecting restores
            access for future actions.
          </Paragraph.md>
        </Step>

        <Step number={7} title="Verify Marketplace uninstall cleanup">
          <Paragraph.md>
            In the Zoom Marketplace, open <em>Manage → Added Apps</em>, find MOC Console, and select
            <strong> Remove</strong>.
          </Paragraph.md>
          <Paragraph.md className="mt-2 text-tertiary">
            Expected result: when Zoom sends its Marketplace removal notification, MOC Console deletes the associated
            OAuth tokens, connection data, and Zoom meeting metadata. Reinstall and authorize the production app to
            use Zoom again.
          </Paragraph.md>
        </Step>
      </Section>

      <Section title="Reviewer notes">
        <ul className="list-disc space-y-2 pl-6">
          <li><Paragraph.md>Use a future scheduled test meeting so it can be edited and deleted through Zoom's API.</Paragraph.md></li>
          <li><Paragraph.md>MOC Console does not request recording, transcript, chat, participant-list, account-admin, or host-start-URL access.</Paragraph.md></li>
          <li><Paragraph.md>The public <em>Zoom integration guide</em> contains the end-user setup, data-handling, and support details.</Paragraph.md></li>
        </ul>
      </Section>
    </PublicLayout>
  )
}
