import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      // Emitted by `prisma generate` on every install — not hand-written source.
      "src/generated/**",
      ".next/**",
      "node_modules/**",
      // Reference copies of the original PHP application.
      "legacy-php/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
