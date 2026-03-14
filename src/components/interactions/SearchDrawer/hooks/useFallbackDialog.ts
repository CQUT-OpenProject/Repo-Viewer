import { useState, useCallback, useMemo } from "react";

interface UseFallbackDialogProps {
  search: {
    searchLoading: boolean;
    searchResult: {
      mode: string;
      items: unknown[];
      completedAt: number;
    } | null;
    keyword: string;
  };
}

export const useFallbackDialog = ({
  search,
}: UseFallbackDialogProps): {
  fallbackDialogOpen: boolean;
  openFallbackPrompt: () => void;
  handleFallbackDialogClose: () => void;
} => {
  const [dismissedResultId, setDismissedResultId] = useState<number | null>(null);

  const currentResultId = search.searchResult?.completedAt ?? null;
  const shouldPrompt = useMemo(() => {
    if (search.searchLoading || search.searchResult === null) {
      return false;
    }
    const { mode, items } = search.searchResult;
    const keyword = search.keyword.trim();
    return mode === "search-index" && items.length === 0 && keyword.length > 0;
  }, [search.searchLoading, search.searchResult, search.keyword]);

  const fallbackDialogOpen =
    shouldPrompt && currentResultId !== null && currentResultId !== dismissedResultId;

  const openFallbackPrompt = useCallback(() => {
    if (currentResultId !== null) {
      setDismissedResultId(null);
    }
  }, [currentResultId]);

  const handleFallbackDialogClose = useCallback(() => {
    if (currentResultId !== null) {
      setDismissedResultId(currentResultId);
    }
  }, [currentResultId]);

  return {
    fallbackDialogOpen,
    openFallbackPrompt,
    handleFallbackDialogClose,
  };
};
