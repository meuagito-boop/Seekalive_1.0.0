import { useEffect, useRef, useState } from "react";
import type { Post } from "@/modules/social/types/post";
import { restSocialApi } from "@/modules/social/services/restContracts";

export type FeedSearchPage = Awaited<ReturnType<typeof restSocialApi.feed>>;

export function useRemoteFeedSearch(input: {
  enabled: boolean;
  query: string;
  onPage: (page: FeedSearchPage) => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestGeneration = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    loadingRef.current = false;
    setLoading(false);
    const query = input.query.trim();
    if (!input.enabled || query.length < 2) {
      setPosts([]);
      setCursor(null);
      setError(null);
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    const controller = new AbortController();
    let active = true;
    setPosts([]);
    setCursor(null);
    setError(null);
    const timer = window.setTimeout(() => {
      loadingRef.current = true;
      setLoading(true);
      void restSocialApi
        .feed(undefined, "for-you", 20, query, controller.signal)
        .then((page) => {
          if (!active || generation !== requestGeneration.current) return;
          input.onPage(page);
          setPosts(page.items);
          setCursor(page.nextCursor ?? null);
        })
        .catch((searchError: unknown) => {
          if (
            active &&
            generation === requestGeneration.current &&
            !controller.signal.aborted
          ) {
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Não foi possível buscar publicações.",
            );
          }
        })
        .finally(() => {
          if (active && generation === requestGeneration.current) {
            loadingRef.current = false;
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [input.enabled, input.onPage, input.query, retryCount]);

  async function loadMore() {
    const query = input.query.trim();
    if (!input.enabled || !cursor || loadingRef.current || query.length < 2)
      return;
    const generation = requestGeneration.current;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await restSocialApi.feed(cursor, "for-you", 20, query);
      if (generation !== requestGeneration.current) return;
      input.onPage(page);
      setPosts((existing) => {
        const byId = new Map(existing.map((post) => [post.id, post]));
        for (const post of page.items) byId.set(post.id, post);
        return [...byId.values()];
      });
      setCursor(page.nextCursor ?? null);
    } catch (searchError) {
      if (generation === requestGeneration.current) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Não foi possível carregar mais publicações.",
        );
      }
    } finally {
      if (generation === requestGeneration.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }

  return {
    posts,
    cursor,
    loading,
    error,
    retry: () => setRetryCount((value) => value + 1),
    loadMore,
  };
}
