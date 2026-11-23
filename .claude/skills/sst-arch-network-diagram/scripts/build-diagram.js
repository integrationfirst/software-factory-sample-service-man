#!/usr/bin/env node
// Builds a Microsoft-reference-style Azure network diagram (.drawio) from a JSON spec.
// Usage: node build-diagram.js spec.json out.drawio
// Spec format: see ../references/spec-format.md
"use strict";
const fs = require("fs");

const ICON_BASE = "https://app.diagrams.net/img/lib/azure2/";
const ALIASES = {
  function: "compute/Function_Apps", appservice: "compute/App_Services", vm: "compute/Virtual_Machine",
  vmss: "compute/VM_Scale_Sets", aks: "containers/Kubernetes_Services", acr: "containers/Container_Registries",
  aci: "containers/Container_Instances", containerapp: "other/Worker_Container_App",
  containerappenv: "other/Container_App_Environments", vnet: "networking/Virtual_Networks",
  subnet: "networking/Subnet", nsg: "networking/Network_Security_Groups", pe: "networking/Private_Endpoint",
  privatelink: "networking/Private_Link", nic: "networking/Network_Interfaces", lb: "networking/Load_Balancers",
  appgw: "networking/Application_Gateways", firewall: "networking/Firewalls", frontdoor: "networking/Front_Doors",
  bastion: "networking/Bastions", nat: "networking/NAT", vpngw: "networking/Virtual_Network_Gateways",
  udr: "networking/Route_Tables", pip: "networking/Public_IP_Addresses", dns: "networking/DNS_Zones",
  expressroute: "networking/ExpressRoute_Circuits", vwan: "networking/Virtual_WANs",
  ddos: "networking/DDoS_Protection_Plans", servicebus: "integration/Service_Bus",
  apim: "integration/API_Management_Services", eventgrid: "integration/Event_Grid_Topics",
  logicapp: "integration/Logic_Apps", eventhubs: "analytics/Event_Hubs",
  loganalytics: "analytics/Log_Analytics_Workspaces", appinsights: "devops/Application_Insights",
  monitor: "management_governance/Monitor", keyvault: "security/Key_Vaults",
  identity: "identity/Managed_Identities", users: "identity/Users", entra: "identity/Azure_Active_Directory",
  storage: "storage/Storage_Accounts", sql: "databases/SQL_Database", cosmos: "databases/Azure_Cosmos_DB",
  postgres: "databases/Azure_Database_PostgreSQL_Server", redis: "databases/Cache_Redis",
  ase: "app_services/App_Service_Environments", openai: "ai_machine_learning/Azure_OpenAI",
  internet: "general/Globe",
};
const FONT = "fontFamily=Segoe UI;";
const C = {
  vnet: "#5EA0EF", subnetFill: "#F2F2F2", subnetStroke: "#A6C8F0", innerStroke: "#E6E6E6",
  paasFill: "#F2F2F2", paasStroke: "#D6D6D6", cluster: "#EBF3FC", pool: "#A6A6A6",
  k8s: "#326CE5", inbound: "#107C10", outbound: "#4472C4",
};

