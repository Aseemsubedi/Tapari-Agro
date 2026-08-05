"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";
import { LOGO_MARK } from "@/components/brand-logo";

type WatermarkSize = "sm" | "md" | "lg";

const watermarkSizes: Record<
  WatermarkSize,
  { logo: string; text: string; gap: string }
> = {
  sm: {
    logo: "h-2.5 w-2.5",
    text: "text-[5px]",
    gap: "gap-0.5",
  },
  md: {
    logo: "h-3 w-3",
    text: "text-[6px]",
    gap: "gap-0.5",
  },
  lg: {
    logo: "h-3.5 w-3.5",
    text: "text-[7px]",
    gap: "gap-1",
  },
};

type ProtectedProductImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  unoptimized?: boolean;
  watermark?: WatermarkSize;
  onError?: () => void;
};

function blockImageSave(event: SyntheticEvent) {
  event.preventDefault();
}

export function ProtectedProductImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = "",
  sizes,
  quality,
  priority,
  unoptimized,
  watermark = "md",
  onError,
}: ProtectedProductImageProps) {
  const mark = watermarkSizes[watermark];

  return (
    <div
      className={`protected-product-image relative h-full w-full select-none ${
        fill ? "absolute inset-0" : ""
      }`}
      onContextMenu={blockImageSave}
      onDragStart={blockImageSave}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={`protected-product-image__photo pointer-events-none ${className}`}
        sizes={sizes}
        quality={quality}
        priority={priority}
        unoptimized={unoptimized}
        draggable={false}
        onError={onError}
      />
      <div
        className="absolute inset-0 z-[1]"
        aria-hidden
        onContextMenu={blockImageSave}
        onDragStart={blockImageSave}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
        aria-hidden
      >
        <div
          className={`flex flex-col items-center ${mark.gap} opacity-35`}
        >
          <Image
            src={LOGO_MARK}
            alt=""
            width={16}
            height={16}
            className={`${mark.logo} shrink-0 rounded-full object-cover ring-1 ring-white/50`}
            unoptimized
            draggable={false}
          />
          <span
            className={`${mark.text} font-bold uppercase leading-none tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]`}
          >
            © Tapari Agro
          </span>
        </div>
      </div>
    </div>
  );
}
