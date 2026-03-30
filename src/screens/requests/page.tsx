import { Card } from '@/components/card'
import { Button } from '@/components/controls/button'
import { Checkbox } from '@/components/form/checkbox'
import { Input } from '@/components/form/input'
import { Header } from '@/components/header'
import { Modal } from '@/components/modal'
import { RequestItem } from '@/components/request-item'
import { Tabs } from '@/components/tabs'
import { Label, Paragraph, TextBlock, Title } from '@/components/text'
import { Dot, Search, Settings2, X } from 'lucide-react'


export function RequestsOverviewScreen() {
    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Welcome to the MOC Console dashboard. Here you can find an overview of all your activities and access various features.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Active Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>12</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>7</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>5</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Completed Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>14</TextBlock>
                    </Card.Content>
                </Card.Root>
            </div>

            <div className='flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Modal.Root>
                    <Header.Root className='pt-8'>
                        <Header.Lead className='gap-2'>
                            <Label.md>Dashboard</Label.md>
                        </Header.Lead>
                        <Header.Trail className='gap-2 flex-1 justify-end '>
                            <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-sm' />
                            <Modal.Trigger>
                                <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                            </Modal.Trigger>
                        </Header.Trail>
                    </Header.Root>

                    <FilterModal />
                </Modal.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='space-y-1.5'>
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='space-y-1.5'>
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                    </Card.Content>
                </Card.Root>
            </div>
        </section>
    )
}

function FilterModal() {
    return (
        <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Positioner className='justify-end p-0'>
                <Modal.Panel className='h-full'>
                    <Modal.Header>
                        <div className='flex-1'>
                            <Label.md>Filter</Label.md>
                            <Paragraph.xs>Description</Paragraph.xs>
                        </div>
                        <Modal.Close>
                            <Button variant='secondary' icon={<X />} iconOnly />
                        </Modal.Close>
                    </Modal.Header>

                    <Modal.Content>
                        <Tabs.Root defaultTab={'filters'}>
                            <Tabs.List>
                                <Tabs.Tab value="filters">Filters</Tabs.Tab>
                                <Tabs.Tab value="sort">Sort</Tabs.Tab>
                            </Tabs.List>
                            <Tabs.Panels>
                                <Tabs.Panel value='filters'>
                                    <div className="py-2">
                                        <Paragraph.md className='px-4 py-1.5 text-quaternary'>Type</Paragraph.md>
                                        <div className='grid grid-cols-2 gap-2 px-4 ' >
                                            <Checkbox>Video Filming & Production</Checkbox>
                                            <Checkbox>Design Flyer</Checkbox>
                                            <Checkbox>Video Filming</Checkbox>
                                            <Checkbox>Design Special</Checkbox>
                                            <Checkbox>Event</Checkbox>
                                            <Checkbox>Video Editing</Checkbox>
                                            <Checkbox>Equipment</Checkbox>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <Paragraph.md className='px-4 py-1.5 text-quaternary'>Priority</Paragraph.md>
                                        <div className='grid grid-cols-2 gap-2 px-4 ' >
                                            <Checkbox>Low</Checkbox>
                                            <Checkbox>Medium</Checkbox>
                                            <Checkbox>High</Checkbox>
                                            <Checkbox>Urgent</Checkbox>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <Paragraph.md className='px-4 py-1.5 text-quaternary'>Timeline</Paragraph.md>
                                        <div className='flex flex-col gap-2 px-4' >
                                            <Input placeholder='Start Date' />
                                            <Input placeholder='End Date' />
                                        </div>
                                    </div>
                                </Tabs.Panel>
                                <Tabs.Panel value='sort'>
                                    <div className="py-2">
                                        <Paragraph.md className='px-4 py-1.5 text-quaternary'>Sort</Paragraph.md>
                                    </div>
                                </Tabs.Panel>
                            </Tabs.Panels>
                        </Tabs.Root>
                    </Modal.Content>

                    <Modal.Footer className='*:w-full'>
                        <Modal.Close onClick={() => { }}>
                            <Button variant='secondary' className='w-full'>Cancel</Button>
                        </Modal.Close>
                        <Modal.Close>
                            <Button className='w-full'>Continue</Button>
                        </Modal.Close>
                    </Modal.Footer>
                </Modal.Panel>
            </Modal.Positioner>
        </Modal.Portal>
    )
}