function iconUrl(icon) {
  if (!icon) return null;
  if (/^https?:/.test(icon)) return icon;
  const p = ALIASES[icon.toLowerCase()] || icon.replace(/\.svg$/, "");
  return ICON_BASE + p + ".svg";
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// labels: allow "\n" or "<br>" for line breaks; everything else is escaped
function label(s) {
  return esc(String(s ?? "").replace(/<br\s*\/?>/gi, "\n")).replace(/\n/g, "&lt;br&gt;");
}

const cells = [];
const ids = new Set();
let auto = 0;
function uid(base) {
  let id = base || "c" + ++auto;
  while (ids.has(id)) id = (base || "c") + ++auto;
  ids.add(id);
  return id;
}
function vertex(id, value, style, x, y, w, h, parent = "1") {
  id = uid(id);
  cells.push(`<mxCell id="${esc(id)}" value="${value}" style="${style}" vertex="1" parent="${parent}"><mxGeometry x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" as="geometry"/></mxCell>`);
  return id;
}
const r = (n) => Math.round(n * 10) / 10;
function image(id, icon, x, y, w, h, extra = "", value = "") {
  return vertex(id, value, `image;aspect=fixed;html=1;${extra}image=${iconUrl(icon)};`, x, y, w, h);
}
function text(id, value, x, y, w, h, align = "left", size = 11, extra = "") {
  return vertex(id, label(value), `text;html=1;whiteSpace=wrap;fontSize=${size};${FONT}align=${align};verticalAlign=middle;${extra}`, x, y, w, h);
}

const SIDES = { right: [1, 0.5], left: [0, 0.5], top: [0.5, 0], bottom: [0.5, 1] };
function anchor(a) {
  if (a == null) return null;
  if (Array.isArray(a)) return a;
  if (SIDES[a]) return SIDES[a];
  throw new Error("Unknown anchor " + a);
}

const builders = {
  title(e) { text(e.id || "title", e.text, e.x ?? 40, e.y ?? 6, e.w ?? 900, e.h ?? 28, "left", 16); },

  vnet(e) {
    vertex(e.id, "", `rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=${C.vnet};dashed=1;strokeWidth=1;`, e.x, e.y, e.w, e.h);
    image(e.id + "_icon", "vnet", e.x + 2, e.y - 22, 30, 18);
    const v = [e.label || "Virtual network", e.cidr].filter(Boolean).join("  ");
    text(e.id + "_label", v, e.x + 38, e.y - 24, Math.max(200, v.length * 7), 22);
  },

  subnet(e) {
    const lines = [e.label, e.cidr, e.note].filter(Boolean).join("\n");
    vertex(e.id, label(lines), `rounded=0;whiteSpace=wrap;html=1;fillColor=${C.subnetFill};strokeColor=${C.subnetStroke};strokeWidth=3;verticalAlign=top;align=left;spacingLeft=34;spacingTop=2;fontSize=11;${FONT}`, e.x, e.y, e.w, e.h);
    image(e.id + "_icon", "subnet", e.x + 7, e.y + 6, 25, 15);
    if (e.nsg !== false) image(e.id + "_nsg", "nsg", e.x + e.w - 17, e.y - 10, 18, 22);
    if (e.udr) image(e.id + "_udr", "udr", e.x + e.w - 42, e.y - 10, 22, 22);
  },

  // tile = labelled square with an icon. variant "inner" (white, inside a subnet) or "paas" (gray, outside the VNet)
  tile(e) {
    const w = e.w ?? 120, h = e.h ?? 105, paas = e.variant === "paas";
    vertex(e.id, label(e.label), `rounded=0;whiteSpace=wrap;html=1;fillColor=${paas ? C.paasFill : "#FFFFFF"};strokeColor=${paas ? C.paasStroke : C.innerStroke};verticalAlign=bottom;spacingBottom=6;fontSize=11;${FONT}`, e.x, e.y, w, h);
    const is = e.iconSize ?? 44;
    if (e.icon) image(e.id + "_icon", e.icon, e.x + (w - is) / 2, e.y + 12, is, is);
    if (e.badge) {
      image(e.id + "_badge", e.badge.icon || "identity", e.x + 8, e.y + 8, 20, 19);
      if (e.badge.label) text(e.id + "_badgeL", e.badge.label, e.x + 30, e.y + 4, 70, 28, "left", 9);
    }
  },

  // box = grouping container. variant "cluster" (light blue, e.g. AKS / ASE / Container Apps env), "pool" (white dashed, e.g. node pool / namespace), "plain"
  box(e) {
    const v = e.variant || "plain";
    if (v === "cluster") {
      vertex(e.id, "", `rounded=0;whiteSpace=wrap;html=1;fillColor=${C.cluster};strokeColor=none;`, e.x, e.y, e.w, e.h);
      let tx = e.x + 10;
      if (e.icon) { image(e.id + "_icon", e.icon, e.x + 10, e.y + 7, 34, 30); tx = e.x + 51; }
      text(e.id + "_label", e.label, tx, e.y + 4, e.w - (tx - e.x) - 10, 36);
    } else if (v === "pool") {
      vertex(e.id, label(e.label), `rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=${C.pool};dashed=1;verticalAlign=top;align=left;spacingLeft=8;fontSize=11;${FONT}`, e.x, e.y, e.w, e.h);
    } else {
      vertex(e.id, label(e.label), `rounded=0;whiteSpace=wrap;html=1;fillColor=${C.paasFill};strokeColor=${C.paasStroke};verticalAlign=top;align=left;spacingLeft=8;fontSize=11;${FONT}`, e.x, e.y, e.w, e.h);
    }
  },

  // standalone icon; labelPos "bottom" | "right" | "none"
  icon(e) {
    const lp = e.labelPos || "bottom";
    const ls = lp === "right" ? "labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;spacingLeft=4;"
      : lp === "bottom" ? "verticalLabelPosition=bottom;verticalAlign=top;" : "";
    image(e.id, e.icon, e.x, e.y, e.w ?? 44, e.h ?? 44, `${ls}fontSize=${e.size ?? 11};${FONT}`, lp === "none" ? "" : label(e.label));
  },

  pod(e) {
    vertex(e.id, "", `aspect=fixed;html=1;fillColor=${C.k8s};strokeColor=#ffffff;shape=mxgraph.kubernetes.icon2;prIcon=${e.kind || "pod"};${e.faded ? "opacity=45;" : ""}`, e.x, e.y, e.w ?? 36, e.h ?? 35);
  },

  // Kubernetes object (Service, ScaledObject, Ingress, ...)
  k8s(e) {
    vertex(e.id, label(e.label), `rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=${C.k8s};fontSize=10;${FONT}`, e.x, e.y, e.w ?? 130, e.h ?? 40);
  },

  text(e) { text(e.id, e.text, e.x, e.y, e.w ?? 200, e.h ?? 20, e.align || "left", e.size ?? 11); },

  marker(e) {
    const inb = e.kind === "inbound";
    vertex(e.id || `m_${e.kind}_${e.n}`, esc(e.n), `${inb ? "ellipse" : "rounded=0"};whiteSpace=wrap;html=1;fillColor=${inb ? C.inbound : C.outbound};strokeColor=none;fontColor=#FFFFFF;fontStyle=1;fontSize=11;${FONT}`, e.x, e.y, inb ? 22 : 20, inb ? 22 : 20);
  },

  legend(e) {
    vertex("legend_in", "", `ellipse;whiteSpace=wrap;html=1;fillColor=${C.inbound};strokeColor=none;`, e.x, e.y, 20, 20);
    text("legend_inL", e.inbound || "Inbound flow", e.x + 26, e.y, 160, 20);
    vertex("legend_out", "", `rounded=0;whiteSpace=wrap;html=1;fillColor=${C.outbound};strokeColor=none;`, e.x, e.y + 30, 20, 20);
    text("legend_outL", e.outbound || "Outbound / private flow", e.x + 26, e.y + 30, 180, 20);
    if (e.dashed) {
      edgeRaw("legend_dash", null, null, "dashed=1;endArrow=block;endSize=5;strokeColor=#000000;", [[e.x, e.y + 70], [e.x + 20, e.y + 70]]);
      text("legend_dashL", e.dashed, e.x + 26, e.y + 60, 220, 20);
    }
  },

  // numbered flow description: { inbound: ["..."], outbound: ["..."], notes: ["..."] }
  steps(e) {
    const parts = [];
    (e.inbound || []).forEach((s, i) => parts.push(`<b>Inbound ${i + 1}</b>&nbsp; ${esc(s)}`));
    (e.outbound || []).forEach((s, i) => parts.push(`<b>${i + 1}</b>&nbsp; ${esc(s)}`));
    (e.notes || []).forEach((s) => parts.push(esc(s)));
    vertex(e.id || "steps", esc(parts.join("<br>")), `text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;fontSize=11;${FONT}`, e.x, e.y, e.w, e.h ?? 18 * parts.length + 10);
  },

  edge(e) {
    const ex = anchor(e.exit), en = anchor(e.entry);
    let s = "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endSize=5;strokeColor=#000000;";
    if (e.dashed) s += "dashed=1;";
    if (e.bidirectional) s += "startArrow=block;startSize=5;";
    if (ex) s += `exitX=${ex[0]};exitY=${ex[1]};`;
    if (en) s += `entryX=${en[0]};entryY=${en[1]};`;
    if (e.label) s += `fontSize=10;${FONT}labelBackgroundColor=#FFFFFF;`;
    edgeRaw(e.id, e.from, e.to, s, e.points, e.label);
  },
};

function edgeRaw(id, from, to, style, points, value) {
  id = uid(id || `e_${from}_${to}`);
  const st = from ? ` source="${esc(from)}"` : "";
  const tt = to ? ` target="${esc(to)}"` : "";
  let geo;
  if (!from && points && points.length >= 2) {
    const [a, ...rest] = points; const b = rest.pop();
    geo = `<mxGeometry relative="1" as="geometry"><mxPoint x="${a[0]}" y="${a[1]}" as="sourcePoint"/><mxPoint x="${b[0]}" y="${b[1]}" as="targetPoint"/>${rest.length ? `<Array as="points">${rest.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join("")}</Array>` : ""}</mxGeometry>`;
  } else if (points && points.length) {
    geo = `<mxGeometry relative="1" as="geometry"><Array as="points">${points.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join("")}</Array></mxGeometry>`;
  } else geo = `<mxGeometry relative="1" as="geometry"/>`;
  cells.push(`<mxCell id="${esc(id)}" value="${label(value || "")}" style="${style}" edge="1" parent="1"${st}${tt}>${geo}</mxCell>`);
}

function main() {
  const [specPath, outPath] = process.argv.slice(2);
  if (!specPath || !outPath) { console.error("usage: node build-diagram.js spec.json out.drawio"); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  if (spec.title) builders.title({ text: spec.title });
  const els = spec.elements || [];
  // edges last so every endpoint exists; keep author order otherwise (z-order = order)
  for (const e of els.filter((x) => x.type !== "edge")) {
    const b = builders[e.type];
    if (!b) throw new Error("Unknown element type: " + e.type);
    if (e.type !== "title" && e.type !== "legend" && e.type !== "steps" && e.type !== "marker" && !e.id) e.id = uid();
    b(e);
  }
  const vertexIds = new Set(ids);
  for (const e of els.filter((x) => x.type === "edge")) {
    for (const k of ["from", "to"]) if (!vertexIds.has(e[k])) throw new Error(`edge ${e.id || ""} ${k}="${e[k]}" does not exist`);
    builders.edge(e);
  }
  const W = spec.page?.width ?? 1500, H = spec.page?.height ?? 1000;
  const xml = `<mxfile host="drawio">\n<diagram id="${esc(spec.id || "network")}" name="${esc(spec.name || spec.title || "Network")}">\n<mxGraphModel adaptiveColors="auto" grid="1" gridSize="10" page="1" pageWidth="${W}" pageHeight="${H}" background="#FFFFFF">\n<root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${cells.join("\n")}\n</root>\n</mxGraphModel>\n</diagram>\n</mxfile>\n`;
  fs.writeFileSync(outPath, xml);
  console.log(`wrote ${outPath}: ${cells.length} cells`);
}
main();
