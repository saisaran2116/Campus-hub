"use client";

import React from "react";
import CreateEventStudio from "@/components/CreateEventStudio";

export default function CreateEventStudioPage() {
  return (
    <div className="site-width py-10">
      <div className="mb-8">
        <h1 className="text-balance text-4xl font-bold">Submit an event</h1>
        <p className="mt-2 max-w-xl text-pretty text-neutral-600 dark:text-neutral-300">
          Upload a poster to fill in the details or enter them yourself. A campus manager reviews each submission.
        </p>
      </div>

      <CreateEventStudio />
    </div>
  );
}
