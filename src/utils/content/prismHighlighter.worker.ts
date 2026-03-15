import { highlightContent } from "./prismHighlightCore";

interface PrismHighlightRequest {
  id: number;
  content: string;
  language: string | null;
}

interface PrismHighlightSuccessResponse {
  id: number;
  highlightedLines: string[];
}

interface PrismHighlightErrorResponse {
  id: number;
  error: string;
}

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<PrismHighlightRequest>): void => {
  const { id, content, language } = event.data;

  try {
    const highlightedLines = highlightContent(content, language);
    const response: PrismHighlightSuccessResponse = { id, highlightedLines };
    workerScope.postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Prism worker error";
    const response: PrismHighlightErrorResponse = { id, error: message };
    workerScope.postMessage(response);
  }
};

export {};
