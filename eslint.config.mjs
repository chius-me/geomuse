import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".artifacts/**",
    ".wrangler/**",
    "coverage/**",
    "out/**",
    "build/**",
    "playwright-report/**",
    "public/vendor/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
