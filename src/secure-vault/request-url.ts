/** Resolve a provider-relative API path before attaching authentication data. */
export function resolveProviderRequestUrl(baseUrl: string, apiPath: string): string {
  const base = new URL(baseUrl);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) {
    throw new Error("Provider base URL must be HTTP(S) without URL credentials");
  }

  // Keep tool input in the path component of the configured provider URL.
  if (!/^\/(?!\/)[^\u0000-\u0020\u007f\\#]*$/.test(apiPath)) {
    throw new Error("Expected a provider-relative API path");
  }

  const target = new URL(`${baseUrl}${apiPath}`);
  if (target.origin !== base.origin) {
    throw new Error("Request destination must match the configured provider origin");
  }
  return target.href;
}
