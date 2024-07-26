let config = null;

export async function loadConfig() {
  if (config) return config;

  const response = await fetch(
    `/config-${process.env.NODE_ENV === "prod" ? "prod" : "dev"}.json`
  );
  config = await response.json();
  return config;
}

export function getConfig() {
  if (!config) {
    throw new Error("Config not loaded");
  }
  return config;
}
