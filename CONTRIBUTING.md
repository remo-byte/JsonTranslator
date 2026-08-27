# Contributing to JSON Translator

Thank you for your interest in contributing to JSON Translator! We welcome bug reports, feature suggestions, documentation improvements, and pull requests.

## How Can I Contribute?

### Reporting Bugs
- Check the [Issues tab](https://github.com/your-username/json-translator/issues) to ensure the bug hasn't already been reported.
- Open a new issue using the **Bug Report** template.
- Provide a clear, detailed description along with reproduction steps and your operating system.

### Suggesting Enhancements
- Open a new issue with the **Feature Request** template.
- Clearly describe the proposed feature and why it would be beneficial for JSON translation workflows.

### Pull Requests
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your code changes following clean code and TypeScript typing conventions.
3. Test that both renderer and Electron scripts build without errors:
   ```bash
   npm run build && npm run electron:compile
   ```
4. Commit your changes with clear, descriptive commit messages following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add OpenAI provider`
   - `fix: resolve placeholder mismatch regex issue`
   - `docs: update keyboard shortcuts table`
5. Push to your fork and submit a Pull Request.

## Code Style & Guidelines
- Strict TypeScript typing (avoid `any` where possible).
- Adhere to the Strategy Pattern for new translation providers (`ITranslationProvider`).
- Extend `BaseModal` for any new popup/dialog components.
- Ensure all new user-facing strings are localized in `src/languages/en.json` and `src/languages/tr.json`.
