"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function BackButton({
  fallbackHref,
  label,
  ...props
}: { fallbackHref: string; label: string } & Omit<ButtonProps, "onClick" | "children">) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      {...props}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </Button>
  );
}
