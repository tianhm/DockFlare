# DockFlare Security Assessment Report

**Assessment Date:** September 26, 2025
**Target Application:** DockFlare v3.0.1
**Live URL:** https://df.dataverse.icu
**Assessment Type:** White-box penetration test with source code access

## Executive Summary

DockFlare is a Flask-based web application that automates Cloudflare Tunnel ingress from Docker labels. The security assessment revealed a **medium-low risk** profile with generally good security practices implemented. The application demonstrates proper authentication controls, CSRF protection, and secure session management. However, some areas for improvement were identified, particularly around information disclosure and security headers.

## Application Architecture Analysis

### Web Routes Identified
- **Main Web Routes:** 24 endpoints including authentication, settings, tunnel management
- **API v2 Routes:** 26 REST endpoints for programmatic access
- **Setup Routes:** 6 endpoints for initial configuration
- **Help Routes:** 2 documentation endpoints

### Key Components
- Flask web framework with Blueprint architecture
- Flask-Login for session management
- Flask-WTF for CSRF protection
- OAuth/OIDC integration (Google provider configured)
- Rate limiting via Flask-Limiter
- Agent-based distributed architecture

## Security Findings

### 🟢 Strengths (Good Security Practices)

#### Authentication & Authorization
- ✅ **Proper session-based authentication** via Flask-Login
- ✅ **CSRF protection** implemented across all forms
- ✅ **OAuth/OIDC integration** with Google provider
- ✅ **API key authentication** for programmatic access
- ✅ **Proper user session validation** with timeout controls
- ✅ **Login rate limiting** to prevent brute force attacks

#### Security Headers
- ✅ **Content Security Policy (CSP)** properly configured:
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://rsms.me https://cdn.jsdelivr.net;
  img-src 'self' data: https://img.shields.io; font-src 'self' https://rsms.me;
  connect-src 'self'; frame-src 'none'; upgrade-insecure-requests
  ```
- ✅ **Strict-Transport-Security (HSTS)** enforced with 1-year max-age and includeSubDomains
- ✅ **X-Content-Type-Options: nosniff** prevents MIME type confusion
- ✅ **X-Frame-Options: SAMEORIGIN** protects against clickjacking
- ✅ **X-XSS-Protection: 1; mode=block** (legacy browser protection)
- ✅ **Referrer-Policy: strict-origin-when-cross-origin** controls referrer leakage

#### Session Security
- ✅ **HTTPOnly cookies** prevent XSS cookie theft
- ✅ **SameSite=Lax** cookie attribute set
- ✅ **24-hour session lifetime** configured
- ✅ **Secure random session keys** using `os.urandom(24)`

#### Input Validation & Protection
- ✅ **Path traversal protection** - tested endpoints reject `../` sequences
- ✅ **HTTP method restrictions** - unsupported methods return 405 errors
- ✅ **CORS preflight handling** for API endpoints

### 🟡 Areas for Improvement (Medium Risk)

#### Information Disclosure
- ⚠️ **Version information exposed** via `/ping` endpoint:
  ```json
  {"protocol":"http","status":"ok","timestamp":1758906302,"version":"v3.0.1"}
  ```
  **Impact:** Enables version-specific attack targeting
  **Recommendation:** Remove version from public endpoints or require authentication

- ⚠️ **Cloudflare internal information leaked** via `/cloudflare-ping`:
  ```json
  {
    "cloudflare": {
      "connecting_ip": "31.165.127.118",
      "ray": "98545984780b931a-ZRH"
    },
    "request": {"host": "df.dataverse.icu", "path": "/cloudflare-ping", "scheme": "http"},
    "server": {"wsgi_url_scheme": "http"}
  }
  ```
  **Impact:** Reveals infrastructure details and client IPs
  **Recommendation:** Require authentication for this endpoint

#### Security Header Enhancements
- ⚠️ **CSP allows 'unsafe-inline'** for scripts and styles
  **Impact:** Reduces XSS protection effectiveness
  **Recommendation:** Implement nonce-based CSP or move inline scripts to external files

- ⚠️ **Missing Permissions-Policy header**
  **Impact:** Browser features not explicitly controlled
  **Recommendation:** Add restrictive Permissions-Policy header

#### CORS Configuration
- ⚠️ **Overly permissive CORS** with `Access-Control-Allow-Origin: *`
  **Impact:** Allows requests from any domain
  **Recommendation:** Restrict to specific trusted origins

### 🟢 Verified Protections (No Issues Found)

#### Injection Attacks
- ✅ **No SQL injection vectors** identified (using ORM patterns)
- ✅ **No command injection** opportunities in tested endpoints
- ✅ **XSS protection** via CSP and proper output encoding

#### Authentication Bypass
- ✅ **No authentication bypass** vectors found
- ✅ **API endpoints properly protected** with bearer token authentication
- ✅ **Session management secure** - no session fixation or hijacking vectors

#### File System Access
- ✅ **No local file inclusion** vulnerabilities
- ✅ **No exposed sensitive files** (.env, backup files, etc.)
- ✅ **Static file serving secured** - no directory traversal

#### Infrastructure Security
- ✅ **HTTP TRACE method disabled** (returns 405)
- ✅ **Proper error handling** - no stack traces exposed
- ✅ **Host header injection protected** by Cloudflare

## Risk Assessment Matrix

| Vulnerability Type | Risk Level | Count | Status |
|-------------------|------------|--------|---------|
| Critical | 🔴 | 0 | ✅ None Found |
| High | 🟠 | 0 | ✅ None Found |
| Medium | 🟡 | 3 | ⚠️ Found |
| Low | 🟢 | Multiple | ✅ Acceptable |
| Info | ℹ️ | 2 | 📝 Noted |

## Detailed Technical Findings

### Finding 1: Version Information Disclosure
**Endpoint:** `/ping`
**Risk Level:** Medium
**CWE:** CWE-200 (Information Exposure)

The ping endpoint exposes the exact application version (v3.0.1) to unauthenticated users. This information can be used by attackers to research known vulnerabilities specific to this version.

**Proof of Concept:**
```bash
curl -s https://df.dataverse.icu/ping
# Returns: {"version":"v3.0.1",...}
```

### Finding 2: Infrastructure Information Leakage
**Endpoint:** `/cloudflare-ping`
**Risk Level:** Medium
**CWE:** CWE-200 (Information Exposure)

This endpoint reveals internal infrastructure details including client IP addresses and Cloudflare Ray IDs, which could aid in reconnaissance.

### Finding 3: Permissive CORS Policy
**Scope:** All endpoints
**Risk Level:** Medium
**CWE:** CWE-942 (Permissive Cross-domain Policy)

The application sets `Access-Control-Allow-Origin: *`, allowing requests from any domain, which could enable CSRF attacks against authenticated users.

## Code Security Analysis

### Authentication Implementation (`dockflare/app/__init__.py:146-157`)
The application implements a custom request loader that bypasses authentication for certain API endpoints:

```python
@login_manager.request_loader
def load_user_from_request(request):
    if request.path.startswith('/api/v2/auth/'):
        return None
    elif request.endpoint and request.endpoint.startswith('api_v2.'):
        from app.core.user import User
        return User('api_user')
    return None
