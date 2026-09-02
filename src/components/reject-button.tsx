"use client";

import { useRef } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RejectButton({ action, id }: { action: (formData: FormData) => void; id: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        const note = window.prompt("سبب الرفض:");
        if (!note || !note.trim()) {
          e.preventDefault();
          return;
        }
        if (noteRef.current) noteRef.current.value = note.trim();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="reviewNote" ref={noteRef} />
      <Button type="submit" variant="outline" size="sm">
        <XCircle className="w-4 h-4" /> رفض
      </Button>
    </form>
  );
}
