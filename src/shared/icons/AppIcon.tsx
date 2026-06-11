import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

export function AppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" {...props}>
      <path
        d="M47.8 7.5c5.8-3.2 12.8-3.2 18.6 0l22.3 12.4c5.8 3.2 9.4 9.4 9.4 16v24.8c0 6.7-3.6 12.8-9.4 16L66.4 89.3c-5.8 3.2-12.8 3.2-18.6 0L25.5 76.8c-5.8-3.2-9.4-9.4-9.4-16V35.9c0-6.7 3.6-12.8 9.4-16L47.8 7.5Z"
        transform="translate(-8 0)"
        fill="url(#tradgio-logo-blue)"
      />
      <path
        d="M23 35.8c0-5.9 4.8-10.7 10.7-10.7h43.5L71.8 41H55.5v35.8L39.8 67V41H23V35.8Z"
        fill="white"
      />
      <path d="M68 58.8 81.6 51l13.7 7.8-13.7 7.9L68 58.8Z" fill="white" />
      <path d="M68 58.8 81.6 66.7v17.2L68 76.1V58.8Z" fill="url(#tradgio-logo-cube-front)" />
      <path d="M95.3 58.8 81.6 66.7v17.2l13.7-7.8V58.8Z" fill="url(#tradgio-logo-cube-side)" />
      <defs>
        <linearGradient
          id="tradgio-logo-blue"
          x1="12"
          y1="10"
          x2="76"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1677FF" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient
          id="tradgio-logo-cube-front"
          x1="66"
          y1="59"
          x2="83"
          y2="81"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DDEBFF" />
        </linearGradient>
        <linearGradient
          id="tradgio-logo-cube-side"
          x1="79"
          y1="62"
          x2="89"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2F8CFF" />
          <stop offset="1" stopColor="#1857CF" />
        </linearGradient>
      </defs>
    </svg>
  )
}
