"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SearchResults {
  query: string;
  total: number;
  reports: any[];
  officials: any[];
  areas: any[];
}

type SearchStatus = "idle" | "loading" | "success" | "error";

const DEBOUNCE_MS = 280; // feels instant, avoids hammering the API
const MIN_QUERY_LENGTH = 2;

export function useSearch(type: "all" | "reports" | "officials" | "areas" = "all") {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [status, setStatus]   = useState<SearchStatus>("idle");
  const [error, setError]     = useState<string | null>(null);

  const abortRef  = useRef<AbortController | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const url = `/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=8`;
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message ?? "Search failed");

      setResults(data.data);
      setStatus("success");
    } catch (err: any) {
      if (err.name === "AbortError") return; // stale request — ignore
      setError(err.message);
      setStatus("error");
    }
  }, [type]);

  useEffect(() => {
    // Clear timer on every keystroke
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setStatus("idle");
      abortRef.current?.abort();
      return;
    }

    // Debounce the actual search call
    timerRef.current = setTimeout(() => search(trimmed), DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setStatus("idle");
    setError(null);
    abortRef.current?.abort();
  }, []);

  return {
    query,
    setQuery,
    results,
    status,
    error,
    clear,
    isLoading: status === "loading",
    hasResults: !!results && results.total > 0,
    isEmpty: status === "success" && results?.total === 0,
  };
}
