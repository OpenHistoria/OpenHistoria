"use client"

import Image from "next/image"

export function PresidentialActionsButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label="Presidential actions"
      title="Presidential actions"
      onClick={onClick}
      className="group absolute bottom-2 left-full ml-2 size-12 cursor-pointer rounded-md transition-transform hover:scale-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image
        src="/icons/presidential-actions.png"
        alt=""
        width={200}
        height={200}
        className="size-full object-contain drop-shadow-md"
      />
    </button>
  )
}
