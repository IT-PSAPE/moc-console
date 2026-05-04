import { Divider } from '@/components/display/divider'
import { Label, Paragraph } from '@/components/display/text'
import { ChevronRight, FileText, LifeBuoy, Shield } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/screens/console-routes'

export function GeneralTab() {
    return (
        <div className="flex flex-col">
            <Section title="Legal">
                <SettingsLink
                    to={`/${routes.terms}`}
                    icon={<FileText className="size-4" />}
                    title="Terms of Service"
                    description="The agreement governing your use of MOC Console."
                />
                <SettingsLink
                    to={`/${routes.privacy}`}
                    icon={<Shield className="size-4" />}
                    title="Privacy Policy"
                    description="How we collect, use, store, and share your data."
                />
            </Section>

            <Divider className="my-2" />

            <Section title="Support">
                <SettingsLink
                    to={`/${routes.support}`}
                    icon={<LifeBuoy className="size-4" />}
                    title="Help center"
                    description="Common questions, guides, and how to contact us."
                />
            </Section>
        </div>
    )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="py-2">
            <Label.md className="block pb-3">{title}</Label.md>
            <div className="flex flex-col">{children}</div>
        </div>
    )
}

type SettingsLinkProps = {
    to: string
    icon: ReactNode
    title: string
    description: string
}

function SettingsLink({ to, icon, title, description }: SettingsLinkProps) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-secondary"
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary">
                {icon}
            </span>
            <span className="flex flex-1 flex-col">
                <Label.sm>{title}</Label.sm>
                <Paragraph.xs className="text-tertiary">{description}</Paragraph.xs>
            </span>
            <ChevronRight className="size-4 shrink-0 text-tertiary" />
        </Link>
    )
}
