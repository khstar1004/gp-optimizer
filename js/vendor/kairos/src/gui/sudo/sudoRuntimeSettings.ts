export interface SudoOllamaSettings {
  endpoint: string;
  vlmModel: string;
  assistantModel: string;
}

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "gemma4:e4b";
const SUDO_OLLAMA_ENDPOINT_KEY = "sudo.ollama.endpoint.v1";
const SUDO_OLLAMA_VLM_MODEL_KEY = "sudo.ollama.vlm-model.v1";
const SUDO_OLLAMA_ASSISTANT_MODEL_KEY = "sudo.ollama.assistant-model.v1";

export function normalizeSudoOllamaEndpointInput(endpoint: string) {
  return endpoint.trim().replace(/\/+$/, "");
}

function readStorageValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key)?.trim() ?? "";
}

function writeStorageValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, trimmed);
}

export function getDefaultSudoOllamaEndpoint() {
  return normalizeSudoOllamaEndpointInput(
    String(
      import.meta.env.VITE_SUDO_OLLAMA_URL ??
        import.meta.env.OLLAMA_BASE_URL ??
        DEFAULT_OLLAMA_URL
    )
  );
}

export function getDefaultSudoVlmModel() {
  return String(
    import.meta.env.VITE_SUDO_VLM_MODEL ??
      import.meta.env.OLLAMA_MODEL ??
      DEFAULT_OLLAMA_MODEL
  ).trim();
}

export function getDefaultSudoAssistantModel() {
  return String(
    import.meta.env.VITE_SUDO_ASSISTANT_MODEL ??
      import.meta.env.VITE_SUDO_VLM_MODEL ??
      import.meta.env.OLLAMA_MODEL ??
      DEFAULT_OLLAMA_MODEL
  ).trim();
}

export function readSudoOllamaSettings(): SudoOllamaSettings {
  return {
    endpoint:
      normalizeSudoOllamaEndpointInput(
        readStorageValue(SUDO_OLLAMA_ENDPOINT_KEY)
      ) || getDefaultSudoOllamaEndpoint(),
    vlmModel:
      readStorageValue(SUDO_OLLAMA_VLM_MODEL_KEY) || getDefaultSudoVlmModel(),
    assistantModel:
      readStorageValue(SUDO_OLLAMA_ASSISTANT_MODEL_KEY) ||
      getDefaultSudoAssistantModel(),
  };
}

export function writeSudoOllamaSettings(settings: SudoOllamaSettings) {
  writeStorageValue(
    SUDO_OLLAMA_ENDPOINT_KEY,
    normalizeSudoOllamaEndpointInput(settings.endpoint)
  );
  writeStorageValue(SUDO_OLLAMA_VLM_MODEL_KEY, settings.vlmModel);
  writeStorageValue(SUDO_OLLAMA_ASSISTANT_MODEL_KEY, settings.assistantModel);
}

export function clearSudoOllamaSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SUDO_OLLAMA_ENDPOINT_KEY);
  window.localStorage.removeItem(SUDO_OLLAMA_VLM_MODEL_KEY);
  window.localStorage.removeItem(SUDO_OLLAMA_ASSISTANT_MODEL_KEY);
}
