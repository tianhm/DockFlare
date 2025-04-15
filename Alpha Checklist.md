Checklist for Dockflare designed to be used during development. It aims to cover the core features based on `app.py` and `status_page.html`. This file is used to make sure all functions are working between stable, unstable, nightly branch.

**Goal:** Verify all primary functions work as expected after code changes.

**Prerequisites:**
*   Docker daemon running.
*   Valid Cloudflare credentials (`.env` file configured).
*   Potentially clear the `state.json` file and check Cloudflare tunnel config/DNS before starting a full run for a clean slate.
*   Have a test Docker container ready (e.g., a simple web server like `nginx`) that you can easily label and start/stop.

---

### Dockflare Functional Test Checklist

**I. Startup & Initialization**

*   [ ] **(Failure Case)** Start Dockflare with *missing critical* env vars (e.g., `CF_API_TOKEN`). **Verify:** App exits with FATAL error log.
*   [ ] **(Failure Case)** Start Dockflare with Docker daemon *stopped*. **Verify:** App starts but logs Docker connection errors, UI shows "Docker Unavailable", agent controls disabled, background tasks likely don't start.
*   [ ] Start Dockflare with Docker running and *no existing tunnel* matching `TUNNEL_NAME`. **Verify:**
    *   [ ] Logs indicate tunnel creation attempt.
    *   [ ] Tunnel is created in Cloudflare.
    *   [ ] UI shows tunnel ID and (truncated) token.
    *   [ ] Logs indicate successful initialization.
*   [ ] Stop Dockflare. Start it again (tunnel now exists). **Verify:**
    *   [ ] Logs indicate finding the existing tunnel.
    *   [ ] UI shows the same tunnel ID and token.
*   [ ] Start Dockflare with a pre-existing `state.json` file. **Verify:**
    *   [ ] Logs indicate state loaded successfully.
    *   [ ] Rules from the state file appear correctly in the UI.
    *   [ ] `delete_at` times (if any) are parsed correctly (check countdown timers).

**II. Cloudflared Agent Management (UI & Auto)**

*   [ ] If agent container (`CLOUDFLARED_CONTAINER_NAME`) is *not* running on Dockflare startup: **Verify:**
    *   [ ] Logs indicate auto-start attempt.
    *   [ ] Agent container starts (check `docker ps`).
    *   [ ] UI shows agent status as "running".
*   [ ] Click "Stop Agent" button in UI. **Verify:**
    *   [ ] Agent container stops (check `docker ps`).
    *   [ ] UI status updates to "exited" or similar.
    *   [ ] "Start Agent" button becomes enabled, "Stop Agent" disabled.
*   [ ] Click "Start Agent" button in UI. **Verify:**
    *   [ ] Agent container starts.
    *   [ ] UI status updates to "running".
    *   [ ] "Stop Agent" button becomes enabled, "Start Agent" disabled.
*   [ ] Manually stop/remove the agent container outside Dockflare. Refresh UI page. **Verify:** UI status updates to "not found" or "exited".
*   [ ] Ensure Docker network (`CLOUDFLARED_NETWORK_NAME`) is created if it doesn't exist when starting the agent.

**III. Rule Lifecycle via Docker Events**

*   [ ] Start a test container with *valid* `cloudflare.tunnel.enable=true`, `hostname`, `service` labels (and optionally `zonename`). **Verify:**
    *   [ ] Logs show container start processed.
    *   [ ] Logs show rule added/activated.
    *   [ ] Rule appears in UI table with "active" status.
    *   [ ] Cloudflare tunnel config is updated (check CF dashboard or API) to include the new ingress rule.
    *   [ ] CNAME DNS record is created in the correct Cloudflare zone pointing to the tunnel.
*   [ ] Start a test container with `enable=false` or missing `hostname`/`service`. **Verify:**
    *   [ ] Logs show container start ignored.
    *   [ ] No rule added to UI/CF/DNS.
*   [ ] Stop the managed test container. **Verify:**
    *   [ ] Logs show container stop processed.
    *   [ ] Rule status in UI changes to "pending_deletion".
    *   [ ] A countdown timer appears for the rule.
    *   [ ] Rule remains in Cloudflare config and DNS *temporarily*.
*   [ ] Start the *same* test container again *before* the grace period expires. **Verify:**
    *   [ ] Logs show rule reactivated.
    *   [ ] Rule status in UI changes back to "active".
    *   [ ] Countdown timer disappears.
    *   [ ] Rule remains/is re-verified in Cloudflare config and DNS.
