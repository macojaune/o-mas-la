"use client"

import Image from "next/image"
import { useQuery } from "convex/react"

import type { Id } from "@oyo/convex"
import { api as convexApi } from "@oyo/convex"
import { ScrollArea } from "@oyo/ui/scroll-area"

import { AddPositionButton } from "./add-position-button"
import { GroupCard } from "./group-card"
import { SponsorBlock } from "./sponsor-block"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  selectedGroup: string | null
  onGroupSelect: (groupId: Id<"groups">) => void
}

export function Sidebar({
  isOpen,
  onToggle,
  selectedGroup,
  onGroupSelect,
}: SidebarProps) {
  const groups = useQuery(convexApi.positions.byGroups)

  const renderGroups = () => {
    if (!groups || Object.values(groups).length === 0) {
      return (
        <>
          <div className="text-center text-sm text-purple-400">
            Aucune position ajoutée récemment.
          </div>
          {/* <SponsorBlock /> */}
        </>
      )
    }

    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.isLive && !b.isLive) return -1
      if (!a.isLive && b.isLive) return 1
      return b.positions[0]?._creationTime - a.positions[0]?._creationTime
    })

    // Insert SponsorBlock after the second item or at the end if less than 2 items
    return sortedGroups.reduce((acc: React.ReactNode[], group, index) => {
      acc.push(
        <GroupCard
          key={group._id}
          group={group}
          isSelected={group._id === selectedGroup}
          onClick={() => onGroupSelect(group._id)}
        />,
      )

      // if (index === 2) {
      //   acc.push(<SponsorBlock key="sponsor" />);
      // }
      return acc
    }, [])
  }

  return (
    <div
      className={`w-full border-r bg-background lg:relative ${isOpen ? "h-[45dvh] lg:w-80" : "h-0 lg:w-0"} transition-all duration-300 lg:h-full`}
    >
      {isOpen && (
        <div className="flex h-full flex-col p-4 pb-20 lg:pb-4">
          <div className="flex flex-row justify-between">
            <h2 className="mb-4 text-xl font-bold">Groupes</h2>
          </div>
          <ScrollArea className="">
            <div className="space-y-2">{renderGroups()}</div>
          </ScrollArea>
          <div className="mx-auto mb-4 mt-auto flex flex-row items-center justify-between gap-3  p-2 text-black backdrop-blur-sm">
            <SponsorBlock />

            {/*<div className="w-12 md:w-1/4">
              <a
                href="https://rci.fm/guadeloupe/carnaval"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="/rci-logo.png"
                  width={1776}
                  height={1692}
                  alt="logo RCI Guadeloupe"
                />
              </a>
            </div>
            <span className="text-sm text-white">
              Merci de soutenir le projet durant les jours gras.
            </span>*/}
          </div>
          <AddPositionButton />
        </div>
      )}
    </div>
  )
}
