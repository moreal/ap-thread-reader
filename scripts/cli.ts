#!/usr/bin/env tsx
import { main, runCli } from "../src/cli/main";

const config = runCli();
main([config.url.href], {
  verbose: config.verbose,
  separator: config.separator,
}).then((code) => {
  process.exit(code);
});
