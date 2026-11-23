# Spec format (build-diagram.js)

```json
{
  "title": "Diagram title (16 px, top-left)",
  "name": "draw.io page name",
  "page": { "width": 1500, "height": 1000 },
  "elements": [ ... ]
}
```

Coordinates are absolute page pixels (everything is a child of layer `1`). Element order = z-order (earlier is behind), so list VNet, then subnets, then boxes, then tiles/icons, then markers. Edges are always emitted last. Labels accept `\n` (or `<br>`) for line breaks; other HTML is escaped.

| type | fields | renders |
|---|---|---|
| `vnet` | `id, x, y, w, h, cidr, label?` | dashed blue boundary, VNet icon + label above it (needs ~26 px free above `y`) |
| `subnet` | `id, x, y, w, h, label, cidr, note?, nsg?=true, udr?` | gray box, 3 px light-blue border, subnet icon, NSG shield top-right, optional UDR icon. Header uses ~14 px per line from `y+2`: keep tiles below `y + 14*lines + 12` |
| `tile` | `id, x, y, label, icon, w?=120, h?=105, variant?="inner"\|"paas", iconSize?=44, badge?{icon,label}` | labelled square with centered icon at the top. `inner` = white (inside a subnet), `paas` = gray (outside the VNet). `badge` puts a small icon (default managed identity) + label top-left |
| `box` | `id, x, y, w, h, label, variant?="plain"\|"cluster"\|"pool", icon?` | `cluster`: light-blue area with icon + label (AKS cluster, ASE, Container Apps environment). `pool`: white dashed box (node pool, namespace). `plain`: gray grouping box (e.g. Monitoring) |
| `icon` | `id, icon, x, y, w?=44, h?=44, label?, labelPos?="bottom"\|"right"\|"none", size?` | standalone icon (client, internet, App Insights) |
| `pod` | `id, x, y, faded?, kind?="pod"` | Kubernetes icon (`kind` = any `mxgraph.kubernetes.icon2` prIcon: pod, svc, ing, deploy, ns ...) |
| `k8s` | `id, x, y, label, w?=130, h?=40` | white box with Kubernetes-blue border (Service, ScaledObject, Ingress object) |
| `text` | `id, text, x, y, w?, h?, align?, size?` | free text |
| `marker` | `kind:"inbound"\|"outbound", n, x, y, id?` | green circle (22 px) or blue square (20 px) with the step number |
| `legend` | `x, y, inbound?, outbound?, dashed?` | marker legend (add `dashed` text to explain dashed edges) |
| `steps` | `x, y, w, h?, inbound:[], outbound:[], notes:[]` | numbered step descriptions matching the markers |
| `edge` | `from, to, exit?, entry?, points?, dashed?, bidirectional?, label?, id?` | black orthogonal arrow. `exit`/`entry`: `"left"\|"right"\|"top"\|"bottom"` or `[fx, fy]` fractions of the shape. `points`: `[[x,y],...]` waypoints |

Generated child ids: `<id>_icon`, `<id>_nsg`, `<id>_udr`, `<id>_label`, `<id>_badge`. Edges may target any element id, including a subnet (e.g. "to the private endpoint subnet").

## Icon aliases

`icon` accepts an alias, a library path like `networking/Firewalls`, or a full URL. Library root: `https://app.diagrams.net/img/lib/azure2/`.

| alias | path | alias | path |
|---|---|---|---|
| function | compute/Function_Apps | servicebus | integration/Service_Bus |
| appservice | compute/App_Services | apim | integration/API_Management_Services |
| vm | compute/Virtual_Machine | eventgrid | integration/Event_Grid_Topics |
| vmss | compute/VM_Scale_Sets | logicapp | integration/Logic_Apps |
| aks | containers/Kubernetes_Services | eventhubs | analytics/Event_Hubs |
| acr | containers/Container_Registries | loganalytics | analytics/Log_Analytics_Workspaces |
| aci | containers/Container_Instances | appinsights | devops/Application_Insights |
| containerapp | other/Worker_Container_App | monitor | management_governance/Monitor |
| containerappenv | other/Container_App_Environments | keyvault | security/Key_Vaults |
| vnet | networking/Virtual_Networks | identity | identity/Managed_Identities |
| subnet | networking/Subnet | users | identity/Users |
| nsg | networking/Network_Security_Groups | entra | identity/Azure_Active_Directory |
| pe | networking/Private_Endpoint | storage | storage/Storage_Accounts |
| privatelink | networking/Private_Link | sql | databases/SQL_Database |
| nic | networking/Network_Interfaces | cosmos | databases/Azure_Cosmos_DB |
| lb | networking/Load_Balancers | postgres | databases/Azure_Database_PostgreSQL_Server |
| appgw | networking/Application_Gateways | redis | databases/Cache_Redis |
| firewall | networking/Firewalls | ase | app_services/App_Service_Environments |
| frontdoor | networking/Front_Doors | openai | ai_machine_learning/Azure_OpenAI |
| bastion | networking/Bastions | internet | general/Globe |
| nat | networking/NAT | dns | networking/DNS_Zones |
| vpngw | networking/Virtual_Network_Gateways | udr | networking/Route_Tables |
| pip | networking/Public_IP_Addresses | expressroute | networking/ExpressRoute_Circuits |
| vwan | networking/Virtual_WANs | ddos | networking/DDoS_Protection_Plans |

For anything else, guess the path (folder + Title_Case_With_Underscores) and run the linter with `--check-icons`; a 404 means the name is wrong. Known misses: `Private_DNS_Zones` (use `DNS_Zones`), `App_Service_Plans`, `Entra_ID`. The drawio MCP `search_shapes` tool can also find names.
