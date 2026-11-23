# Microsoft Azure Architecture Center diagram style

Derived from the published reference diagrams (AKS baseline, App Service baseline network architecture, hub-spoke). The builder already emits these styles; this file is for hand edits and for reviewing a render.

## Palette

| element | fill | stroke | notes |
|---|---|---|---|
| VNet boundary | none | `#5EA0EF` dashed, 1 px | icon + label above top-left |
| Subnet | `#F2F2F2` | `#A6C8F0`, 3 px | label top-left after the subnet icon (`spacingLeft=34`) |
| Tile inside subnet | `#FFFFFF` | `#E6E6E6` | icon top, label bottom |
| PaaS tile outside VNet | `#F2F2F2` | `#D6D6D6` | |
| Cluster area (AKS / ASE / CAE) | `#EBF3FC` | none | |
| Node pool / namespace | `#FFFFFF` | `#A6A6A6` dashed | |
| Kubernetes objects | `#FFFFFF` | `#326CE5` | pods use `mxgraph.kubernetes.icon2` |
| Inbound marker | `#107C10` circle 22 px | none | white bold number |
| Outbound marker | `#4472C4` square 20 px | none | white bold number |
| Edges | - | `#000000` 1 px, `endArrow=block;endSize=5`, orthogonal | dashed = secondary path |

Font: `fontFamily=Segoe UI`, 11 px labels, 10 px dense labels, 9 px badges, 16 px title.

## Exact style strings

```
VNet       rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#5EA0EF;dashed=1;strokeWidth=1;
Subnet     rounded=0;whiteSpace=wrap;html=1;fillColor=#F2F2F2;strokeColor=#A6C8F0;strokeWidth=3;verticalAlign=top;align=left;spacingLeft=34;spacingTop=2;fontSize=11;fontFamily=Segoe UI;
Inner tile rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#E6E6E6;verticalAlign=bottom;spacingBottom=6;fontSize=11;fontFamily=Segoe UI;
PaaS tile  rounded=0;whiteSpace=wrap;html=1;fillColor=#F2F2F2;strokeColor=#D6D6D6;verticalAlign=bottom;spacingBottom=6;fontSize=11;fontFamily=Segoe UI;
Icon       image;aspect=fixed;html=1;image=https://app.diagrams.net/img/lib/azure2/<folder>/<Name>.svg;
Edge       edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endSize=5;strokeColor=#000000;exitX=..;exitY=..;entryX=..;entryY=..;
Inbound    ellipse;whiteSpace=wrap;html=1;fillColor=#107C10;strokeColor=none;fontColor=#FFFFFF;fontStyle=1;fontSize=11;fontFamily=Segoe UI;
Outbound   rounded=0;whiteSpace=wrap;html=1;fillColor=#4472C4;strokeColor=none;fontColor=#FFFFFF;fontStyle=1;fontSize=11;fontFamily=Segoe UI;
```

Decorations relative to a subnet at (x, y, w): subnet icon 25x15 at (x+7, y+6); NSG shield 18x22 at (x+w-17, y-10) so it sits on the corner; UDR 22x22 at (x+w-42, y-10). VNet icon 30x18 at (vx+2, vy-22), label at (vx+38, vy-24).

## Layout

- Spacing unit 5 px; keep coordinates on multiples of 5 where possible.
- Tiles: 120x105 (inner), 115-125 wide for rows of PEs, 100 high for PaaS tiles. Icon 44 px, top padding 12 px.
- Subnet header height: ~14 px per label line + 12 px. A subnet with name + CIDR needs tiles >= 40 px below its top; with a 2-line delegation note >= 70 px.
- Gaps: >= 15 px between tiles, >= 20 px between subnets, >= 30 px corridor where an edge or marker must pass.
- Align connected tiles on the same center line (same `y + h/2` for horizontal links, same `x + w/2` for vertical links) so edges are straight; otherwise draw.io adds a jog.
- Put a marker next to its edge, never on it: 5-8 px clear of the line, inside a corridor or gap, not on a label or icon. Placing it on a subnet/VNet border is fine.
- Edges must not cross labels, icons or tiles they do not connect. Route through corridors with `points`, enter tiles from the free side (e.g. top of a pod when its left side has a label).
- Keep the steps text and legend below everything, at least 30 px under the lowest tile.
- A subnet that only hosts a VNet-integration interface stays small (about 260x190); give the PE subnet the width it needs for one tile per service.

## Review checklist (on the render)

1. Every subnet: subnet icon, name, CIDR, NSG shield, label fully visible (not clipped by a tile).
2. VNet label readable above the boundary; nothing else in that band.
3. PaaS services outside the VNet; PEs inside; one straight edge PE -> service.
4. Every edge has an arrowhead, no edge passes through text or an unrelated tile, crossings minimized.
5. Markers numbered in flow order and matching the step text; legend present.
6. No Microsoft logo or branding.
