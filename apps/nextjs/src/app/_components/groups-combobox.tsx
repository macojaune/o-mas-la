"use client"

import type { Doc, Id } from "@oyo/convex"

export function GroupCombobox({
  groups,
  selectedGroup,
  onValueChange,
}: {
  groups: Doc<"groups">[]
  selectedGroup: Id<"groups"> | null
  onValueChange: (groupId: Id<"groups">) => void
}) {
  return (
    <select
      aria-label="Groupe"
      className="h-11 w-full rounded-md border bg-background px-3"
      value={selectedGroup ?? ""}
      onChange={(event) => {
        const group = groups.find((item) => item._id === event.target.value)
        if (group) onValueChange(group._id)
      }}
    >
      <option value="" disabled>
        Sélectionner un groupe
      </option>
      {groups.map((group) => (
        <option key={group._id} value={group._id}>
          {group.title}
        </option>
      ))}
    </select>
  )
}
