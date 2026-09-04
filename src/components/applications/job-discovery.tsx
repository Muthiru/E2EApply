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
    const finalQuery = queryParts.join(" ");

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
    <div className="panel p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Discover jobs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the web for postings, review them before they hit your tracker.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Main search input */}
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Job title, skills, or company (e.g., Senior Go Engineer)"
              className="field-control pr-10"
              disabled={searching}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="btn btn-quiet absolute right-2 top-1/2 h-8 min-h-0 w-8 -translate-y-1/2 p-0"
                disabled={searching}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="btn btn-primary shrink-0 lg:min-w-30"
          >
            {searching ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                <span>Searching…</span>
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)]">
          <div className="relative">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Location (e.g., London, US, Poland)"
              className="field-control pr-10"
              disabled={searching}
            />
            {location && (
              <button
                type="button"
                onClick={() => setLocation("")}
                className="btn btn-quiet absolute right-2 top-1/2 h-8 min-h-0 w-8 -translate-y-1/2 p-0"
                disabled={searching}
                aria-label="Clear location"
              >
                ✕
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={workModel}
              onChange={(e) => setWorkModel(e.target.value as "any" | "Remote" | "Onsite" | "Hybrid")}
              className="field-control appearance-none pr-10 disabled:opacity-50"
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
              className="badge border-border text-muted-foreground hover:bg-muted"
              disabled={searching}
            >
              {workModel} ✕
            </button>
          )}
          {location && (
            <button
              type="button"
              onClick={() => setLocation("")}
              className="badge border-border text-muted-foreground hover:bg-muted"
              disabled={searching}
            >
              {location} ✕
            </button>
          )}
        </div>
      </div>

      {/* Search info */}
      {usedFallback && results && (
        <div className="mt-4 rounded-md border border-status-assessment/30 bg-status-assessment/10 px-3 py-2">
          <p className="text-xs text-amber-800">
            ⚠️ Using basic web search for these results. For better results, try adding more specific job terms.
          </p>
        </div>
      )}

      {/* Results */}
      {results === null && !searching && (
        <div className="panel-soft mt-6 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a job title above to discover opportunities
          </p>
        </div>
      )}

      {searching && (
        <div className="panel-soft mt-6 p-8 text-center">
          <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
          <p className="text-sm text-muted-foreground">Searching for jobs...</p>
        </div>
      )}

      {results?.length === 0 && (
        <div className="panel-soft mt-6 p-8 text-center">
          <p className="text-sm font-medium">No jobs found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {results.length} job{results.length !== 1 ? 's' : ''} found
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="btn btn-quiet min-h-8 px-2 py-1 text-xs"
            >
              Refresh results
            </button>
          </div>
          
          <ul className="mt-4 space-y-3">
            {results.map((candidate) => {
              const isAdded = addedUrls.has(candidate.url);
              let actionLabel = "Add to tracker";
              if (adding) actionLabel = "Adding…";
              if (isAdded) actionLabel = "✓ Added";
              return (
                <li
                  key={candidate.url}
                  className="group rounded-lg border border-border bg-white/80 p-4 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
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

                      {candidate.publishedAt && !Number.isNaN(Date.parse(candidate.publishedAt)) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Posted {new Date(candidate.publishedAt).toLocaleDateString()}
                        </p>
                      )}
                      
                      {candidate.snippet && (
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {candidate.snippet}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      {candidate.estimatedMatch !== null && (
                        <div className="text-right">
                          <span
                            className={`badge ${matchBadgeClass(candidate.estimatedMatch)}`}
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
                        className={`btn min-h-9 px-3 py-2 text-xs ${
                          isAdded 
                            ? "border border-status-offer/30 bg-status-offer/10 text-status-offer"
                            : "btn-primary"
                        } disabled:opacity-50 disabled:cursor-not-allowed sm:min-w-27.5`}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          
          <div className="panel-soft mt-4 p-3">
            <p className="text-xs text-muted-foreground">
              💡 Tip: Estimated match uses your search query and profile skills. The full AI match score runs when you add a job to your tracker.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
