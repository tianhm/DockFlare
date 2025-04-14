Okay, sounds like a good plan. Let's consolidate what we've built into a project description and documentation outline. This will serve as a great starting point for refining or handing off the project.

---

## Project Documentation: Cloudflare Tunnel Docker Auto-Ingress Manager

### 1. Overview

**Project Goal:** To create an automated system that dynamically manages Cloudflare Tunnel ingress rules and corresponding DNS CNAME records based on Docker container labels on a host machine. It acts as a self-hosted "Cloudflare Tunnel Ingress Controller" specifically for Docker environments.

**Core Problem Solved:** Eliminates the manual, error-prone process of configuring public hostnames and DNS entries in Cloudflare Tunnels and DNS zones every time a new Docker service needs to be exposed or an existing one is updated/removed.

**Analogy:** Similar in concept to a Kubernetes Ingress Controller, but operating directly on a Docker host by monitoring container labels.

### 2. Key Features

*   **Automated Tunnel Management:**
    *   Checks for an existing Cloudflare Tunnel by name via API on startup.
    *   Creates the Cloudflare Tunnel via API if it doesn't exist.
    *   Retrieves and uses the Tunnel Token via API for agent authentication.
*   **`cloudflared` Agent Lifecycle Management:**
    *   Runs the `cloudflared` agent as a dedicated Docker container.
    *   Connects the agent using the API-retrieved token.
    *   Manages the agent container within a specified Docker network (default: `cloudflare-net`).
    *   Provides Start/Stop controls for the agent via the Web UI.
*   **Dynamic Ingress Rule Management (via Docker Labels):**
    *   Listens for Docker container `start`, `stop`, `die`, `destroy` events.
    *   Processes containers with specific labels (default prefix: `cloudflare.tunnel.`):
        *   `cloudflare.tunnel.enable="true"`: Enables management for the container.
        *   `cloudflare.tunnel.hostname="subdomain.yourdomain.com"`: The desired public FQDN.
        *   `cloudflare.tunnel.service="http://container_name:port"` or `https://...` or `tcp://...`: The internal service URL reachable by the `cloudflared` agent within their shared Docker network.
    *   Automatically updates the Cloudflare Tunnel's configuration (`/configurations` API endpoint) by adding/removing ingress rules based on labeled containers.
*   **Automated DNS CNAME Management:**
    *   Uses the Cloudflare API to automatically **create** the required CNAME DNS record (pointing the public hostname to the tunnel) when a new ingress rule is successfully added.
    *   Uses the Cloudflare API to automatically **delete** the CNAME DNS record when an ingress rule is removed (either via graceful deletion or force delete).
*   **Graceful Deletion:**
    *   When a managed container stops, its rule is marked `pending_deletion` locally.
    *   A deletion timestamp is set based on a configurable grace period (default: 8 hours).
    *   A background task periodically checks for expired rules.
    *   Expired rules trigger DNS CNAME deletion followed by tunnel configuration update to remove the ingress rule.
*   **State Persistence:**
    *   The internal state of managed rules (hostname, service, container ID, status, deletion timestamp) is persisted to a JSON file (`state.json` by default) to survive manager restarts.
*   **Reconciliation:**
    *   On startup, compares running labeled containers, loaded state (`state.json`), and the actual Cloudflare tunnel configuration.
    *   Triggers necessary updates to the tunnel configuration and checks/creates DNS records for active rules to ensure consistency.
*   **Web UI (Flask):**
    *   **Status Dashboard:** Shows tunnel status (ID, token mask), agent container status, last action results, and any errors.
    *   **Agent Control:** Start/Stop buttons for the `cloudflared` agent container.
    *   **Managed Rules Table:** Lists currently managed hostnames, their target services, status (active/pending), associated container ID, and scheduled deletion time.
    *   **Force Delete:** Button per rule to immediately trigger DNS deletion and tunnel config update, bypassing the grace period.
*   **API-Driven:** Primarily interacts with Cloudflare via its REST API, avoiding reliance on `cloudflared` CLI commands for setup.
*   **Retry Logic:** Implements retry mechanisms with backoff for critical Cloudflare API update calls (tunnel config PUT) to handle transient errors.

### 3. Architecture / How it Works

