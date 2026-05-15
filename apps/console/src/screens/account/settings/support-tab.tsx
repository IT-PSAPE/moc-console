import { Divider } from '@moc/ui/components/display/divider'
import { Section } from '@moc/ui/components/display/section'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { ChevronRight, ExternalLink, FileText, LifeBuoy, Shield } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/screens/console-routes'

export function SupportTab() {
    return (
        <div className="flex flex-col">
            <Section>
                <Section.Header title="Support" />

                <Divider className="py-6" />

                <Section.Body>
                    <SettingsLink
                        external
                        to={`/${routes.support}`}
                        icon={<LifeBuoy className="size-4" />}
                        title="Help center"
                        description="Common questions, guides, and how to contact us."
                    />

                    <Divider className="py-6" />

                    <SettingsLink
                        external
                        to={`/${routes.terms}`}
                        icon={<FileText className="size-4" />}
                        title="Terms of Service"
                        description="The agreement governing your use of MOC Console."
                    />

                    <Divider className="py-6" />

                    <SettingsLink
                        external
                        to={`/${routes.privacy}`}
                        icon={<Shield className="size-4" />}
                        title="Privacy Policy"
                        description="How we collect, use, store, and share your data."
                    />
                </Section.Body>
            </Section>
        </div>
    )
}

type SettingsLinkProps = {
    to: string
    icon: ReactNode
    title: string
    description: string
    external?: boolean
}

function SettingsLink({ to, icon, title, description, external }: SettingsLinkProps) {
    return (
        <Link
            to={to}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-secondary"
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary">
                {icon}
            </span>
            <span className="flex flex-1 flex-col">
                <Label.sm>{title}</Label.sm>
                <Paragraph.xs className="text-tertiary">{description}</Paragraph.xs>
            </span>
            {external ? <ExternalLink className="size-4 shrink-0 text-tertiary" /> : <ChevronRight className="size-4 shrink-0 text-tertiary" />}
        </Link>
    )
}
