"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

export function CalendarBlock() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="w-full max-w-md mx-auto">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border border-border p-2"
      />
      <p
        className="mt-4 text-center text-xs text-muted-foreground"
        role="region"
        aria-live="polite"
      >
        Calendário —{" "}
        <a
          className="underline hover:text-foreground"
          href="https://daypicker.dev/"
          target="_blank"
          rel="noopener nofollow"
        >
          React DayPicker
        </a>
      </p>
    </div>
  );
}