1.  **Initialization:**
    *   The **Manager App** (Python/Flask container) starts.
    *   Connects to the host's Docker daemon via mounted Docker socket.
    *   Loads state from `state.json` (if exists).
    *   Uses the Cloudflare API (Account/Tunnel endpoints) to find or create the specified tunnel (`TUNNEL_NAME`) and retrieve its ID and token.
    *   Ensures the specified Docker network (`CLOUDFLARED_NETWORK_NAME`) exists.
2.  **Agent Startup:**
    *   If tunnel initialization was successful, the Manager App starts the **`cloudflared` Agent Container** using the retrieved token and connects it to the shared Docker network.
3.  **Reconciliation:**
    *   The Manager App compares: running labeled **Target Application Containers**, its internal state (`managed_rules`), and the current tunnel configuration fetched from the Cloudflare API.
    *   It updates its internal state and triggers Cloudflare Tunnel config updates and DNS record creation via the API as needed to align the states.
4.  **Event Monitoring:**
    *   The Manager App listens for Docker events.
    *   **On Container Start:** If a container has the required labels, the Manager App updates its internal state, triggers a Cloudflare Tunnel config update, and then triggers a Cloudflare DNS record creation.
    *   **On Container Stop:** If a managed container stops, the Manager App marks the corresponding rule as `pending_deletion` in its internal state and saves the state.
5.  **Background Cleanup:**
    *   A background thread periodically checks the internal state for rules where `status` is `pending_deletion` and the `delete_at` timestamp has passed.
    *   For expired rules, it first triggers Cloudflare DNS record deletion via the API.
    *   Then, it triggers a Cloudflare Tunnel config update (which implicitly removes the now non-active rule).
    *   Finally, it removes the rule from the internal state and saves it.
6.  **Web UI Interaction:**
    *   The Flask web server provides endpoints to view status, start/stop the agent container, and force-delete rules (which triggers DNS deletion then tunnel config update).

### 4. Prerequisites

*   A Cloudflare account.
*   A domain name managed by Cloudflare DNS.
*   Docker and Docker Compose installed on the host machine where target application containers will run.
*   A Cloudflare API Token with the following permissions:
    *   `Account` | `Cloudflare Tunnel` | `Edit` (Scoped to your Account ID)
    *   `Zone` | `DNS` | `Edit` (Scoped to the specific Zone ID of your domain)
*   Your Cloudflare Account ID.
*   Your Cloudflare Zone ID for the domain you are using.

### 5. Installation & Setup (Docker Compose)

1.  **Clone Repository:** (Assuming code is in a Git repository)
    ```bash
    git clone <your-repo-url>
    cd <repo-directory>
    ```
2.  **Create Persistent Data Directory:**
    ```bash
    mkdir data
    ```
3.  **Create `.env` File:** Create a file named `.env` in the root of the project directory with the following content:
    ```dotenv
    # Required
    CF_API_TOKEN=YOUR_CLOUDFLARE_API_TOKEN
    TUNNEL_NAME=my-docker-auto-tunnel # Or your preferred tunnel name
    CF_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
    CF_ZONE_ID=YOUR_CLOUDFLARE_ZONE_ID

    # Optional (Defaults shown)
    # LABEL_PREFIX=cloudflare.tunnel
    # GRACE_PERIOD_SECONDS=28800
    # CLEANUP_INTERVAL_SECONDS=300
    # STATE_FILE_PATH=/app/data/state.json # Must match volume mount in docker-compose.yml
    # CLOUDFLARED_CONTAINER_NAME=cloudflared-agent-${TUNNEL_NAME} # Uses TUNNEL_NAME variable
    # CLOUDFLARED_NETWORK_NAME=cloudflare-net
    ```
    *   Replace placeholders with your actual values.
4.  **Build and Run:**
    ```bash
    docker-compose up -d --build
    ```
5.  **Access UI:** Open your web browser to `http://<your-host-ip>:5000`.

### 6. Configuration Details

*   **`.env` File:** Used for core configuration (API keys, IDs, tunnel name, etc.). See Installation section.
*   **Docker Labels on Target Containers:** Add these labels to your application containers to have them managed:
    *   `cloudflare.tunnel.enable="true"`: (Required) Enables management.
    *   `cloudflare.tunnel.hostname="app.yourdomain.com"`: (Required) The desired public hostname. Must be within the configured `CF_ZONE_ID`.
    *   `cloudflare.tunnel.service="http://<container_name>:<port>"`: (Required) The internal URL. `<container_name>` **must** be the name of the target container, and `<port>` is the port the service listens on *inside* the container. The target container **must** be connected to the same Docker network as the `cloudflared-agent` (defined by `CLOUDFLARED_NETWORK_NAME`, default `cloudflare-net`). Other protocols like `https://`, `tcp://` are also possible if supported by your service and Cloudflare Tunnel.

