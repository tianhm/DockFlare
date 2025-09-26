## OAuth Provider Setup

DockFlare allows you to delegate user authentication to external providers using the OpenID Connect (OIDC) standard. This enables single sign-on (SSO) and allows you to integrate with identity providers like Google, Authentik, Okta, and more.

### Adding a New Provider

Follow these steps to add a new OIDC provider:

1.  **Navigate to Settings:** From the main dashboard, go to the **Settings** page.
2.  **Locate OAuth Section:** Scroll down to the **OAuth Authentication** section.
3.  **Add Provider:** Click the **Add Provider** button to open the configuration modal.

You will be presented with the following fields:

*   **Provider Type:** This is set to `OpenID Connect (OIDC)`, the modern standard for federated authentication.
*   **Issuer URL:** This is the most important field. It is the base URL of your OIDC provider, which DockFlare uses to automatically discover the provider's configuration. For example, `https://accounts.google.com` or `https://authentik.yourdomain.com/application/o/dockflare/`.
*   **Provider ID:** A short, unique, lowercase name for this provider (e.g., `google`, `authentik-corp`). This ID is used internally and in the callback URL.
*   **Display Name:** The user-friendly name that will appear on the login button (e.g., `Google`, `Corporate SSO`).
*   **Client ID:** The public identifier for the DockFlare application, which you will get from your OIDC provider's developer console.
*   **Client Secret:** The confidential secret for the DockFlare application, also from your OIDC provider's console.
*   **Enable Provider:** This checkbox allows you to enable or disable the provider at any time.

After filling in the details, click **Add Provider** to save.

### Finding Your Callback URL

Once you have added a provider, the required **Callback URL** (also known as an "Authorized redirect URI") will be displayed under the provider's entry on the Settings page.

You must copy this exact URL and add it to your provider's list of allowed callback URLs in their administration console.

---

### Example: Setting up Google

Here is a quick guide to configuring Google as an OAuth provider.

1.  **Go to Google Cloud Console:** Navigate to the [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials) page.
2.  **Create Credentials:** Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
3.  **Configure Application:**
    *   Set the **Application type** to **Web application**.
    *   Give it a name (e.g., "DockFlare").
4.  **Add Redirect URI:**
    *   Under **Authorized redirect URIs**, click **+ ADD URI**.
    *   Enter the callback URL provided by DockFlare. It will look like this: `https://your-dockflare-domain.com/auth/google/callback`.
5.  **Create and Copy:** Click **CREATE**. A window will appear showing your **Client ID** and **Client Secret**. Copy these values.
6.  **Configure in DockFlare:**
    *   **Issuer URL:** `https://accounts.google.com`
    *   **Provider ID:** `google`
    *   **Display Name:** `Google`
    *   **Client ID:** `(Your Client ID from Google)`
    *   **Client Secret:** `(Your Client Secret from Google)`

Save the provider in DockFlare, and you will be able to log in with your Google account.
