import { useState, useCallback } from "react";
import { formatExtensionInput, parseExtensionInput } from "../utils";

interface UseSearchFiltersProps {
  search: {
    extensionFilter: string[];
    setExtensionFilter: (filter: string[]) => void;
    branchFilter: string[];
    setBranchFilter: (filter: string[]) => void;
    resetFilters: () => void;
  };
}

export const useSearchFilters = ({
  search,
}: UseSearchFiltersProps): {
  extensionInput: string;
  setExtensionInput: (value: string) => void;
  filtersExpanded: boolean;
  setFiltersExpanded: (value: boolean) => void;
  applyExtensionFilter: () => void;
  handleBranchToggle: (branch: string) => void;
  clearBranchFilter: () => void;
  toggleFilters: () => void;
  handleResetFilters: () => void;
} => {
  const [extensionInput, setExtensionInput] = useState(() =>
    formatExtensionInput(search.extensionFilter),
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const applyExtensionFilter = useCallback(() => {
    const parsed = parseExtensionInput(extensionInput);
    search.setExtensionFilter(parsed);
  }, [extensionInput, search]);

  const handleBranchToggle = useCallback(
    (branch: string): void => {
      const normalized = branch.trim();
      if (normalized.length === 0) {
        return;
      }

      if (search.branchFilter.includes(normalized)) {
        search.setBranchFilter(search.branchFilter.filter((item) => item !== normalized));
      } else {
        search.setBranchFilter([...search.branchFilter, normalized]);
      }
    },
    [search],
  );

  const clearBranchFilter = useCallback((): void => {
    search.setBranchFilter([]);
  }, [search]);

  const toggleFilters = useCallback(() => {
    setFiltersExpanded((prev) => !prev);
  }, []);

  const handleResetFilters = useCallback(() => {
    search.resetFilters();
    setFiltersExpanded(false);
    search.setBranchFilter([]);
    search.setExtensionFilter([]);
    setExtensionInput("");
  }, [search]);

  return {
    extensionInput,
    setExtensionInput,
    filtersExpanded,
    setFiltersExpanded,
    applyExtensionFilter,
    handleBranchToggle,
    clearBranchFilter,
    toggleFilters,
    handleResetFilters,
  };
};
