import { useState } from "react";
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

  const applyExtensionFilter = () => {
    const parsed = parseExtensionInput(extensionInput);
    search.setExtensionFilter(parsed);
  };

  const handleBranchToggle = (branch: string): void => {
    const normalized = branch.trim();
    if (normalized.length === 0) {
      return;
    }

    if (search.branchFilter.includes(normalized)) {
      search.setBranchFilter(search.branchFilter.filter((item) => item !== normalized));
    } else {
      search.setBranchFilter([...search.branchFilter, normalized]);
    }
  };

  const clearBranchFilter = (): void => {
    search.setBranchFilter([]);
  };

  const toggleFilters = () => {
    setFiltersExpanded((prev) => !prev);
  };

  const handleResetFilters = () => {
    search.resetFilters();
    setFiltersExpanded(false);
    search.setBranchFilter([]);
    search.setExtensionFilter([]);
    setExtensionInput("");
  };

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
