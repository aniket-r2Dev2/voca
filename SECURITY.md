# Reporting security vulnerabilities

Please do **not** post an exploitable vulnerability, private resume, secret, or proof-of-concept containing personal data in a public issue. Use GitHub's private vulnerability reporting feature if enabled on the repository, or contact the maintainer through an existing private channel.

Include a minimal **synthetic** reproduction, impact, affected component, and suggested mitigation. Do not attach real user data.

## Security boundaries

- Voca's core workflows need **no account**, hosted identity service, API key, or server.
- Career data is stored locally in this browser by design; LocalStorage is not encrypted and can be read by scripts running on the same origin. Users sharing a device/browser profile should download a backup and clear their data when appropriate.
- Legacy keys are retained for data-migration safety; a full local deletion feature must remove them as well.
- Document imports must enforce size/type limits, handle malformed/untrusted input, and avoid logging document bodies, filenames, email addresses, or personal data.
- Any future AI integration must disclose exactly what is transmitted and request consent before the transfer. Never silently persist provider keys.
- Review dependencies with the GitHub Actions security-audit report; unit tests, browser tests and production builds must pass before merge.
- Report security fixes through a PR only after removing sensitive details, secrets, and real personal information.

See [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) for the data lifecycle and storage policy.
