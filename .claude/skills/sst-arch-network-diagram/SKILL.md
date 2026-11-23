---
name: sst-arch-network-diagram
description: Create Azure infrastructure / network architecture diagrams as editable draw.io (.drawio) files in the Microsoft Azure Architecture Center reference style - VNet boundary, subnets with subnet icon + CIDR + NSG shield, private endpoints, PaaS services outside the VNet, numbered inbound/outbound flow markers and legend. Use when the user asks for an Azure network diagram, infrastructure diagram, landing-zone / hub-spoke / AKS / App Service / Functions / Container Apps topology, "diagram like Microsoft's reference architecture", or a drawio of how Azure services connect privately. Not for flowcharts, sequence or UML diagrams (use drawio:drawio).
---

# Azure network diagram (Microsoft reference style)

Builds a `.drawio` from a JSON spec with `scripts/build-diagram.js`, checks it with `scripts/lint-diagram.js`, renders it, and fixes collisions until clean. Hand-writing 150+ mxCells is error prone; the builder owns every style string so the result always matches the Microsoft look.

Scripts need Node 18+. Paths below are relative to this skill's folder.

## Workflow

1. **Get the architecture right first** (before drawing anything)
   - Identify every component, which ones are *inside* the VNet (VMs, AKS nodes, App Gateway, Firewall, Bastion, private endpoints, VNet-integration interfaces) and which are *PaaS outside it* (Function/App Service apps, Storage, Key Vault, SQL, Service Bus, ACR, Cosmos DB, monitoring).
   - Read `references/network-rules.md`. For any service-specific rule (delegation, minimum subnet size, inbound vs outbound), check the matching Azure skill in `.claude/` (e.g. `azure-functions`, `azure-kubernetes-service`, `azure-private-link`, `azure-virtual-network`) or Microsoft Learn. Never draw a PaaS app *inside* a subnet unless it really is injected (AKS, ASE, Container Apps env, APIM injected, VMs).
   - Optionally fetch the closest Azure Architecture Center reference (AKS baseline, App Service baseline network architecture, hub-spoke) to mirror its layout.

2. **Plan the layout on a grid** (see `references/style-guide.md` -> Layout)
   - Left column (x 30-300): clients, internet, on-premises, PaaS apps that integrate into the VNet, DNS, monitoring.
   - Center: VNet (dashed blue) containing subnets in rows; one row per tier.
   - Below the VNet: PaaS services, each directly under its private endpoint tile so PE -> service edges are straight vertical lines.
   - Leave >= 30 px corridors between subnets for edges and markers; route long edges through corridors with explicit `points`.

3. **Write the spec** (`references/spec-format.md`; full example `examples/function-private-baseline.json`). Save it next to the output as `<name>.diagram.json` so it can be edited and rebuilt later.

4. **Build, lint, iterate**
   ```bash
   node scripts/build-diagram.js <name>.diagram.json <name>.drawio
   node scripts/lint-diagram.js <name>.drawio --check-icons
   ```
   Fix every `ERROR` and every `WARN` (label overlaps, tiles covering a subnet header, edges crossing labels or passing through tiles, subnets missing the subnet icon / CIDR / NSG). `info:` edge crossings are acceptable only when unavoidable; minimize them.

5. **Render and look at it** - the linter approximates draw.io routing, so always confirm visually.
   ```bash
   node scripts/drawio-url.js <name>.drawio --view --out view-url.txt
   ```
   With Playwright available: `browser_navigate` to that URL, `browser_wait_for` text from a label (the page is blank until the diagram loads), `browser_take_screenshot` (save inside the working directory, e.g. `.playwright-mcp/<name>.png`), then Read the PNG. Look for: clipped/wrapped labels, edges through text, markers on top of lines, tiles crowding subnet headers, awkward jogs in edges (exit/entry anchors not aligned - align tile centers or set `exit`/`entry` fractions). Fix the spec, rebuild, repeat until clean.

6. **Deliver**
   - `<name>.drawio` (editable), `<name>.diagram.json` (source spec), `<name>.url.txt` (editor link: `node scripts/drawio-url.js <name>.drawio --out <name>.url.txt`), and the screenshot PNG.
   - If the draw.io desktop CLI exists, also export `drawio -x -f png -e -b 10 -o <name>.drawio.png <name>.drawio` (editable PNG). Otherwise say the PNG is a browser screenshot.
   - Summarize the flows (the numbered steps) and any remaining known compromise (e.g. one unavoidable edge crossing).

## Style rules that must hold (checked by the linter where possible)

- VNet: dashed `#5EA0EF` boundary; VNet icon + "Virtual network <CIDR>" label *above* the top-left corner.
- Subnet: `#F2F2F2` fill, `#A6C8F0` 3 px border, subnet icon top-left, label "Name subnet" + CIDR (+ delegation note), NSG shield on the top-right corner (omit only where an NSG is not supported, e.g. `GatewaySubnet`). Add the UDR icon (`"udr": true`) when a route table forces traffic through a firewall.
- Resources inside subnets: white tiles with a light-gray border, icon on top, label at the bottom.
- PaaS outside the VNet: gray tiles (`variant: "paas"`). Show a managed-identity badge where the service authenticates with MI.
- Private endpoints: one PE tile per service in the PE subnet, vertical edge to its service below.
- VNet integration (App Service / Functions): the app tile is outside the VNet; inside its delegated subnet draw a "Virtual interface" tile (NIC icon). Outbound only - inbound needs a private endpoint.
- Flows: green circles = inbound steps, blue squares = outbound / private steps, numbered in order; legend + numbered step text below the diagram. Black 1 px orthogonal arrows; dashed for secondary/optional paths.
- Font Segoe UI, 11 px (10 px for dense labels, 16 px title). No Microsoft logo or "Microsoft Azure" branding.

## Files

- `scripts/build-diagram.js` - spec -> .drawio (all styles, icon aliases)
- `scripts/lint-diagram.js` - structural + collision + style checks; `--check-icons` verifies icon URLs resolve
- `scripts/drawio-url.js` - editor or `--view` (lightbox) URL
- `references/style-guide.md` - colors, exact style strings, sizes, layout grid
- `references/network-rules.md` - Azure placement/subnet rules to get the topology right
- `references/spec-format.md` - spec element reference + icon aliases
- `examples/function-private-baseline.json` + `.png` - small complete example (App Gateway -> Function PE, VNet integration -> PEs)
- `examples/azure-functions-aks-integration.drawio` + `.png` - larger hand-tuned example (Functions -> AKS internal ingress, KEDA, Service Bus, PEs)
