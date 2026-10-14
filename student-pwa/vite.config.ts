import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { mockApiPlugin } from "./src/lib/mock.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [
      ...(env.VITE_USE_MOCK !== "false"
        ? [mockApiPlugin(env.VITE_API_URL || "/api")]
        : []),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectRegister: false,
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        },
        manifest: {
          name: "VKU · Cổng sinh viên",
          short_name: "VKU Student",
          lang: "vi",
          start_url: env.VITE_BASE_PATH || "/",
          scope: env.VITE_BASE_PATH || "/",
          display: "standalone",
          theme_color: "#203870",
          background_color: "#F6F7F9",
          icons: [
            {
              src: `${env.VITE_BASE_PATH || "/"}icon.svg`,
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
          ],
        },
      }),
    ],
  };
});
