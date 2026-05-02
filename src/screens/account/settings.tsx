import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { ChevronRight, FileText, LifeBuoy, Shield } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '@/screens/console-routes'

export function SettingsScreen() {
    return (
        <section className="mx-auto max-w-content-sm">
            <Header.Root className="p-4 pt-8">
                <Header.Lead className="gap-2">
                    <Title.h6>Settings</Title.h6>
                    <Paragraph.sm className="text-tertiary">
                        Workspace preferences and platform information.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Divider className="px-4 my-2" />

            <div className="p-4">
                <Label.md className="block pb-3">Legal</Label.md>
                <div className="flex flex-col">
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
                </div>
            </div>

            <Divider className="px-4 my-2" />

            <div className="p-4">
                <Label.md className="block pb-3">Support</Label.md>
                <div className="flex flex-col">
                    <SettingsLink
                        to={`/${routes.support}`}
                        icon={<LifeBuoy className="size-4" />}
                        title="Help center"
                        description="Common questions, guides, and how to contact us."
                    />
                </div>
            </div>
        </section>
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
