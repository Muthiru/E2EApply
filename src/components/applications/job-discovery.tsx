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

type JobDiscoveryProps = Readonly<{
  prefillQuery?: string | null;
  prefillLocation?: string | null;
  prefillWorkModel?: "any" | "Remote" | "Onsite" | "Hybrid";
}>;

export function JobDiscovery({
  prefillQuery,
  prefillLocation,
  prefillWorkModel,
}: JobDiscoveryProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState(prefillQuery ?? "");
  const [location, setLocation] = useState(prefillLocation ?? "");
  const [workModel, setWorkModel] = useState(prefillWorkModel ?? "any");
  const [results, setResults] = useState<DiscoverCandidate[] | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [searching, startSearch] = useTransition();
  const [adding, startAdding] = useTransition();
  const [addedUrls, setAddedUrls] = useState<Set<string>>(new Set());


  const handleSearch = () => {
    setResults(null);
    const roleQuery = query.trim();
    const loc = location.trim();
    const model = workModel !== "any" ? workModel : "";

    // Simple, reliable query building
    const queryParts = [];
    
    // Add work model if specified
    if (model) {
      queryParts.push(model);
    }
    
    // Add the main role query
    if (roleQuery) {
      queryParts.push(roleQuery);
    }
    
    // Add location if specified
    if (loc) {
      queryParts.push(`in ${loc}`);
    }
    
    // Add job intent if not already clear
    const combinedQuery = queryParts.join(" ");
    const hasJobIntent = /\b(jobs?|hiring|opening|vacancy|position|role|careers?)\b/i.test(combinedQuery);
    
    let finalQuery = combinedQuery;
    if (!hasJobIntent) {
      finalQuery = `${combinedQuery} jobs`;
    }

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
    <div className="rounded-lg border bg-background p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Discover jobs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the web for postings, review them before they hit your tracker.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Main search input */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Job title, skills, or company (e.g., Senior Go Engineer)"
              className="w-full rounded-md border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              disabled={searching}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={searching}
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="shrink-0 rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] shadow-md hover:shadow-lg transition-all"
          >
            {searching ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Searching…
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:flex-none sm:w-1/2">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Location (e.g., London, US, Poland)"
              className="w-full rounded-md border px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              disabled={searching}
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={searching}
              >
                ✕
              </button>
            )}
          </div>
          <div className="relative flex-1 sm:flex-none sm:w-1/3">
            <select
              value={workModel}
              onChange={(e) => setWorkModel(e.target.value as "any" | "Remote" | "Onsite" | "Hybrid")}
              className="w-full rounded-md border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 appearance-none bg-background disabled:opacity-50"
              disabled={searching}
            >
              <option value="any">Any work model</option>
              <option value="Remote">Remote</option>
              <option value="Onsite">Onsite</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              ▼
            </div>
          </div>
        </div>

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-2">
          {workModel !== "any" && (
            <button
              type="button"
              onClick={() => setWorkModel("any")}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
              disabled={searching}
            >
              {workModel} ✕
            </button>
          )}
          {location && (
            <button
              type="button"
              onClick={() => setLocation("")}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
              disabled={searching}
            >
              {location} ✕
            </button>
          )}
        </div>
      </div>

      {/* Search info */}
      {usedFallback && results && (
        <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800">
            ⚠️ Using basic web search for these results. For better results, try adding more specific job terms.
          </p>
        </div>
      )}

      {/* Results */}
      {results === null && !searching && (
        <div className="mt-6 rounded-md border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a job title above to discover opportunities
          </p>
        </div>
      )}

      {searching && (
        <div className="mt-6 rounded-md border p-8 text-center">
          <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
          <p className="text-sm text-muted-foreground">Searching for jobs...</p>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="mt-6 rounded-md border p-8 text-center">
          <p className="text-sm font-medium">No jobs found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-medium">
              {results.length} job{results.length !== 1 ? 's' : ''} found
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Refresh results
            </button>
          </div>
          
          <ul className="mt-4 space-y-3">
            {results.map((candidate) => {
              const isAdded = addedUrls.has(candidate.url);
              return (
                <li
                  key={candidate.url}
                  className="group rounded-lg border bg-card p-4 hover:border-foreground/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold underline-offset-2 hover:underline"
                        >
                          {candidate.title}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          ↗
                        </span>
                      </div>
                      
                      {candidate.company && (
                        <p className="mt-1 text-xs text-muted-foreground font-medium">
                          {candidate.company}
                        </p>
                      )}
                      
                      {candidate.snippet && (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {candidate.snippet}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {candidate.estimatedMatch !== null && (
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${matchBadgeClass(candidate.estimatedMatch)}`}
                            title={`Matched: ${candidate.matchedSkills.join(", ") || "none yet"}`}
                          >
                            {candidate.estimatedMatch}%
                          </span>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Est. match
                          </p>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleAdd(candidate.url)}
                        disabled={adding || isAdded}
                        className={`rounded-lg px-4 py-2 text-xs font-medium transition-all shadow-sm hover:shadow-md ${
                          isAdded 
                            ? "bg-green-100 text-green-800 border border-green-200 cursor-default" 
                            : "bg-blue-700 text-white hover:bg-blue-800"
                        } disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]`}
                      >
                        {adding ? "Adding…" : isAdded ? "✓ Added" : "Add to tracker"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          
          <div className="mt-4 rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Estimated match uses your search query and profile skills. The full AI match score runs when you add a job to your tracker.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
