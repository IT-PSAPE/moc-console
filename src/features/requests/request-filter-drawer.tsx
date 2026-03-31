import { Button } from "@/components/controls/button";
import { Divider } from "@/components/display/divider";
import { Label, Paragraph } from "@/components/display/text";
import { Checkbox } from "@/components/form/checkbox";
import { FormLabel } from "@/components/form/form-label";
import { Input } from "@/components/form/input";
import { Radio } from "@/components/form/radio";
import { Tabs } from "@/components/layout/tabs";
import { Drawer } from "@/components/overlays/drawer";
import { X } from "lucide-react";

export function RequestFilterDrawer() {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <Drawer.Header>
                    <div className='flex-1'>
                        <Label.md>Filter</Label.md>
                        <Paragraph.xs>Description</Paragraph.xs>
                    </div>
                    <Drawer.Close>
                        <Button variant='ghost' icon={<X />} iconOnly />
                    </Drawer.Close>
                </Drawer.Header>

                <Drawer.Content>
                    <Tabs.Root defaultTab={'filters'}>
                        <Tabs.List>
                            <Tabs.Tab value="filters">
                                <Label.sm>Filters</Label.sm>
                            </Tabs.Tab>
                            <Tabs.Tab value="sort">
                                <Label.sm>Sort</Label.sm>
                            </Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panels>
                            <Tabs.Panel value='filters'>
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Type</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3 ' >
                                        <Checkbox><FormLabel label="Video Filming & Production" /></Checkbox>
                                        <Checkbox><FormLabel label="Design Flyer" /></Checkbox>
                                        <Checkbox><FormLabel label="Video Filming" /></Checkbox>
                                        <Checkbox><FormLabel label="Design Special" /></Checkbox>
                                        <Checkbox><FormLabel label="Event" /></Checkbox>
                                        <Checkbox><FormLabel label="Video Editing" /></Checkbox>
                                        <Checkbox><FormLabel label="Equipment" /></Checkbox>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Priority</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3 ' >
                                        <Checkbox><FormLabel label="Low" /></Checkbox>
                                        <Checkbox><FormLabel label="Medium" /></Checkbox>
                                        <Checkbox><FormLabel label="High" /></Checkbox>
                                        <Checkbox><FormLabel label="Urgent" /></Checkbox>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Timeline</Paragraph.sm>
                                    <div className='flex gap-2 px-3' >
                                        <label className='space-y-1 *:odd:ml-1'>
                                            <FormLabel label="Start Date" />
                                            <Input placeholder='Start Date' />
                                        </label>
                                        <label className='space-y-1 *:odd:ml-1'>
                                            <FormLabel label="End Date" />
                                            <Input placeholder='End Date' />
                                        </label>
                                    </div>
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel value='sort'>
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Name</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3'>
                                        <Radio name="sort" value="name-asc"><FormLabel label="A-Z" /></Radio>
                                        <Radio name="sort" value="name-desc"><FormLabel label="Z-A" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Due date</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3'>
                                        <Radio name="sort" value="due-asc"><FormLabel label="Ascending" /></Radio>
                                        <Radio name="sort" value="due-desc"><FormLabel label="Descending" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Create date</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3'>
                                        <Radio name="sort" value="created-asc"><FormLabel label="Ascending" /></Radio>
                                        <Radio name="sort" value="created-desc"><FormLabel label="Descending" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className='px-3 py-1.5 text-quaternary'>Type</Paragraph.sm>
                                    <div className='grid grid-cols-2 gap-2 px-3'>
                                        <Radio name="sort" value="type-asc"><FormLabel label="A-Z" /></Radio>
                                        <Radio name="sort" value="type-desc"><FormLabel label="Z-A" /></Radio>
                                    </div>
                                </div>
                            </Tabs.Panel>
                        </Tabs.Panels>
                    </Tabs.Root>
                </Drawer.Content>

                <Drawer.Footer className='*:w-full'>
                    <Drawer.Close>
                        <Button variant='secondary' className='w-full'>Cancel</Button>
                    </Drawer.Close>
                    <Drawer.Close>
                        <Button className='w-full'>Apply</Button>
                    </Drawer.Close>
                </Drawer.Footer>
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