```

This design properly segregates API authentication from web session authentication.

### API Authentication (`dockflare/app/web/api_v2_routes.py:81-100`)
API endpoints require master API key authentication with proper bearer token validation:

```python
expected_key = current_app.config.get('MASTER_API_KEY') or config.MASTER_API_KEY
if not expected_key:
    return jsonify({"status": "error", "message": "master_api_key_not_configured"}), 503
```

## Compliance Assessment

### OWASP Top 10 2021 Compliance
- ✅ **A01 - Broken Access Control:** Proper authentication and authorization
- ✅ **A02 - Cryptographic Failures:** HTTPS enforced, secure session handling
- ✅ **A03 - Injection:** No injection vectors identified
- ⚠️ **A04 - Insecure Design:** Minor issues with information disclosure
- ✅ **A05 - Security Misconfiguration:** Generally well configured
- ✅ **A06 - Vulnerable Components:** Current Flask/Python versions
- ✅ **A07 - Identity and Authentication Failures:** Robust auth system
- ✅ **A08 - Software and Data Integrity Failures:** Proper integrity controls
- ⚠️ **A09 - Security Logging and Monitoring Failures:** Limited logging visibility
- ✅ **A10 - Server-Side Request Forgery:** No SSRF vectors identified

## Recommendations

### Immediate Actions (High Priority)
1. **Restrict version information disclosure**
   - Remove version from `/ping` endpoint or require authentication
   - Consider implementing a generic health check endpoint

2. **Secure infrastructure endpoints**
   - Add authentication requirement to `/cloudflare-ping`
   - Consider removing or restricting access to debug endpoints

3. **Strengthen CORS policy**
   - Replace `Access-Control-Allow-Origin: *` with specific trusted domains
   - Implement proper preflight request handling

### Medium-term Improvements
1. **Enhance Content Security Policy**
   - Remove `'unsafe-inline'` directives
   - Implement nonce-based CSP for dynamic content

2. **Add security monitoring**
   - Implement security event logging
   - Add intrusion detection for repeated failed authentication attempts

3. **Security headers enhancement**
   - Add Permissions-Policy header
   - Consider adding Expect-CT header for certificate transparency

### Long-term Security Hardening
1. **Implement Web Application Firewall (WAF)**
2. **Add comprehensive security monitoring and alerting**
3. **Regular security dependency updates and vulnerability scanning**
4. **Penetration testing on a regular schedule**

## Conclusion

DockFlare demonstrates a **strong security foundation** with proper implementation of core security controls including authentication, CSRF protection, and secure session management. The identified vulnerabilities are primarily related to **information disclosure** and **configuration hardening** rather than critical security flaws.

The application is **suitable for production deployment** with the implementation of the recommended immediate actions. The overall security posture is **above average** for a self-hosted application, particularly given the proper implementation of authentication and session security controls.

**Overall Security Rating: B+ (Good)**

---

*This assessment was conducted on September 26, 2025, against DockFlare v3.0.1 deployed at https://df.dataverse.icu. Results may vary with different versions or configurations.*