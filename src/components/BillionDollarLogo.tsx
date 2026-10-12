import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Custom Vector Crest Logo for "Billion Dollar" MEXC Futures Automation Bot
 */
export const BillionDollarLogo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="bdGoldEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="bdInnerGlow" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Outer Hexagonal Shield */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="16"
        fill="#0B1325"
        stroke="url(#bdGoldEmerald)"
        strokeWidth="2.5"
      />

      {/* Inner Geometric Diamond-Hexagon */}
      <polygon
        points="32,8 52,19 52,45 32,56 12,45 12,19"
        fill="url(#bdInnerGlow)"
        stroke="url(#bdGoldEmerald)"
        strokeWidth="1.8"
      />

      {/* Circuitry Nodes representing Automated Futures Execution */}
      <circle cx="32" cy="8" r="2.2" fill="#10B981" />
      <circle cx="52" cy="19" r="2.2" fill="#F59E0B" />
      <circle cx="52" cy="45" r="2.2" fill="#06B6D4" />
      <circle cx="32" cy="56" r="2.2" fill="#10B981" />
      <circle cx="12" cy="45" r="2.2" fill="#F59E0B" />
      <circle cx="12" cy="19" r="2.2" fill="#06B6D4" />

      {/* Stylized "$B" Emblem */}
      <path
        d="M25 21H34.5C37.5 21 39.5 22.8 39.5 25.5C39.5 27.6 38.2 29.1 36.2 29.7C38.8 30.3 40.5 32.1 40.5 34.8C40.5 38.1 38 40 34.5 40H25V21Z"
        stroke="url(#bdGoldEmerald)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 30.2H35.5"
        stroke="url(#bdGoldEmerald)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Dollar Vertical Pillars */}
      <path
        d="M29.5 17V44M34.5 17V44"
        stroke="#F59E0B"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};
