import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "cryptoclaw/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