### 7. Usage

1.  **Label Target Containers:** Add the necessary labels (as described above) to the `docker run` command or `docker-compose.yml` file for the application containers you want to expose. Ensure they are connected to the `CLOUDFLARED_NETWORK_NAME`.
2.  **Start Target Containers:** Start your labeled containers (e.g., `docker run ...` or `docker-compose up -d ...`).
3.  **Monitor Manager:** Check the Manager's Web UI or logs (`docker-compose logs cloudflare-tunnel-manager`) to see it detect the container, update the tunnel config, and create the DNS record.
4.  **Access Service:** After a short delay for DNS propagation, your service should be available at the specified public hostname.
5.  **Stopping Containers:** When you stop a labeled container, the manager will mark the rule for deletion after the grace period.
6.  **Use Web UI:** Access `http://<host-ip>:5000` to monitor status, manually start/stop the agent, or force-delete rules.

### 8. Technical Details

*   **Language:** Python 3
*   **Core Libraries:** `requests` (Cloudflare API), `docker` (Docker API/Events), `Flask` (Web UI), `python-dotenv` (Config), `threading` (Background Tasks), `waitress` (WSGI Server).
*   **State Management:** Uses a simple dictionary (`managed_rules`) protected by a `threading.Lock` and persisted to `state.json`.
*   **Cloudflare API Endpoints Used:**
    *   `/accounts/{acc_id}/cfd_tunnel` (GET, POST) - Find/Create Tunnels
    *   `/accounts/{acc_id}/cfd_tunnel/{tun_id}/token` (GET) - Get Tunnel Token
    *   `/accounts/{acc_id}/cfd_tunnel/{tun_id}/configurations` (GET, PUT) - Manage Tunnel Ingress Rules
    *   `/zones/{zone_id}/dns_records` (GET, POST) - Find/Create DNS Records
    *   `/zones/{zone_id}/dns_records/{rec_id}` (DELETE) - Delete DNS Records
*   **Networking:** Creates/uses a dedicated Docker bridge network (default `cloudflare-net`) for the `cloudflared-agent` and expects target containers to be connected to the same network for service discovery via container name.

### 9. Troubleshooting

*   **`NXDOMAIN` / Hostname Not Resolving:**
    *   Check Cloudflare DNS dashboard for the expected CNAME record.
    *   Verify the API Token has `Zone:DNS:Edit` permission for the correct Zone ID.
    *   Verify `CF_ZONE_ID` is correctly set in `.env`.
    *   Check manager logs for errors during DNS creation/deletion.
    *   Check for conflicting DNS records (e.g., an A record) for the same name.
*   **Agent Container Not Running / Errors in UI:**
    *   Check manager logs for Docker API errors or agent start errors.
    *   Verify the `CF_API_TOKEN` is correct and the tunnel token was retrieved successfully (check init logs).
    *   Ensure the `CLOUDFLARED_NETWORK_NAME` network exists (`docker network ls`).
*   **Cloudflare API Errors (4xx/5xx in logs):**
    *   Verify `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ZONE_ID`.
    *   Check Cloudflare Status page for incidents.
    *   Check API token permissions carefully.
    *   Consider Cloudflare API rate limits if errors are intermittent (429).
*   **Docker Connection Errors:**
    *   Ensure the Docker socket `/var/run/docker.sock` is correctly mounted into the manager container in `docker-compose.yml`.
    *   Check permissions for the Docker socket on the host if running Docker as non-root.
*   **State Inconsistency:** If local state (`state.json`) seems out of sync with Cloudflare, restarting the manager will trigger reconciliation, which should attempt to fix discrepancies in the tunnel configuration. DNS discrepancies require manual intervention or waiting for add/delete cycles.

### 10. Contributing

*(Placeholder: Add guidelines if making the project public)*

### 11. License

*(Placeholder: Choose and add a license, e.g., MIT License)*

---

This provides a comprehensive structure. You can now take this into a new chat or document and refine the wording, add more specific examples, or elaborate on certain sections.