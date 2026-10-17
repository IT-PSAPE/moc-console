import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@moc/utils/cn";
import { ArrowLeft } from "lucide-react";
import { Button } from "../controls/button";
import { Divider } from "../display/divider";
import { Header } from "../display/header";
import { Page } from "./page";

function DetailPageRoot({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <Page className={className} {...props}>
            <Page.Content width="standard" className="px-0">{children}</Page.Content>
        </Page>
    );
}

function DetailPageHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <Header className={cn("px-page-gutter pt-2 pb-4", className)} {...props}>{children}</Header>;
}

function DetailPageBack({ children, className, ...props }: ComponentProps<typeof Button.Link>) {
    return (
        <div className="px-page-gutter pt-3">
            <Button.Link size="sm" className={cn("-ml-2 w-fit gap-1.5 px-2", className)} variant="ghost" icon={<ArrowLeft />} {...props}>{children}</Button.Link>
        </div>
    );
}

function DetailPageSection({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return <section className={cn("px-page-gutter py-5", className)} {...props}>{children}</section>;
}

function DetailPageDivider({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <Divider className={cn("my-0", className)} {...props} />;
}

export const DetailPage = Object.assign(DetailPageRoot, {
    Back: DetailPageBack,
    Divider: DetailPageDivider,
    Header: DetailPageHeader,
    Section: DetailPageSection,
});
