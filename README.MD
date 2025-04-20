# DockFlare: Cloudflare Tunnel Ingress Controller

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/ChrispyBacon-dev/baconflip)
[![OS](https://img.shields.io/badge/os-linux%20%7C%20windows%20%7C%20macos-brightgreen)]()
[![CPU Architectures](https://img.shields.io/badge/CPU-x86_64%20%7C%20arm64-brightgreen)](https://en.wikipedia.org/wiki/Central_processing_unit)
[![Generic badge](https://img.shields.io/badge/Status-Alpha-yellow.svg)](https://shields.io/)
[![Docker Pulls](https://img.shields.io/docker/pulls/alplat/dockflare)](https://hub.docker.com/r/alplat/dockflare)
[![made-with-python](https://img.shields.io/badge/Made%20with-Python-1f425f.svg)](https://www.python.org/)
[![GitHub issues](https://img.shields.io/github/issues/ChrispyBacon-dev/dockflare)](https://github.com/ChrispyBacon-dev/dockflare/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/ChrispyBacon-dev/dockflare)](https://github.com/ChrispyBacon-dev/dockflare/commits/stable)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/ChrispyBacon-dev/dockflare)](https://github.com/ChrispyBacon-dev/dockflare/commits/stable)

DockFlare automates Cloudflare Tunnel ingress rule management based on Docker container labels, simplifying public exposure of your Dockerized applications. It eliminates manual Cloudflare configuration, acting as a self-hosted ingress controller.

## Key Features

- **Automated Cloudflare Tunnel Management**: Creates/uses a specified tunnel, retrieves Tunnel ID & Token.
- **`cloudflared` Agent Lifecycle**: Deploys & manages the `cloudflared` container (using Tunnel Token).
- **Dynamic Ingress via Docker Labels**:
  - Monitors Docker events for containers with labels (prefix: `cloudflare.tunnel.`): `enable="true"`, `hostname="subdomain.example.com"`, `service="http://target:port"`.
  - Automatically updates Cloudflare Tunnel configuration to match running, labeled containers.
- **Graceful Deletion**: Configurable grace period before removing ingress rules when a container stops.
- **State Persistence**: Saves `managed_rules` to `state.json` for restarts.
- **Reconciliation**: On startup, ensures consistency between Docker containers, saved state, and Cloudflare configuration.
- **Web UI**: Status dashboard with:
  - Tunnel & agent status.
  - Start/Stop agent controls.
  - Managed ingress rule list with status, container ID, deletion time, and "Force Delete" option.
- **Real-time Log Streaming**: View logs in real-time using Server-Sent Events (SSE).
- **Content Security Policy (CSP)**: Ensures secure loading of resources and compatibility with reverse proxies.

## How It Works

DockFlare listens for Docker container events and manages Cloudflare Tunnel ingress rules dynamically. By labeling your containers, DockFlare automatically configures the tunnel and DNS records, ensuring your services are publicly accessible.

### Example Workflow

1. **Start DockFlare**: Run the DockFlare container with the required environment variables.
2. **Label Your Containers**: Add labels to your Docker containers to define their public hostname and service target.
3. **Automatic Configuration**: DockFlare detects the labeled containers and updates the Cloudflare Tunnel configuration and DNS records.
4. **Graceful Deletion**: When a container stops, DockFlare schedules its ingress rule for deletion after a configurable grace period.

## Getting Started

### Prerequisites

- Docker: [Install Docker](https://docs.docker.com/engine/install/)
- Docker Compose: [Install Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start (Using Docker Compose)

1. **Create `docker-compose.yml`**:

   ```yaml
   version: '3.8'
   services:
     dockflare:
       image: alplat/dockflare:stable
       container_name: dockflare
       restart: unless-stopped
       ports:
         - "5000:5000"
       env_file:
         - .env
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock:ro
         - dockflare_data:/app/data
       networks:
         - cloudflare-net
   volumes:
     dockflare_data:
   networks:
     cloudflare-net:
   ```

2. **Create `.env` File**:

   ```dotenv
   CF_API_TOKEN=<YOUR_CLOUDFLARE_API_TOKEN>
   CF_ACCOUNT_ID=<YOUR_CLOUDFLARE_ACCOUNT_ID>
   CF_ZONE_ID=<YOUR_CLOUDFLARE_ZONE_ID>
   TUNNEL_NAME=<YOUR_TUNNEL_NAME>
   GRACE_PERIOD_SECONDS=28800
   ```

3. **Run DockFlare**:

   ```bash
   docker compose up -d
   ```

4. **Access the Web UI**: Open `http://localhost:5000` in your browser.

### Labeling Containers

To expose a service through DockFlare, add the following labels to your container:

```yaml
services:
  my-service:
    image: nginx:latest
    labels:
      cloudflare.tunnel.enable: "true"
      cloudflare.tunnel.hostname: "my-service.example.com"
      cloudflare.tunnel.service: "http://my-service:80"
```

## Advanced Features

### External Cloudflared Mode

DockFlare can work with an existing `cloudflared` container. To enable this mode:

1. Set `USE_EXTERNAL_CLOUDFLARED=true` in your `.env` file.
2. Provide the external tunnel ID using `EXTERNAL_TUNNEL_ID`.

### Real-time Log Streaming

DockFlare provides real-time logs using Server-Sent Events (SSE). Open the "Real-time Activity Logs" section in the Web UI to view logs as they happen.

### Content Security Policy (CSP)

DockFlare enforces a strict CSP to ensure secure loading of resources. This includes:

- `default-src 'self'`
- `style-src 'self' 'unsafe-inline'`
- `script-src 'self' 'unsafe-inline'`

## Troubleshooting

### Common Issues

- **Log Stream Not Working**: Ensure your browser supports SSE.
- **Reverse Proxy Issues**: Configure your proxy to support SSE and WebSocket connections.

### Debugging

- Check the logs in the Web UI or the container logs using:

  ```bash
  docker logs dockflare
  ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

DockFlare is licensed under the MIT License. See `LICENSE.MD` for details.