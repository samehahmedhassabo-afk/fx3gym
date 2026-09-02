"use client";

import { Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function DeleteButton({
  action,
  id,
  label = "حذف",
  confirmText = "متأكد إنك عايز تمسح ده؟ الإجراء ده لا يمكن التراجع عنه.",
  size = "sm",
  variant = "danger",
  iconOnly = false,
  className,
}: {
  action: (formData: FormData) => void;
  id?: string;
  label?: string;
  confirmText?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className={className}
    >
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <Button type="submit" variant={variant} size={size} title={label}>
        <Trash2 className="w-4 h-4" />
        {!iconOnly && <span>{label}</span>}
      </Button>
    </form>
  );
}
