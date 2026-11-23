#!/usr/bin/env node
// Lints an uncompressed .drawio network diagram for structural errors and layout collisions.
// Usage: node lint-diagram.js diagram.drawio [--check-icons]
// Exit code 1 on errors. Warnings are approximate (they predict draw.io's orthogonal routing) and must be
// confirmed on the rendered image, but every warning here was a real defect in earlier diagrams.
"use strict";
const fs = require("fs");
const file = process.argv[2];
const checkIcons = process.argv.includes("--check-icons");
if (!file) { console.error("usage: node lint-diagram.js diagram.drawio [--check-icons]"); process.exit(2); }
const xml = fs.readFileSync(file, "utf8");
if (!/<mxCell/.test(xml)) { console.error("No <mxCell> found - is the diagram compressed? Save it uncompressed."); process.exit(2); }

const errors = [], warnings = [];
const attr = (s, n) => { const m = s.match(new RegExp(`\\s${n}="([^"]*)"`)); return m ? m[1] : null; };
const sty = (s, k) => { const m = (s || "").match(new RegExp(`(?:^|;)${k}=([^;]*)`)); return m ? m[1] : null; };
const decode = (s) => (s || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");

const cells = [];
const re = /<mxCell\b([^>]*?)(\/>|>([\s\S]*?)<\/mxCell>)/g;
let m;
while ((m = re.exec(xml))) {
  const a = m[1], body = m[3] || "";
  const c = { id: attr(a, "id"), value: attr(a, "value"), style: attr(a, "style") || "", parent: attr(a, "parent"),
    vertex: attr(a, "vertex") === "1", edge: attr(a, "edge") === "1", source: attr(a, "source"), target: attr(a, "target"), body };
  const g = body.match(/<mxGeometry\b([^>]*?)(\/>|>)/);
  if (g) { c.geo = { x: +(attr(g[1], "x") || 0), y: +(attr(g[1], "y") || 0), w: +(attr(g[1], "width") || 0), h: +(attr(g[1], "height") || 0) }; }
  c.points = [...body.matchAll(/<mxPoint\b([^>]*?)\/>/g)].filter((p) => !/as="(source|target)Point"/.test(p[1])).map((p) => [+(attr(p[1], "x") || 0), +(attr(p[1], "y") || 0)]);
  cells.push(c);
}
const byId = new Map();
for (const c of cells) {
  if (!c.id) errors.push("cell without id");
  else if (byId.has(c.id)) errors.push(`duplicate id "${c.id}"`);
  else byId.set(c.id, c);
}

// ---- structural checks
for (const c of cells) {
  if (c.edge) {
    if (!/<mxGeometry/.test(c.body)) errors.push(`edge ${c.id}: missing <mxGeometry> child (will not render)`);
    for (const k of ["source", "target"]) if (c[k] && !byId.has(c[k])) errors.push(`edge ${c.id}: ${k} "${c[k]}" does not exist`);
  }
  if (c.parent && c.parent !== "0" && !byId.has(c.parent)) errors.push(`cell ${c.id}: parent "${c.parent}" does not exist`);
}
if (/<!--/.test(xml)) errors.push("XML comments are not allowed in .drawio output");

// absolute geometry (resolve nested parents)
function abs(c) {
  if (!c.geo) return null;
  let { x, y } = c.geo; let p = byId.get(c.parent);
  while (p && p.vertex && p.geo) { x += p.geo.x; y += p.geo.y; p = byId.get(p.parent); }
  return { x, y, w: c.geo.w, h: c.geo.h };
}
const V = cells.filter((c) => c.vertex && c.geo).map((c) => ({ ...c, b: abs(c) }));

// classify vertices
const isImage = (c) => /(^|;)image;/.test(c.style) || /shape=mxgraph\./.test(c.style);
const isText = (c) => /(^|;)text;/.test(c.style);
const isSubnet = (c) => /strokeColor=#A6C8F0/i.test(c.style) && /strokeWidth=3/.test(c.style);
const isMarker = (c) => /fillColor=#(107C10|4472C4)/i.test(c.style) && c.b.w <= 24 && c.b.h <= 24;
const contains = (a, b, t = 1) => b.x >= a.x - t && b.y >= a.y - t && b.x + b.w <= a.x + a.w + t && b.y + b.h <= a.y + a.h + t;
const inter = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const area = (b) => b.w * b.h;

// estimated text box actually covered by a text cell's words (cells are often wider than their text)
function textExtent(c) {
  const lines = decode(c.value).split("\n");
  const fs_ = +(sty(c.style, "fontSize") || 11);
  const w = Math.min(c.b.w, Math.max(...lines.map((l) => l.length)) * fs_ * 0.56);
  const h = Math.min(c.b.h, lines.length * fs_ * 1.3);
  const al = sty(c.style, "align") || "center";
  const x = al === "left" ? c.b.x : al === "right" ? c.b.x + c.b.w - w : c.b.x + (c.b.w - w) / 2;
  const va = sty(c.style, "verticalAlign") || "middle";
  const y = va === "top" ? c.b.y : va === "bottom" ? c.b.y + c.b.h - h : c.b.y + (c.b.h - h) / 2;
  return { x, y, w, h };
}
// label band of a container whose value is drawn at the top (subnets, pools)
function headerBand(c) {
  if (!c.value || sty(c.style, "verticalAlign") !== "top") return null;
  const lines = decode(c.value).split("\n");
  const fs_ = +(sty(c.style, "fontSize") || 11);
  const left = +(sty(c.style, "spacingLeft") || 0), top = +(sty(c.style, "spacingTop") || 0);
  return { x: c.b.x + left, y: c.b.y, w: Math.min(c.b.w - left, Math.max(...lines.map((l) => l.length)) * fs_ * 0.56 + 6), h: top + lines.length * fs_ * 1.3 + 4 };
}
// bottom label band of a tile (verticalAlign=bottom)
function footerBand(c) {
  if (!c.value || sty(c.style, "verticalAlign") !== "bottom" || isImage(c)) return null;
  const lines = decode(c.value).split("\n");
  const fs_ = +(sty(c.style, "fontSize") || 11), sb = +(sty(c.style, "spacingBottom") || 0);
  const w = Math.min(c.b.w, Math.max(...lines.map((l) => l.length)) * fs_ * 0.56);
  const h = lines.length * fs_ * 1.3;
  return { x: c.b.x + (c.b.w - w) / 2, y: c.b.y + c.b.h - sb - h, w, h };
}
// image labels drawn outside the icon
function imageLabel(c) {
  if (!isImage(c) || !c.value) return null;
  const lines = decode(c.value).split("\n");
  const fs_ = +(sty(c.style, "fontSize") || 11);
  const w = Math.max(...lines.map((l) => l.length)) * fs_ * 0.56, h = lines.length * fs_ * 1.3;
  if (sty(c.style, "labelPosition") === "right") return { x: c.b.x + c.b.w + 4, y: c.b.y + (c.b.h - h) / 2, w, h };
  if (sty(c.style, "verticalLabelPosition") === "bottom") return { x: c.b.x + (c.b.w - w) / 2, y: c.b.y + c.b.h + 2, w, h };
  return null;
}

// collect label regions
const labels = [];
for (const c of V) {
  if (isText(c) && c.value) labels.push({ id: c.id, kind: "text", b: textExtent(c) });
  const hb = headerBand(c); if (hb) labels.push({ id: c.id, kind: "header", b: hb });
  const fb = footerBand(c); if (fb) labels.push({ id: c.id, kind: "tile label", b: fb });
  const il = imageLabel(c); if (il) labels.push({ id: c.id, kind: "icon label", b: il });
  if (isMarker(c)) labels.push({ id: c.id, kind: "marker", b: c.b });
}

// ---- overlap checks
const solids = V.filter((c) => !isText(c));
for (let i = 0; i < labels.length; i++) {
  const L = labels[i];
  for (let j = i + 1; j < labels.length; j++) {
    const K = labels[j];
    if (L.id === K.id) continue;
    if (inter(shrink(L.b, 1), shrink(K.b, 1))) warnings.push(`label overlap: ${L.kind} "${L.id}" and ${K.kind} "${K.id}"`);
  }
  // labels covered by icons / tiles they don't belong to
  for (const s of solids) {
    if (s.id === L.id || L.id === s.id + "_label" || L.id.startsWith(s.id + "_")) continue;
    if (contains(s.b, L.b)) continue; // label inside a container/tile is fine
    if (isMarker(s) || !inter(shrink(L.b, 1), shrink(s.b, 1))) continue;
    if (!isImage(s) && isContainer(s)) continue; // a label straddling a container border is a deliberate placement
    warnings.push(isImage(s) ? `${L.kind} "${L.id}" overlaps icon "${s.id}"` : `${L.kind} "${L.id}" is covered by "${s.id}" (move the box or enlarge the header area)`);
  }
}
// partial overlaps between boxes (neither contains the other) - siblings should not cut each other
const boxes = V.filter((c) => !isText(c) && !isMarker(c) && !isImage(c));
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
  const a = boxes[i], b = boxes[j];
  if (inter(shrink(a.b, 2), shrink(b.b, 2)) && !contains(a.b, b.b, 2) && !contains(b.b, a.b, 2)) warnings.push(`boxes "${a.id}" and "${b.id}" partially overlap`);
}
function isContainer(s) { return V.some((o) => o.id !== s.id && !isImage(o) && !isMarker(o) && !o.id.startsWith(s.id + "_") && contains(s.b, o.b) && area(o.b) < area(s.b)); }
function shrink(b, d) { return { x: b.x + d, y: b.y + d, w: Math.max(0, b.w - 2 * d), h: Math.max(0, b.h - 2 * d) }; }

