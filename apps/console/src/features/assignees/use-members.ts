import { fetchAllUsers } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import { useEffect, useState } from "react";

export function useMembers() {
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllUsers()
      .then(setMembers)
      .finally(() => setIsLoading(false));
  }, []);

  return { members, isLoading };
}
