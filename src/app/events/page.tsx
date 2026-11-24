"use client";

import { debounce } from "@/lib/debounce";

import React, { useState, useEffect } from "react";
import EventCard, { EventCardData } from "@/components/EventCard";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = [
  "ALL",
  "Workshop",
  "Hackathon",
  "Cultural",
  "Technical",
  "Sports",
  "Seminar",
  "Competition",
  "Fest",
  "Club",
];

const DATE_FILTERS = [
  { id: "UPCOMING", label: "Upcoming" },
  { id: "ALL", label: "All dates" },
  { id: "TODAY", label: "Today" },
  { id: "TOMORROW", label: "Tomorrow" },
  { id: "THIS_WEEK", label: "Next 7 days" },
];

export default function EventsExplorePage() {
  const { user } = useAuth();
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [liveRevision, setLiveRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState("UPCOMING");
  const [sortBy, setSortBy] = useState("soonest");
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const userId = user?.id;

  useEffect(() => {
    const controller = new AbortController();
    setSavedEventIds(new Set());
    if (userId) {
      fetch("/api/saved", { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return;
          const data = await response.json();
          if (!controller.signal.aborted) setSavedEventIds(new Set(data.events.map(({ id }: { id: string }) => id)));
        })
        .catch(() => undefined);
    }
    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_CATALOGUE_SOCKET_URL;
    if (!url) return;
    const socket = new WebSocket(url);
    socket.addEventListener("message", ({ data }) => {
      if (data === "catalogue-changed") setLiveRevision((current) => current + 1);
    });
    return () => socket.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const search = debounce(async () => {
      setLoading(true);
      setError(false);
      const filters = new URLSearchParams({ sortBy });
      if (searchQuery) filters.set("q", searchQuery);
      if (selectedCategory !== "ALL") filters.set("category", selectedCategory);
      if (selectedDateFilter !== "ALL") filters.set("dateFilter", selectedDateFilter);

      try {
        const response = await fetch(`/api/events?${filters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load events.");
        const data = await response.json();
        if (!controller.signal.aborted) setEvents(data.events ?? []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    search.run();

    return () => {
      search.cancel();
      controller.abort();
    };
  }, [searchQuery, selectedCategory, selectedDateFilter, sortBy, liveRevision]);

  const handleSaveToggle = (eventId: string, isSaved: boolean) => {
    setSavedEventIds((prev) => {
      const updated = new Set(prev);
      if (isSaved) updated.add(eventId);
      else updated.delete(eventId);
      return updated;
    });
  };

  return (
    <div className="site-width py-10 sm:py-12">
      <h1 className="text-balance text-4xl font-bold sm:text-5xl">Campus events</h1>
      <p className="mt-2 text-pretty text-neutral-600 dark:text-neutral-300">Browse events approved by campus staff.</p>

      <div className="mb-6 mt-8 grid gap-4 site-surface p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-sm font-medium">
          Search
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
            className="input input-bordered w-full min-w-0 bg-transparent" placeholder="Title, organizer, or venue" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Date
          <select value={selectedDateFilter} onChange={(event) => setSelectedDateFilter(event.target.value)}
            className="select select-bordered w-full bg-white dark:bg-neutral-900">
            {DATE_FILTERS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Category
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}
            className="select select-bordered w-full bg-white dark:bg-neutral-900">
            {CATEGORIES.map((category) => <option key={category} value={category}>{category === "ALL" ? "All categories" : category}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Sort by
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}
            className="select select-bordered w-full bg-white dark:bg-neutral-900">
            <option value="soonest">Earliest date</option>
            <option value="latest">Latest date</option>
            <option value="recently_added">Recently added</option>
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm tabular-nums text-neutral-600 dark:text-neutral-300" role="status">
        {loading ? "Loading events…" : error ? "" : `${events.length} ${events.length === 1 ? "event" : "events"}`}
      </p>
      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#111111] border border-[#D6D6D2] dark:border-[#444444] rounded-xl overflow-hidden flex flex-col h-[380px] animate-pulse"
            >
              <div className="h-44 w-full bg-[#F7F7F5] dark:bg-[#222222]" />
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="h-4 w-24 bg-[#F7F7F5] dark:bg-[#222222] rounded-md" />
                  <div className="h-6 w-5/6 bg-[#F7F7F5] dark:bg-[#222222] rounded-md" />
                  <div className="h-3.5 w-full bg-[#F7F7F5] dark:bg-[#222222] rounded-md" />
                </div>
                <div className="space-y-2 pt-3 border-t border-[#D6D6D2] dark:border-[#444444]">
                  <div className="h-4 w-1/2 bg-[#F7F7F5] dark:bg-[#222222] rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-neutral-300 p-6 dark:border-neutral-700">
          <p role="alert">Events could not be loaded.</p>
          <button type="button" className="btn btn-outline mt-3 text-neutral-900 dark:text-white"
            onClick={() => setLiveRevision((current) => current + 1)}>Try again</button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="font-display text-2xl font-black text-[#111111] dark:text-white mb-2">No verified events found</p>
          <p className="text-sm text-[#777777] font-medium mb-6">
            Try adjusting your search query, timeline filters, or category.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
              setSelectedDateFilter("ALL");
            }}
            className="btn-kalvium-primary"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={{
                ...event,
                isSaved: savedEventIds.has(event.id),
              }}
              onSaveToggle={handleSaveToggle}
            />
          ))}
        </div>
      )}

    </div>
  );
}
