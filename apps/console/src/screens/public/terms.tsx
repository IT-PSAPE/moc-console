import { Title, Paragraph, Label } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
import { PublicLayout } from "./layout"

export function TermsOfUseScreen() {
  return (
    <PublicLayout>
      <Title.h3 className="mb-2">Terms of Use</Title.h3>
      <Paragraph.sm className="text-tertiary mb-8">Last updated: 3 May 2026</Paragraph.sm>

      <Paragraph.md className="mb-8">
        These Terms of Use ("Terms") form a legally binding agreement between you ("you") and
        PSAPE ("we," "us," or "our") governing your access to and use of MOC Console
        (the "Service"). By creating an account, connecting a third-party service, or otherwise
        using the Service, you agree to be bound by these Terms. If you do not agree, do not use
        the Service.
      </Paragraph.md>

      <Section title="1. The Service">
        <Paragraph.md>
          MOC Console is a broadcast operations console that helps teams coordinate live streams,
          meetings, media, equipment, and production schedules. The Service integrates with third-party
          platforms including Zoom, YouTube, and Supabase to provide its functionality.
        </Paragraph.md>
      </Section>

      <Section title="2. Eligibility and Accounts">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>You must be at least 13 years old (or the equivalent minimum age in your jurisdiction) and legally able to enter into a binding contract.</Paragraph.md></li>
          <li><Paragraph.md>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</Paragraph.md></li>
          <li><Paragraph.md>You must provide accurate information and keep it up to date.</Paragraph.md></li>
          <li><Paragraph.md>You must notify us promptly of any unauthorized use of your account.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="3. Acceptable Use">
        <Paragraph.md className="mb-3">You agree not to:</Paragraph.md>
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>Use the Service for any unlawful purpose or in violation of any applicable law or regulation.</Paragraph.md></li>
          <li><Paragraph.md>Infringe the intellectual property, privacy, or other rights of any person.</Paragraph.md></li>
          <li><Paragraph.md>Attempt to access accounts, data, or systems you are not authorized to access.</Paragraph.md></li>
          <li><Paragraph.md>Reverse-engineer, decompile, or attempt to extract source code, except where permitted by law.</Paragraph.md></li>
          <li><Paragraph.md>Interfere with, overload, or disrupt the Service or the networks it uses.</Paragraph.md></li>
          <li><Paragraph.md>Transmit malware, bulk unsolicited communications, or any content that is harmful, abusive, harassing, or otherwise objectionable.</Paragraph.md></li>
          <li><Paragraph.md>Use the Service to violate Zoom's Terms of Service, YouTube's Terms of Service, or any other third-party terms that apply to a service you connect.</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="4. Third-Party Services">
        <Paragraph.md>
          The Service connects to third-party platforms (including Zoom and YouTube) using credentials you
          provide or authorize via OAuth. Your use of those services is subject to their own terms and privacy
          policies. We are not responsible for third-party services, their availability, or any content or
          data they provide. You can disconnect third-party services at any time from within MOC Console; for
          Zoom, you may additionally revoke the app from the Zoom Marketplace under <em>Settings → Integrations</em>.
        </Paragraph.md>
      </Section>

      <Section title="5. Feedback and Bug Reports">
        <Paragraph.md>
          The Service includes an in-app "Report a bug" feature. When you submit a bug report, you grant us a
          worldwide, perpetual, irrevocable, royalty-free license to use the contents of the report — together
          with the diagnostic context the Service captures automatically (page URL, user-agent, platform,
          viewport, timezone, locale, and app version) — to investigate, reproduce, and fix issues, and to
          improve the Service. We treat the personal information attached to a report (such as the user
          account that submitted it) in accordance with the Privacy Policy.
        </Paragraph.md>
      </Section>

      <Section title="6. Your Content">
        <Paragraph.md>
          You retain all rights to the content you submit, upload, or otherwise make available through the
          Service ("Your Content"). By using the Service, you grant us a limited, worldwide, non-exclusive,
          royalty-free license to host, store, transmit, and display Your Content solely for the purpose of
          operating and providing the Service to you and your workspace. You represent and warrant that you
          have the necessary rights to grant this license and that Your Content does not violate these Terms
          or any applicable law.
        </Paragraph.md>
      </Section>

      <Section title="7. Our Intellectual Property">
        <Paragraph.md>
          The Service, including its software, design, text, graphics, and logos (other than Your Content and
          third-party marks such as Zoom and YouTube), is owned by PSAPE and protected by
          intellectual property laws. Except for the limited rights expressly granted in these Terms, no
          rights are granted to you.
        </Paragraph.md>
      </Section>

      <Section title="8. Fees">
        <Paragraph.md>
          The Service may be offered on a free, paid, or trial basis. If fees apply to your account, they will
          be communicated to you before you incur them. Fees are non-refundable except where required by law
          or expressly stated otherwise.
        </Paragraph.md>
      </Section>

      <Section title="9. Termination">
        <ul className="list-disc pl-6 space-y-2">
          <li><Paragraph.md>You may stop using the Service at any time. You may also delete your account from your profile settings or by contacting us.</Paragraph.md></li>
          <li><Paragraph.md>We may suspend or terminate your access, in whole or in part, with or without notice, if we believe you have violated these Terms or if we need to do so to comply with law or protect the Service or its users.</Paragraph.md></li>
          <li><Paragraph.md>Upon termination, your right to use the Service ceases. Sections that by their nature should survive termination will survive (including IP, disclaimers, liability limits, and governing law).</Paragraph.md></li>
        </ul>
      </Section>

      <Section title="10. Disclaimer of Warranties">
        <Paragraph.md>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
          IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE,
          OR THAT ANY CONTENT WILL BE ACCURATE OR RELIABLE.
        </Paragraph.md>
      </Section>

      <Section title="11. Limitation of Liability">
        <Paragraph.md>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, PSAPE AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND
          AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
          OR ANY LOSS OF PROFITS, REVENUES, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE
          OF THE SERVICE, WHETHER BASED ON CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY
          OTHER THEORY. OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS
          OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE
          TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) USD $100.
        </Paragraph.md>
      </Section>

      <Section title="12. Indemnification">
        <Paragraph.md>
          You agree to indemnify, defend, and hold harmless PSAPE and its affiliates from and against
          any claims, damages, liabilities, losses, and expenses (including reasonable attorneys' fees) arising
          out of or related to your use of the Service, Your Content, or your violation of these Terms or
          applicable law.
        </Paragraph.md>
      </Section>

      <Section title="13. Changes to the Service or These Terms">
        <Paragraph.md>
          We may modify or discontinue the Service, or update these Terms, at any time. Material changes to
          these Terms will be communicated by posting the updated Terms on this page with a new "Last updated"
          date, and, where appropriate, by email. Continued use of the Service after changes become effective
          constitutes acceptance of the updated Terms.
        </Paragraph.md>
      </Section>

      <Section title="14. Contact">
        <Paragraph.md>If you have questions about these Terms, contact us at:</Paragraph.md>
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