*   [ ] Stop the managed test container again. Wait for the grace period (`GRACE_PERIOD_SECONDS`) + cleanup interval (`CLEANUP_INTERVAL_SECONDS`) to elapse. **Verify:**
    *   [ ] Logs show cleanup task running and identifying the expired rule.
    *   [ ] Logs show DNS deletion attempt.
    *   [ ] DNS record is deleted from Cloudflare.
    *   [ ] Logs show CF config update attempt.
    *   [ ] Cloudflare tunnel config is updated (rule removed).
    *   [ ] Rule is removed from the UI table.
    *   [ ] Rule is removed from `state.json` (check after saving).

**IV. Rule Management (Update & Manual)**

*   [ ] With a managed container running, change its `service` label and *restart* the container. **Verify:**
    *   [ ] Logs show service update for the active rule.
    *   [ ] Cloudflare tunnel config is updated with the new service URL.
    *   [ ] Service target updates in the UI table.
*   [ ] With a managed container running, change its `zonename` label and *restart* the container. **Verify:**
    *   [ ] Logs show zone change warning/info.
    *   [ ] Rule's Zone ID is updated in state (difficult to see directly, but check logs).
    *   [ ] Logs show DNS check/creation in the *new* zone.
    *   [ ] DNS record exists in the new Cloudflare zone. (Manually check if DNS existed and was cleaned from old zone).
*   [ ] Click "Force Delete" on an active rule in the UI. **Verify:**
    *   [ ] Confirmation prompt appears.
    *   [ ] After confirming: Rule is immediately removed from UI table.
    *   [ ] DNS record is deleted from Cloudflare quickly.
    *   [ ] Cloudflare tunnel config is updated quickly (rule removed).
    *   [ ] Rule is removed from `state.json`.

**V. Reconciliation**

*   [ ] Stop Dockflare. Manually add an ingress rule to the Cloudflare tunnel config. Start Dockflare. **Verify:**
    *   [ ] Logs show reconciliation detecting mismatch.
    *   [ ] Logs show CF config update.
    *   [ ] The manually added rule is removed from Cloudflare config (as it's not in Dockflare's state).
*   [ ] Stop Dockflare. Add a rule to `state.json` for a container that *isn't* running. Start Dockflare. **Verify:**
    *   [ ] Logs show reconciliation finding the rule but no running container.
    *   [ ] Rule status becomes "pending_deletion" in the UI.
*   [ ] Stop Dockflare. Start a labeled container. Delete `state.json`. Start Dockflare. **Verify:**
    *   [ ] Logs show reconciliation finding running container but no state.
    *   [ ] Rule is created (UI, CF Config, DNS).
*   [ ] Stop Dockflare. Manually delete the CNAME record for an *active* rule in Cloudflare. Start Dockflare. **Verify:**
    *   [ ] Reconciliation (or `process_container_start` if run soon after) detects the active rule and should re-create the missing DNS record.

**VI. Web UI & Logging**

*   [ ] Open the status page. **Verify:** All sections load with expected data.
*   [ ] Check the Real-time Log Output. **Verify:**
    *   [ ] "Connected" message appears.
    *   [ ] Logs appear as actions happen (container start/stop, CF updates etc).
    *   [ ] Log area auto-scrolls when scrolled to the bottom.
    *   [ ] Log area does *not* jump to bottom if scrolled up.
    *   [ ] (If possible) Simulate stream disconnect. **Verify:** Error message appears, attempts to reconnect.
*   [ ] Use the Theme Toggle button. **Verify:** Theme switches between light/dark, preference is saved across page refresh.
*   [ ] Check countdown timers are displaying correctly for pending rules.

**VII. Error Handling & Edge Cases**

*   [ ] Temporarily use an invalid `CF_API_TOKEN`. Restart Dockflare or trigger CF update (e.g. start container). **Verify:**
    *   [ ] Logs show API errors (4xx).
    *   [ ] UI displays relevant error in Initialization or Last Action status.
    *   [ ] Config updates retry (check logs) then fail permanently if token stays invalid.
*   [ ] Test starting container with invalid hostname/service format. **Verify:** Logs show warning, container ignored.
*   [ ] Test race conditions (if possible): Start/stop containers very quickly. **Verify:** State remains consistent eventually.
*   [ ] Corrupt `state.json` manually. Start Dockflare. **Verify:** Logs error, starts with fresh state.

**VIII. Shutdown**

*   [ ] Stop Dockflare using Ctrl+C (SIGINT). **Verify:**
    *   [ ] Logs show shutdown initiated.
    *   [ ] App exits cleanly.

---

Remember to check the application logs (`stdout`/`stderr`) and the Cloudflare dashboard (Tunnel config, DNS records) frequently during testing to confirm actions. Good luck!