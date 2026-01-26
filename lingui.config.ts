export default {
  locales: ["en", "ko", "ja"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "<rootDir>/src/i18n/locales/{locale}/messages",
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
  ],
  format: "po",
  compileNamespace: "ts",
};
