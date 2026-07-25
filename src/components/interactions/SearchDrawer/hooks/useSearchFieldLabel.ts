import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface UseSearchFieldLabelProps {
  branchFilter: string[];
  availableBranches: string[];
  currentBranch: string;
  defaultBranch: string;
  pathPrefix: string;
  isSmallScreen: boolean;
}

function getListSeparator(locale: string): string {
  const lang = locale.split("-")[0]?.toLowerCase() ?? "";
  return lang === "zh" || lang === "ja" ? "、" : ", ";
}

export const useSearchFieldLabel = ({
  branchFilter,
  availableBranches,
  currentBranch,
  defaultBranch,
  pathPrefix,
  isSmallScreen,
}: UseSearchFieldLabelProps): string => {
  const { t, locale } = useI18n();

  return useMemo(() => {
    const trimmedPath = pathPrefix.trim();
    const pathSuffix = !isSmallScreen && trimmedPath.length > 0 ? trimmedPath : "";
    const listSeparator = getListSeparator(locale);

    if (branchFilter.length > 0) {
      const orderedBranches = availableBranches.filter((branch) => branchFilter.includes(branch));

      if (isSmallScreen && orderedBranches.length > 1) {
        return t("search.label.inMultipleBranches", { count: orderedBranches.length });
      }

      if (!isSmallScreen && orderedBranches.length > 3) {
        const displayBranches = orderedBranches.slice(0, 3).join(listSeparator);
        if (pathSuffix !== "") {
          return t("search.label.inMultipleBranchesWithPath", {
            branches: displayBranches,
            count: orderedBranches.length,
            path: pathSuffix,
          });
        }
        return t("search.label.inMultipleBranches", { count: orderedBranches.length });
      }

      const displayBranches = orderedBranches.join(listSeparator);
      if (pathSuffix !== "") {
        return t("search.label.inBranchesWithPath", {
          branches: displayBranches,
          path: pathSuffix,
        });
      }
      return t("search.label.inBranches", { branches: displayBranches });
    }

    const fallbackBranch = currentBranch !== "" ? currentBranch : defaultBranch;
    if (fallbackBranch === "") {
      return t("search.label.default");
    }
    if (pathSuffix !== "") {
      return t("search.label.inBranchesWithPath", { branches: fallbackBranch, path: pathSuffix });
    }
    return t("search.label.inBranch", { branch: fallbackBranch });
  }, [
    branchFilter,
    availableBranches,
    currentBranch,
    defaultBranch,
    pathPrefix,
    isSmallScreen,
    t,
    locale,
  ]);
};
