# Azure placement rules for network diagrams

A diagram that looks right but puts things in the wrong place is worse than none. Check each component against this list, and verify anything service-specific with the matching Azure skill in `.claude/` or Microsoft Learn before drawing (limits change).

## Inside the VNet vs outside

| Draw **inside** a subnet | Draw **outside** the VNet (PaaS) |
|---|---|
| VMs / VMSS, AKS node pools, internal load balancers | App Service / Function apps (multi-tenant plans) |
| Application Gateway, Azure Firewall, Bastion, VPN/ExpressRoute gateways | Storage, Key Vault, SQL Database, Cosmos DB, Service Bus, Event Hubs, ACR, Redis |
| Private endpoints (NIC in the subnet) | Front Door, Traffic Manager, Entra ID, Azure Monitor / Log Analytics / App Insights |
| VNet-integration interface of App Service / Functions | Private DNS zones (global, *linked* to the VNet) |
| Injected services: ASE v3, Container Apps environment, APIM (injected), SQL Managed Instance, Databricks | Public IPs are attached to the resource that owns them |

## VNet integration vs private endpoint (App Service / Functions / Logic Apps Standard)

- **VNet integration = outbound only.** The app reaches into the VNet through a delegated subnet. Draw the app outside the VNet and a "Virtual interface" tile in the integration subnet.
  - Delegation: `Microsoft.Web/serverFarms` for Premium / Dedicated (App Service plan); `Microsoft.App/environments` for Flex Consumption.
  - The integration subnet is dedicated: no private endpoints, no other delegations, not shared with a Container Apps environment.
  - Classic Consumption plan has no VNet integration.
  - Sizing is plan-specific and scales with instances: check the current docs and write the CIDR on the subnet.
- **Private endpoint = inbound.** To make the app itself private, add a PE in the PE subnet and disable public network access. Inbound clients (App Gateway, APIM, on-prem) target the PE.

## Special subnets (exact names, size, NSG)

| Subnet | Name required | Size guidance | NSG |
|---|---|---|---|
| VPN / ExpressRoute gateway | `GatewaySubnet` | /27 or larger | not supported - omit the shield (`"nsg": false`) |
| Azure Firewall | `AzureFirewallSubnet` | /26 | not supported - omit |
| Azure Firewall management (forced tunneling / Basic) | `AzureFirewallManagementSubnet` | /26 | omit |
| Azure Bastion | `AzureBastionSubnet` | /26 or larger | supported with Bastion's required rules |
| Application Gateway v2 | any (dedicated to App Gateway) | /24 recommended | supported with required inbound rules |
| Private endpoints | any | sized for the number of PEs | supported (network policies) |
| AKS API server VNet integration | any, delegated `Microsoft.ContainerService/managedClusters` | small (/28) | - |
| Container Apps env (workload profiles) | any, delegated `Microsoft.App/environments` | /27 minimum | supported |
| SQL Managed Instance | any, delegated `Microsoft.Sql/managedInstances` | dedicated | required (managed) |

## Common patterns to mirror

- **AKS baseline**: ingress subnet (internal LB / App Gateway), cluster nodes subnet (system + user node pools), PE subnet, optional API server subnet. With Azure CNI Overlay, pod IPs are not from the VNet: note "CNI Overlay" instead of drawing a pod subnet.
- **App Service / Functions baseline**: App Gateway (WAF) subnet -> app PE in PE subnet; app outside VNet with VNet integration subnet -> PEs for Key Vault / Storage / SQL; Private DNS zones linked to the VNet.
- **Hub-spoke**: hub VNet (Firewall, Bastion, GatewaySubnet) and spoke VNets drawn as separate dashed boundaries with a bidirectional "VNet peering" edge; add UDR icons on spoke subnets whose traffic goes to the firewall.
- **Egress**: NAT gateway or Firewall per subnet - draw the icon on the subnet edge and an outbound edge to "Internet" (`internet` icon).

## Flow numbering

- Inbound (green circles): numbered from the client to the workload.
- Outbound / private (blue squares): numbered from the workload to dependencies, in the order a request touches them.
- Every marker number must appear in the steps text with one sentence each; mention the identity used (managed identity, workload identity) and the DNS step when private endpoints are involved.
