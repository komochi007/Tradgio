import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

export function AppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <rect x="4" y="4" width="40" height="40" rx="14" fill="url(#app-icon-bg)" />
      <path
        d="M15 18.5h18"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M18 18.5v12.5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M18 24.5h12"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M27.5 15.5l5 2.9v5.8l-5 2.9-5-2.9v-5.8l5-2.9Z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="M27.5 15.5v5.8m0 0 5-2.9m-5 2.9-5-2.9"
        stroke="#1D4ED8"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="app-icon-bg" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  )
}
