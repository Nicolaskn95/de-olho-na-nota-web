"use client";

import React from "react";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loader({ className = "", size = "md" }: LoaderProps) {
  const scaleClass =
    size === "sm" ? "scale-50" : size === "lg" ? "scale-125" : "scale-100";

  return (
    <div className={`relative flex items-center justify-center min-h-[6.25rem] min-w-[6.25rem] ${className}`}>
      <div className={`loader ${scaleClass}`}>
        <div className="dot white" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
    </div>
  );
}

export default Loader;
