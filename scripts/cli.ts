#!/usr/bin/env tsx
import { main, parseArgs } from "../src/cli/main";

const args = process.argv.slice(2);
const { urls, options } = parseArgs(args);

main(urls, options).then((code) => {
  process.exit(code);
});
