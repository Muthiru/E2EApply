"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchJobCandidatesAction,
  type SearchJobsResult,
} from "@/lib/actions/discover";
import { addJobFromText, scoreApplication } from "@/lib/actions/job";
import type { DiscoverCandidate } from "@/lib/job/discover";
import { matchBadgeClass } from "@/lib/status";
import { useToast } from "@/components/ui/toast";

export function JobDiscovery() {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState("any");
  const [results, setResults] = useState<DiscoverCandidate[] | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [searching, startSearch] = useTransition();
  const [adding, startAdding] = useTransition();
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());

  const handleSearch = () => {
    setResults(null);
    let finalQuery = query.trim();
    if (location.trim()) finalQuery += ` in ${location.trim()}`;
    if (workModel !== "any") finalQuery += ` (${workModel})`;

    startSearch(async () => {
      const result: SearchJobsResult = await searchJobCandidatesAction(finalQuery);
      if (result.ok) {
        setResults(result.candidates);
        setUsedFallback(result.usedFallback);
        if (result.candidates.length === 0) {
          toast("No new jobs found — try a different query.");
        }
      } else {
        toast(result.error, "error");
      }
    });
  };

  const handleAdd = (url: string) => {
    startAdding(async () => {
      const result = await addJobFromText("", url);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setAddedUrls((current) => new Set(current).add(url));
      toast("Job added to your tracker.");
      try {
        await scoreApplication(result.applicationId);
      } catch {
        // Job saved; scoring is retryable from the detail page.
      } finally {
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-lg border p-5">
      <p className="text-sm font-medium">Discover jobs</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Search the web for postings, review them before they hit your tracker.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="e.g. Senior Go Engineer"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="shrink-0 rounded-md border bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search web"}
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row items-center">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Location (optional, e.g. London or US)"
            className="w-full sm:w-1/2 rounded-md border px-3 py-2 text-sm"
          />
          <select
            value={workModel}
            onChange={(e) => setWorkModel(e.target.value)}
            className="w-full sm:w-1/3 rounded-md border px-3 py-2 text-sm"
          >
            <option value="any">Any Work Model</option>
            <option value="Remote">Remote</option>
            <option value="Onsite">Onsite</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {usedFallback && results && (
        <p className="mt-2 text-xs text-muted-foreground">
          Using the basic web search source for these results.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-4 space-y-3">
          {results.map((candidate) => {
            const isAdded = addedUrls.has(candidate.url);
            return (
              <li
                key={candidate.url}
                className="rounded-md border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a
                      href={candidate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {candidate.title}
                    </a>
                    {candidate.company && (
                      <p className="text-xs text-muted-foreground">
                        {candidate.company}
                      </p>
                    )}
                    {candidate.snippet && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {candidate.snippet}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {candidate.estimatedMatch !== null && (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${matchBadgeClass(candidate.estimatedMatch)}`}
                        title={`Matched: ${candidate.matchedSkills.join(", ") || "none yet"}`}
                      >
                        {candidate.estimatedMatch}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAdd(candidate.url)}
                      disabled={adding || isAdded}
                      className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
                    >
                      {isAdded ? "Added" : "Add to tracker"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {results && results.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Estimated match uses your search query and profile skills; the full AI
          match score runs when you add a job.
        </p>
      )}
    </div>
  );
}
