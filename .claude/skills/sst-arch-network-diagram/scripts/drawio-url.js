#!/usr/bin/env node
// Prints app.diagrams.net URLs for a .drawio file.
// Usage: node drawio-url.js diagram.drawio [--view] [--out url.txt]
//   default: editor URL (opens the diagram for editing)
//   --view : read-only lightbox URL (use this one for Playwright screenshots)
"use strict";
const fs = require("fs");
const zlib = require("zlib");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
if (!file) { console.error("usage: node drawio-url.js diagram.drawio [--view] [--out url.txt]"); process.exit(2); }
const xml = fs.readFileSync(file, "utf8");
const data = encodeURIComponent(zlib.deflateRawSync(encodeURIComponent(xml)).toString("base64"));
const q = args.includes("--view") ? "grid=0&pv=0&border=10&lightbox=1&nav=1" : "grid=0&pv=0&border=10&edit=_blank";
const url = `https://app.diagrams.net/?${q}#R${data}`;
const oi = args.indexOf("--out");
if (oi >= 0) { fs.writeFileSync(args[oi + 1], url + "\n"); console.error(`wrote ${args[oi + 1]} (${url.length} chars)`); }
else console.log(url);
