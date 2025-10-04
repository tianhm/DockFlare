# Access Policy Best Practices & Examples

DockFlare's most powerful security feature is **Access Groups**. They provide a centralized, reusable, and maintainable way to secure your services using Cloudflare Zero Trust.

## The "Golden Rule": Use Access Groups

The single most important best practice is to **use Access Groups for all your common access policies**.

Access Groups are policy templates you create in the DockFlare Web UI. Instead of defining complex rules with multiple labels on every container, you create a policy once and apply it with a single, clean label. DockFlare v3.0.3 now syncs every group to a reusable Cloudflare Access Policy so the same decision set can serve multiple applications.

---

## How to Create and Use Access Groups

Creating an Access Group is a simple process done entirely within the DockFlare UI.

### Step 1: Create the Access Group

1.  Navigate to the **Access Policies** page from the main navigation bar in the DockFlare UI.
2.  Click the **"Add Access Group"** button.
3.  Give your group a **unique and descriptive ID**. This ID is what you will use in your Docker labels. For example: `admin-users`, `home-network`, `geo-block`.
4.  Pick the **Access Mode** from the tabs at the top of the modal:
    *   **Authenticated** requires users to sign in and emits an `allow` decision.
    *   **Public** uses a `bypass` decision so the application stays open while still honouring geo filters.
5.  Fill in the inputs that appear for the selected mode (emails for Authenticated, optional country list for both).
6.  Adjust optional settings like session duration, App Launcher visibility, and automatic IdP redirect if you are in Authenticated mode.
7.  Save the group. DockFlare writes the definition locally and syncs it to Cloudflare as `DockFlare-AccessGroup-<id>`.

### Step 2: Apply the Access Group

Once created, you have two ways to apply your Access Group to a service:

#### A) With a Docker Label (The Recommended Way)

For any new or existing container, simply add the `dockflare.access.group` label with the ID of the group you created.

```yaml
services:
  grafana:
    image: grafana/grafana
    labels:
      - "dockflare.enable=true"
      - "dockflare.hostname=monitoring.example.com"
      - "dockflare.service=http://grafana:3000"
      # Apply the entire policy with one simple label:
      - "dockflare.access.group=admin-users"
```
You can also apply multiple groups by using `dockflare.access.groups` with a comma-separated list of IDs:
`dockflare.access.groups=admin-users,home-network`

#### B) Via the Web UI (For Manual Rules or Overrides)

You can also apply an Access Group to any rule directly from the dashboard:
1.  Find the ingress rule you want to modify on the main dashboard.
2.  Click the **"Manage Rule"** button.
3.  In the editing modal, select your desired Access Group(s) from the "Access Groups" dropdown menu.
4.  Save the changes.

This is perfect for applying policies to manually created rules (for non-Docker services) or for temporarily overriding a policy defined by Docker labels.

---

## Policy Examples

Here are some common policy configurations you can create within an Access Group.

### Example 1: Authenticate by Email

This is the most common use case: allowing only specific users who can authenticate with your configured Identity Provider (e.g., Google, GitHub, or a one-time PIN sent to their email).

*   **Group ID:** `admin-users`
*   **Mode:** *Authenticated*
*   **Allowed emails:** `user1@example.com`, `user2@example.com`
*   **Session duration:** `24h`

DockFlare creates a reusable policy with an `allow` decision for the listed emails and a fall-through `deny` rule for everyone else. Apply the group with `dockflare.access.group=admin-users`.

### Example 2: Allow Your Home IP Address

This policy restricts access to your home network, allowing you to skip the login prompt when you are on a trusted IP while enforcing authentication elsewhere.

1.  **Find Your Public IP:** In your browser, search for "what is my ip". Your public IP address will be displayed (e.g., `203.0.113.55`).
2.  **Create the Access Group:**
    *   **Group ID:** `home-network`
    *   **Mode:** *Authenticated*
    *   **Allowed emails:** `you@example.com`
    *   **Bypass IPs:** add `203.0.113.55/32` to the IP allowlist field

DockFlare generates a policy that first bypasses your IP range and then requires the listed emails to authenticate. Everyone else receives a deny decision.

### Example 3: Geo-Fencing (Blocking Multiple Countries)

This policy keeps your marketing site public while limiting traffic from specific regions.

*   **Group ID:** `public-eu`
*   **Mode:** *Public*
*   **Blocked countries:** `RU`, `CN`, `KP`

The resulting reusable policy issues a Cloudflare `bypass` decision for everyone, excluding the listed countries. Combine it with other groups if you need to layer additional controls (`dockflare.access.groups=public-eu,admin-users`).
