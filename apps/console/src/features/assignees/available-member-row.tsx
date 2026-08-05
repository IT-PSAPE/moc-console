import { Button } from "@moc/ui/components/controls/button";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Label } from "@moc/ui/components/display/text";
import type { User } from "@moc/types/requests";

export function AvailableMemberRow({ user, onSelect }: { user: User; onSelect: (user: User) => void }) {
  function handleSelect() {
    onSelect(user);
  }

  return (
    <Button variant="ghost" onClick={handleSelect} className="w-full justify-start rounded-lg px-2 py-1 hover:bg-secondary">
      <UserAvatar size="sm" user={user} />
      <span className="min-w-0 flex-1 text-left"><Label.sm>{user.name} {user.surname}</Label.sm></span>
    </Button>
  );
}
