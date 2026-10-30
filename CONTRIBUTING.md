# Contributing to Voca

Voca is a public, MIT-licensed, free and local-first career workspace. Contributions are welcome across features, bug fixes, tests, documentation and accessibility.

## Project decisions

- **No mandatory accounts.** Do not introduce registration, OAuth, sign-in, subscriptions or hosted profile storage for the core experience.
- **Local-first career data.** A user's editable career profile persists in their own browser LocalStorage until they clear it. Unlike Paperkit's temporary PDF uploads, this persistence is intentional. Never add a Voca server database or analytics pipeline retaining resumes or personal details without a separately reviewed and explicitly optional design.
- **Private document processing.** Keep resume imports and previews local to the browser where possible; discard temporary file content after processing. Avoid storing raw imported files, filenames, extracted text or API keys in logs, telemetry or repositories.
- **AI is optional.** No AI provider keys stored by default; any data transfer must be specifically approved and displayed.
- **No invented career claims.** Suggestions must not add unsupported credentials, dates, achievements, or scores presented as hiring predictions.

## Workflow

1. Check [ROADMAP.md](ROADMAP.md), existing issues and open PRs before starting.
2. Open or reference an issue; keep each PR small and scoped to a single change.
3. Branch from the latest `main`. Never commit directly to `main`.
4. Write focused unit tests and Playwright browser regression coverage when the change affects a user journey.
5. Run `npm ci`, `CI=true npm test -- --watchAll=false`, `npm run build`, and `npm run test:e2e` (install Chromium first).
6. Update relevant documentation and describe the privacy, accessibility and data-migration impact in your PR.
7. Wait for the *latest commit's* required Actions checks to finish green; correct all failures before merging.
8. A contributor's PR requires an approving review under the repository's active ruleset. The repository owner may merge their own reviewed, verified green PR without another person's approval.
9. After merge, check the `main` CI pipeline, live-site HTTP smoke check, and GitHub Pages deployment.

## Pull request checklist

- [ ] Issue / roadmap reference and concise user value
- [ ] Tests added or an explanation for why no tests are needed
- [ ] Privacy and local-data implications reviewed
- [ ] No user data, secrets or real resumes in the diff or logs
- [ ] Core experience works without login or payment
- [ ] Accessible navigation and mobile layout considered
- [ ] Latest-head CI checks green; deploy verification after merge

Use GitHub Issues for bugs and requests. For security problems, follow [SECURITY.md](SECURITY.md) instead of posting sensitive reproduction details publicly.

## License

By contributing, you agree that original contributions are licensed under this repository's [MIT License](LICENSE). Respect third-party licenses and attribution.
