import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
}

const pixelSizes = { sm: 32, md: 40, lg: 48 } as const;

export function Avatar({ src, alt, initials, size = "md" }: AvatarProps) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt ?? "Avatar"}
        width={pixelSizes[size]}
        height={pixelSizes[size]}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-700`}
    >
      {initials ?? "?"}
    </div>
  );
}
