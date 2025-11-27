// src/components/Logo.tsx
import React from 'react'

export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0" stopColor="#7EE7C6" />
          <stop offset="1" stopColor="#14C38E" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#081018" />
      <g transform="translate(6,6)">
        <path d="M6 22c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="url(#g1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 10c2.5-4 8-6 14-6s11.5 2 14 6" stroke="#7EE7C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
        <circle cx="10" cy="24" r="3.2" fill="#14C38E" />
      </g>
    </svg>
  )
}
