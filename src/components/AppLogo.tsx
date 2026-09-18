import React from "react";

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = "", size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoBrandGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="logoBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="100%" stopColor="#141210" />
        </linearGradient>
      </defs>

      {/* Container Tile */}
      <rect width="64" height="64" rx="16" fill="url(#logoBgGrad)" stroke="#443a2e" strokeWidth="1.5" />

      {/* Vector baseline guidelines */}
      <path d="M12 48H52" stroke="#44403c" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <path d="M12 20H52" stroke="#44403c" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <path d="M12 34H52" stroke="#57534e" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />

      {/* Stylized Font Character 'A' + Vector Pen & Bezier Nodes */}
      <g>
        {/* Left and Right Stems */}
        <path
          d="M19 48L30 18C30.6 16.5 33.4 16.5 34 18L45 48"
          stroke="url(#logoBrandGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Crossbar */}
        <path
          d="M23.5 37H40.5"
          stroke="url(#logoBrandGrad)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Cultural Accent Top Notch */}
        <path d="M32 16V21" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />

        {/* Vector Anchor Nodes */}
        <rect x="29.5" y="15.5" width="5" height="5" rx="1" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
        <rect x="16.5" y="45.5" width="5" height="5" rx="1" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
        <rect x="42.5" y="45.5" width="5" height="5" rx="1" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
        <rect x="21" y="34.5" width="4.5" height="4.5" rx="1" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
        <rect x="38.5" y="34.5" width="4.5" height="4.5" rx="1" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
      </g>
    </svg>
  );
};
