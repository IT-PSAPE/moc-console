import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { RequestItem } from "./request-item";
import { Label } from "@/components/display/text";

export function RequestKanban() {
    return (
        <div className='flex gap-3 p-4 pt-0 mx-auto w-full max-w-content *:flex-1 *:min-w-sm'>
            <Card.Root>
                <Card.Header className='gap-1.5'>
                    <Indicator color='red' className='size-6' />
                    <Label.sm>Not Started</Label.sm>
                </Card.Header>
                <Card.Content ghost className='space-y-1.5'>
                    <RequestItem vertical />
                    <RequestItem vertical />
                    <RequestItem vertical />
                </Card.Content>
            </Card.Root>
            <Card.Root>
                <Card.Header className='gap-1.5'>
                    <Indicator color='yellow' className='size-6' />
                    <Label.sm>In Progress</Label.sm>
                </Card.Header>
                <Card.Content ghost className='space-y-1.5'>
                    <RequestItem vertical />
                    <RequestItem vertical />
                </Card.Content>
            </Card.Root>
            <Card.Root>
                <Card.Header className='gap-1.5'>
                    <Indicator color='green' className='size-6' />
                    <Label.sm>Completed</Label.sm>
                </Card.Header>
                <Card.Content ghost className='space-y-1.5'>
                    <RequestItem vertical />
                    <RequestItem vertical />
                    <RequestItem vertical />
                    <RequestItem vertical />
                    <RequestItem vertical />
                    <RequestItem vertical />
                </Card.Content>
            </Card.Root>
        </div>
    )
}