import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export default function Logo({ className = "w-full h-full text-[#B69D74]", ...props }: LogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      {...props}
    >
      {/* Bottom Triangle */}
      <polygon points="12,75 80,75 85,55" />
      
      {/* Middle Triangle */}
      <polygon points="23,64 72,50 77,30" />
      
      {/* Top Triangle */}
      <polygon points="37,42 64,25 69,5" />
    </svg>
  );
}
