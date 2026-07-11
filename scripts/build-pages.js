const { cpSync, mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const docs = path.join(root, "docs");
const playground = path.join(docs, "playground");
mkdirSync(playground, { recursive: true });
cpSync(path.join(root, "dist-dev"), playground, { recursive: true });
writeFileSync(
  path.join(docs, "index.html"),
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>vue-screenfull</title><style>body{font:18px system-ui;max-width:52rem;margin:10vh auto;padding:1.5rem;color:#17202a}a{display:inline-block;margin:1rem 1rem 0 0;color:#3153c6}</style><h1>vue-screenfull</h1><p>Reactive, typed fullscreen utilities for Vue 3.</p><a href="./playground/">Open playground</a><a href="./api/">API documentation</a></html>\n',
);
