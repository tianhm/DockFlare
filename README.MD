# Cloudflare Tunnel Docker Ingress Controller

[![Generic badge](https://img.shields.io/badge/Status-Alpha-yellow.svg)](https://shields.io/)

This project automates the management of Cloudflare Tunnel ingress rules based on Docker container labels on a host machine, effectively acting as a self-hosted "Cloudflare Tunnel Ingress Controller" for Docker.

## Core Problem Solved

Eliminates the manual process of configuring public hostnames and DNS entries in Cloudflare Tunnels every time a new Docker service needs to be exposed, or an existing one is updated/removed.  This provides a dynamic and automated way to expose your Dockerized applications via Cloudflare Tunnel.

## Key Features & Functionality

*   **Cloudflare Tunnel Entity Management:**
    *   On startup, checks if a tunnel with the specified `TUNNEL_NAME` exists within the configured Cloudflare account (`CF_ACCOUNT_ID`).
    *   If the tunnel doesn't exist, it creates it using the Cloudflare API.
    *   Retrieves and stores the Tunnel ID and the necessary runtime Tunnel Token directly from the API response.
*   **`cloudflared` Agent Container Management:**
    *   Manages the lifecycle of the actual `cloudflared` agent process, running it as a separate Docker container (`cloudflare/cloudflared:latest`).
    *   Uses the Tunnel Token (obtained via API) to authenticate the agent.
    *   Automatically starts the agent container after successful initialization.
    *   Provides Start/Stop buttons in the web UI to manually control the agent container.
*   **Dynamic Ingress Rule Management (via Docker Labels):**
    *   Listens for Docker container start and stop events on the host using the Docker API.
    *   Processes containers that have specific labels (default prefix `cloudflare.tunnel.`):
        *   `cloudflare.tunnel.enable="true"`: Marks the container for management.
        *   `cloudflare.tunnel.hostname="subdomain.yourdomain.com"`: The desired public hostname.
        *   `cloudflare.tunnel.service="http://target:port"`: The internal URL the tunnel should proxy to (e.g., `http://localhost:8080`, `http://container_name:9000`).
    *   Maintains an internal state (`managed_rules`) representing the desired ingress configuration based on running, labeled containers.
    *   Automatically updates the Cloudflare Tunnel's configuration by adding/removing ingress rules to match the `managed_rules` state.  Relies on Cloudflare to automatically handle the corresponding CNAME DNS records.
*   **Graceful Deletion:**
    *   When a managed container stops, its corresponding ingress rule is marked as `pending_deletion`.
    *   A deletion timestamp (`delete_at`) is calculated based on a configurable grace period.
    *   A background task periodically checks for expired rules and triggers an update to the Cloudflare configuration to remove them.
*   **State Persistence:**
    *   The `managed_rules` state is saved to a JSON file (`state.json` by default) to survive restarts.
*   **Reconciliation on Startup:**
    *   When the application starts, it compares currently running labeled Docker containers, the loaded state from `state.json`, and the actual configuration fetched from Cloudflare to ensure consistency and trigger necessary updates.
*   **Web UI (Flask):**
    *   Provides a status dashboard showing:
        *   Tunnel initialization status, ID, and masked token.
        *   `cloudflared` agent container status (running, stopped, etc.).
        *   Start/Stop buttons for the agent container.
        *   A table listing all currently managed ingress rules (hostname, service, status, associated container ID, scheduled deletion time).
        *   A "Force Delete" button for each managed rule to bypass the grace period and remove the rule immediately.

## Technical Implementation

*   **Language:** Python 3
*   **Core Libraries:**
    *   `requests`: Cloudflare API interaction.
    *   `docker`: Docker API interaction and event handling.
    *   `Flask`: Web UI.
    *   `python-dotenv`: Configuration management.
    *   `threading`: Background tasks.
*   **Deployment:** Runs as a Docker container, typically managed by `docker-compose.yml`. Requires mounting the Docker socket (`/var/run/docker.sock`) to interact with the Docker daemon.
*   **Configuration:**
    *   Primarily via an `.env` file (API Token, Account ID, Tunnel Name, optional grace period, labels, etc.).
    *   Docker labels on target application containers.
*   **Authentication:** Uses a Cloudflare API Token with Account:Cloudflare Tunnel:Edit permissions (and potentially Zone:DNS:Edit if explicit DNS management were added).

## Key Files

*   `app.py`: Main Python application code (Flask routes, API logic, Docker event handling, state management).
*   `Dockerfile`: Builds the application container, installing Python, dependencies, and `cloudflared`.
*   `docker-compose.yml`: Defines the service for running the application container and mounts the Docker socket.
*   `requirements.txt`: Lists Python dependencies.
*   `.env`: Stores sensitive configuration and parameters (API keys, IDs, tunnel name). **Do not commit this file!**
*   `state.json`: (Created at runtime) Persists the managed rules state.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Configure the `.env` file:**

    Create a `.env` file based on the `.env.example` and set the following variables:

    ```
    CF_API_TOKEN=<YOUR_CLOUDFLARE_API_TOKEN>
    CF_ACCOUNT_ID=<YOUR_CLOUDFLARE_ACCOUNT_ID>
    TUNNEL_NAME=<DESIRED_TUNNEL_NAME>
    GRACE_PERIOD_SECONDS=28800  # Optional: Default 8 hours (8 * 60 * 60)
    ```

    *   `CF_API_TOKEN`:  Your Cloudflare API token with `Account:Cloudflare Tunnel:Edit` permissions.
    *   `CF_ACCOUNT_ID`: Your Cloudflare Account ID.
    *   `TUNNEL_NAME`: The name you want to give your Cloudflare Tunnel.
    *   `GRACE_PERIOD_SECONDS`: (Optional) The grace period in seconds before deleting an ingress rule after its associated container stops. Defaults to 8 hours.

3.  **Run with Docker Compose:**

    ```bash
    docker-compose up -d
    ```

4.  **Access the Web UI:**

    Open your web browser and navigate to the port you exposed in your `docker-compose.yml` (e.g., `http://localhost:5000`).

5.  **Label your Docker containers:**

    Add the necessary labels to your Docker containers:

    ```yaml
    labels:
      cloudflare.tunnel.enable: "true"
      cloudflare.tunnel.hostname: "my-service.example.com"
      cloudflare.tunnel.service: "http://my-service:8080"
    ```

    *   Replace `"my-service.example.com"` with your desired public hostname.
    *   Replace `"http://my-service:8080"` with the internal URL of your service.

6. **Restart or redeploy the labeled docker containers**

    This will trigger the ingress controller to add rules as specified.

## Example `docker-compose.yml`

```yaml
version: "3.8"

services:
  cloudflare-tunnel-controller:
    image: <your-dockerhub-username>/cloudflare-tunnel-docker-controller:latest # Replace with your image or build from Dockerfile
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./state.json:/app/state.json
    env_file:
      - .env
    environment:
      - FLASK_APP=app.py

  # Example service to be tunneled
  my-service:
    image: nginx:latest
    labels:
      cloudflare.tunnel.enable: "true"
      cloudflare.tunnel.hostname: "my-service.example.com"  # Replace with your domain
      cloudflare.tunnel.service: "http://my-service:80"  #Important to keep container name same as declared service name
    networks:
      - app-network

networks:
  app-network:
    driver: bridge