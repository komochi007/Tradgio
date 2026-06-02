import type { SVGProps } from "react"

type BaseIconProps = Omit<SVGProps<SVGSVGElement>, "strokeWidth"> & {
  size?: number
  strokeWidth?: number | string
}

function BaseIcon({
  children,
  size = 20,
  strokeWidth = 1.9,
  ...props
}: BaseIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function OverviewIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="4.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="4.5" width="7" height="4.5" rx="2" />
      <rect x="13.5" y="11.5" width="7" height="8" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="6" rx="2" />
    </BaseIcon>
  )
}

export function ProductIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3.8 19.3 7.6v8.8L12 20.2 4.7 16.4V7.6L12 3.8Z" />
      <path d="M12 3.8v8.4m0 0 7.3-4.6m-7.3 4.6-7.3-4.6" />
    </BaseIcon>
  )
}

export function CounterpartyIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16.5" cy="8" r="2" />
      <path d="M4.8 18c.5-2.6 2.5-4 5.2-4s4.7 1.4 5.2 4" />
      <path d="M13.8 17.5c.3-1.8 1.7-2.9 3.7-2.9 1.6 0 2.8.6 3.5 1.9" />
    </BaseIcon>
  )
}

export function PurchaseIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.2v10.2" />
      <path d="m7.8 10.3 4.2 4.2 4.2-4.2" />
      <rect x="4" y="16.2" width="16" height="3.8" rx="1.9" />
    </BaseIcon>
  )
}

export function SalesIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 19.8V9.6" />
      <path d="m16.2 13.7-4.2-4.2-4.2 4.2" />
      <rect x="4" y="4" width="16" height="3.8" rx="1.9" />
    </BaseIcon>
  )
}

export function QuoteIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="3.8" width="12" height="16.4" rx="2.8" />
      <path d="M9 8.2h6M9 12h6M9 15.8h4.2" />
    </BaseIcon>
  )
}

export function ContractIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h6l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M14 4.5v4h4" />
      <path d="M9 13h6M9 16.5h4" />
    </BaseIcon>
  )
}

export function SearchIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m16 16 4 4" />
    </BaseIcon>
  )
}

export function AccountIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8.3" r="3.2" />
      <path d="M5 19c1-3 3.5-4.8 7-4.8s6 1.8 7 4.8" />
    </BaseIcon>
  )
}

export function LogoutIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19H10" />
      <path d="M13 8.2 18 12l-5 3.8" />
      <path d="M18 12H9" />
    </BaseIcon>
  )
}

export function CalendarIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="5.5" width="15" height="14" rx="2.5" />
      <path d="M8 3.8v3.4M16 3.8v3.4M4.5 9.5h15" />
    </BaseIcon>
  )
}

export function WeatherIcon(props: BaseIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 16a3.5 3.5 0 1 1 1.4-6.7A4.8 4.8 0 0 1 18 10.8 2.8 2.8 0 1 1 18 16Z" />
      <path d="M16.8 5.2v-2M20 8.4h2M19 6l1.6-1.6M14.7 4.4 16.3 6" />
    </BaseIcon>
  )
}
