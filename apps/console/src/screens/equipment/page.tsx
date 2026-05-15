import { Card } from "@moc/ui/components/display/card";
import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { Header } from "@moc/ui/components/display/header";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Label, Paragraph, TextBlock, Title } from "@moc/ui/components/display/text";
import { ArrowUpRight, CalendarX2Icon, CircleCheck, FileWarning, Package, Search, Settings2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { EquipmentItem } from "@/features/equipment/equipment-item";
import type { Equipment } from "@moc/types/equipment";
import { Indicator } from "@moc/ui/components/display/indicator";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { ScrollArea } from "@moc/ui/components/display/scroll-area";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";

export function EquipmentOverviewScreen() {
  const {
    state: { equipment, bookings, isLoadingEquipment, isLoadingBookings },
    actions: { loadEquipment, loadBookings },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
    loadBookings();
  }, [loadEquipment, loadBookings]);

  const equipmentFilters = useEquipmentFilters(equipment);
  const { filtered, setSearch, filters: state } = equipmentFilters;

  // Stats — always from unfiltered data
  const totalCount = equipment.length;
  const availableCount = equipment.filter((e) => e.status === "available").length;
  const bookedOutCount = equipment.filter((e) => e.status === "booked_out").length;

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const item of equipment) map.set(item.id, item);
    return map;
  }, [equipment]);

  const filteredEquipmentIds = useMemo(() => new Set(filtered.map((item) => item.id)), [filtered]);

  const overdueEquipment = useMemo<Equipment[]>(() => {
    const now = new Date();
    const seen = new Set<string>();
    return bookings
      .filter((booking) =>
        booking.status !== "returned" &&
        !booking.returnedDate &&
        filteredEquipmentIds.has(booking.equipmentId) &&
        new Date(booking.expectedReturnAt) < now,
      )
      .sort((a, b) => new Date(a.expectedReturnAt).getTime() - new Date(b.expectedReturnAt).getTime())
      .slice(0, 10)
      .reduce<Equipment[]>((acc, booking) => {
        if (seen.has(booking.equipmentId)) return acc;
        const item = equipmentMap.get(booking.equipmentId);
        if (item) {
          seen.add(booking.equipmentId);
          acc.push(item);
        }
        return acc;
      }, []);
  }, [bookings, filteredEquipmentIds, equipmentMap]);

  const faultyEquipment = useMemo<Equipment[]>(() => (
    filtered
      .filter((item) => item.status === "maintenance")
      .sort((a, b) => new Date(a.lastActiveDate).getTime() - new Date(b.lastActiveDate).getTime())
  ), [filtered]);

  const overdueCount = overdueEquipment.length;

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Equipment</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage and track all equipment. View availability, bookings, and maintenance at a glance.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <ScrollArea className='mx-auto w-full max-w-content'>
        <ScrollArea.Viewport className='p-4 pt-8'>
          <ScrollArea.Content className='flex gap-4 max-mobile:gap-2'>
            <Card className="flex-1 min-w-56">
              <Card.Header tight className="gap-1.5">
                <Package className="size-4" />
                <Label.sm>Total Equipment</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{totalCount}</TextBlock>
              </Card.Content>
            </Card>
            <Card className="flex-1 min-w-56">
              <Card.Header tight className="gap-1.5">
                <CircleCheck className="size-4" />
                <Label.sm>Available</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{availableCount}</TextBlock>
              </Card.Content>
            </Card>
            <Card className="flex-1 min-w-56">
              <Card.Header tight className="gap-1.5">
                <ArrowUpRight className="size-4" />
                <Label.sm>Booked Out</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{bookedOutCount}</TextBlock>
              </Card.Content>
            </Card>
            <Card className="flex-1 min-w-56">
              <Card.Header tight className="gap-1.5">
                <CalendarX2Icon className="size-4" />
                <Label.sm>Overdue</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{overdueCount}</TextBlock>
              </Card.Content>
            </Card>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea>

      <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <Label.md>Schedule</Label.md>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input icon={<Search />} placeholder="Search equipment..." className="w-full max-w-md" value={state.search} onChange={(e) => setSearch(e.target.value)} />
            <Drawer>
              <Drawer.Trigger>
                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
              </Drawer.Trigger>
              <EquipmentFilterDrawer filters={equipmentFilters} />
            </Drawer>
          </Header.Trail>
        </Header>

        <Card>
          <Card.Header tight>
            <Indicator color="red" className="size-6" />
            <Label.sm>Overdue Equipment</Label.sm>
          </Card.Header>
          <Card.Content ghost className="flex flex-col gap-1.5">
            <Decision value={overdueEquipment} loading={(isLoadingEquipment || isLoadingBookings)}>
              <Decision.Loading>
                <LoadingSpinner className="py-6" />
              </Decision.Loading>
              <Decision.Empty>
                <EmptyState
                  icon={<FileWarning />}
                  title={'No overdue equipment'}
                />
              </Decision.Empty>
              <Decision.Data>
                {overdueEquipment.map((item) => (
                  <EquipmentItem key={item.id} equipment={item} />
                ))}
              </Decision.Data>
            </Decision>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header tight>
            <Indicator className="size-6" />
            <Label.sm>Faulty Equipment</Label.sm>
          </Card.Header>
          <Card.Content ghost className="flex flex-col gap-1.5">
            <Decision value={faultyEquipment} loading={(isLoadingEquipment || isLoadingBookings)}>
              <Decision.Loading>
                <LoadingSpinner className="py-6" />
              </Decision.Loading>
              <Decision.Empty>
                <EmptyState
                  icon={<FileWarning />}
                  title={'No faulty equipment'}
                />
              </Decision.Empty>
              <Decision.Data>
                {faultyEquipment.map((item) => (
                  <EquipmentItem key={item.id} equipment={item} />
                ))}
              </Decision.Data>
            </Decision>
          </Card.Content>
        </Card>
      </div>
    </section>
  );
}