// ---- style checks (Microsoft reference style)
for (const s of V.filter(isSubnet)) {
  const hasIcon = V.some((c) => /Subnet\.svg/.test(c.style) && contains(s.b, c.b) && c.b.y < s.b.y + 30 && c.b.x < s.b.x + 40);
  if (!hasIcon) warnings.push(`subnet "${s.id}" has no Subnet icon in its top-left corner`);
  if (!/\d+\.\d+\.\d+\.\d+\/\d+/.test(decode(s.value))) warnings.push(`subnet "${s.id}" label has no CIDR`);
  const hasNsg = V.some((c) => /Network_Security_Groups\.svg/.test(c.style) && Math.abs(c.b.x + c.b.w - (s.b.x + s.b.w)) < 25 && Math.abs(c.b.y - s.b.y) < 20);
  if (!hasNsg) warnings.push(`subnet "${s.id}" has no NSG shield on its top-right corner (ok only for subnets that cannot have an NSG, e.g. GatewaySubnet)`);
}

// ---- edge routing checks: approximate orthogonal path, then test it against labels and unrelated icons/tiles
function port(c, ax, ay) { const b = c.b; return [b.x + ax * b.w, b.y + ay * b.h]; }
function edgePath(e) {
  const s = V.find((c) => c.id === e.source), t = V.find((c) => c.id === e.target);
  if (!s || !t) return null;
  const ex = sty(e.style, "exitX"), ey = sty(e.style, "exitY"), nx = sty(e.style, "entryX"), ny = sty(e.style, "entryY");
  const first = e.points[0] || [t.b.x + t.b.w / 2, t.b.y + t.b.h / 2];
  const last = e.points[e.points.length - 1] || [s.b.x + s.b.w / 2, s.b.y + s.b.h / 2];
  const a = ex != null ? port(s, +ex, +ey) : clampPort(s, first);
  const z = nx != null ? port(t, +nx, +ny) : clampPort(t, last);
  const pts = [a, ...e.points, z];
  const horizStart = ex != null ? (+ex === 0 || +ex === 1) : Math.abs(first[0] - a[0]) > Math.abs(first[1] - a[1]);
  const out = [pts[0]]; let horiz = horizStart;
  for (let i = 1; i < pts.length; i++) {
    const p = out[out.length - 1], q = pts[i];
    if (p[0] !== q[0] && p[1] !== q[1]) {
      if (i === pts.length - 1 && e.points.length === 0) {
        if (horiz) { const mx = (p[0] + q[0]) / 2; out.push([mx, p[1]], [mx, q[1]]); }
        else { const my = (p[1] + q[1]) / 2; out.push([p[0], my], [q[0], my]); }
      } else out.push(horiz ? [q[0], p[1]] : [p[0], q[1]]);
    }
    out.push(q);
    const l = out[out.length - 2]; horiz = l[1] === q[1];
  }
  return out;
}
function clampPort(c, toward) {
  const cx = c.b.x + c.b.w / 2, cy = c.b.y + c.b.h / 2, dx = toward[0] - cx, dy = toward[1] - cy;
  if (Math.abs(dx) * c.b.h > Math.abs(dy) * c.b.w) return [dx > 0 ? c.b.x + c.b.w : c.b.x, cy];
  return [cx, dy > 0 ? c.b.y + c.b.h : c.b.y];
}
function segHitsBox(p, q, b) {
  const x1 = Math.min(p[0], q[0]), x2 = Math.max(p[0], q[0]), y1 = Math.min(p[1], q[1]), y2 = Math.max(p[1], q[1]);
  return x1 < b.x + b.w && x2 > b.x && y1 < b.y + b.h && y2 > b.y;
}
const related = (e, id) => [e.source, e.target].some((x) => x && (id === x || id.startsWith(x + "_") || x.startsWith(id + "_")));
const edges = cells.filter((c) => c.edge && c.source && c.target);
const segsByEdge = new Map();
for (const e of edges) {
  const path = edgePath(e); if (!path) continue;
  const segs = []; for (let i = 0; i + 1 < path.length; i++) segs.push([path[i], path[i + 1]]);
  segsByEdge.set(e.id, segs);
  const hit = new Set();
  for (const L of labels) {
    if (related(e, L.id) || hit.has(L.id)) continue;
    if (segs.some(([p, q]) => segHitsBox(p, q, shrink(L.b, 1)))) { hit.add(L.id); warnings.push(`edge "${e.id}" (${e.source} -> ${e.target}) crosses ${L.kind} "${L.id}"`); }
  }
  for (const s of V.filter((c) => (isImage(c) || footerBand(c)) && !isMarker(c))) {
    if (related(e, s.id) || hit.has(s.id)) continue;
    const src = V.find((c) => c.id === e.source), tgt = V.find((c) => c.id === e.target);
    if ((src && contains(s.b, src.b)) || (tgt && contains(s.b, tgt.b))) continue;
    if (segs.some(([p, q]) => segHitsBox(p, q, shrink(s.b, 2)))) { hit.add(s.id); warnings.push(`edge "${e.id}" (${e.source} -> ${e.target}) passes through "${s.id}"`); }
  }
}
// crossings between edges (informational)
const ids = [...segsByEdge.keys()];
let crossings = 0;
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  for (const [p, q] of segsByEdge.get(ids[i])) for (const [r, s] of segsByEdge.get(ids[j])) {
    const h1 = p[1] === q[1], h2 = r[1] === s[1];
    if (h1 === h2) continue;
    const [H, Vt] = h1 ? [[p, q], [r, s]] : [[r, s], [p, q]];
    const x = Vt[0][0], y = H[0][1];
    if (x > Math.min(H[0][0], H[1][0]) + 1 && x < Math.max(H[0][0], H[1][0]) - 1 && y > Math.min(Vt[0][1], Vt[1][1]) + 1 && y < Math.max(Vt[0][1], Vt[1][1]) - 1) { crossings++; console.log(`info: edges "${ids[i]}" and "${ids[j]}" cross at (${Math.round(x)},${Math.round(y)})`); }
  }
}

(async () => {
  if (checkIcons) {
    const urls = [...new Set([...xml.matchAll(/image=(https?:\/\/[^;"]+)/g)].map((x) => x[1]))];
    for (const u of urls) {
      try { const r = await fetch(u); if (!r.ok) errors.push(`icon ${r.status}: ${u}`); } catch (err) { warnings.push(`icon not checked (${err.message}): ${u}`); }
    }
    console.log(`checked ${urls.length} icon URLs`);
  }
  for (const w of [...new Set(warnings)]) console.log("WARN  " + w);
  for (const e of errors) console.log("ERROR " + e);
  console.log(`${cells.length} cells, ${edges.length} edges: ${errors.length} errors, ${new Set(warnings).size} warnings, ${crossings} edge crossings`);
  process.exit(errors.length ? 1 : 0);
})();
