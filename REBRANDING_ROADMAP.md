# Founder-X-AI Rebranding Roadmap

## Overview
Complete rebranding from "Roo Code" to "Founder-X-AI" across the entire extension ecosystem.

## Timeline: 4-6 Weeks

---

## Phase 1: Core Extension Files (Week 1-2)

### Configuration Files
- [ ] [`src/package.json`](src/package.json)
  - Extension name: `roo-cline` → `founder-x-ai`
  - Publisher: `RooVeterinaryInc` → `Founder-X-AI`
  - Display name: `Roo Code` → `Founder-X-AI`
  - Commands: `roo-cline.*` → `founder-x-ai.*`
  - Views: `roo-cline-ActivityBar` → `founder-x-ai-ActivityBar`

- [ ] [`src/extension.ts`](src/extension.ts)
  - Extension activation logic
  - Command registration
  - Configuration settings

- [ ] VSCode Configuration Settings
  - `roo-cline.allowedCommands` → `founder-x-ai.allowedCommands`
  - `roo-cline.deniedCommands` → `founder-x-ai.deniedCommands`
  - `roo-cline.customStoragePath` → `founder-x-ai.customStoragePath`

### Core Logic Files
- [ ] [`src/core/webview/generateSystemPrompt.ts`](src/core/webview/generateSystemPrompt.ts)
- [ ] [`src/core/task/Task.ts`](src/core/task/Task.ts)
- [ ] [`src/core/tools/newTaskTool.ts`](src/core/tools/newTaskTool.ts)
- [ ] [`src/api/providers/utils/timeout-config.ts`](src/api/providers/utils/timeout-config.ts)

---

## Phase 2: UI/Webview Components (Week 3-4)

### Main UI Files
- [ ] [`webview-ui/index.html`](webview-ui/index.html) - Page title
- [ ] [`webview-ui/src/components/`](webview-ui/src/components/) - All React components
- [ ] [`webview-ui/src/i18n/`](webview-ui/src/i18n/) - UI translations

### Specific Components
- [ ] [`webview-ui/src/components/ErrorBoundary.tsx`](webview-ui/src/components/ErrorBoundary.tsx)
- [ ] [`webview-ui/src/components/settings/About.tsx`](webview-ui/src/components/settings/About.tsx)
- [ ] [`webview-ui/src/components/marketplace/IssueFooter.tsx`](webview-ui/src/components/marketplace/IssueFooter.tsx)
- [ ] [`webview-ui/src/components/account/AccountView.tsx`](webview-ui/src/components/account/AccountView.tsx)
- [ ] [`webview-ui/src/components/welcome/RooHero.tsx`](webview-ui/src/components/welcome/RooHero.tsx)

### Configuration
- [ ] [`webview-ui/vite.config.ts`](webview-ui/vite.config.ts) - Output channel names
- [ ] [`webview-ui/src/components/settings/constants.ts`](webview-ui/src/components/settings/constants.ts) - Provider labels

---

## Phase 3: Internationalization (Week 3-4)

### Languages (16 total)
- [ ] English (`en`)
- [ ] Spanish (`es`)
- [ ] French (`fr`)
- [ ] German (`de`)
- [ ] Chinese Simplified (`zh-CN`)
- [ ] Chinese Traditional (`zh-TW`)
- [ ] Japanese (`ja`)
- [ ] Korean (`ko`)
- [ ] Russian (`ru`)
- [ ] Portuguese (`pt-BR`)
- [ ] Italian (`it`)
- [ ] Dutch (`nl`)
- [ ] Polish (`pl`)
- [ ] Turkish (`tr`)
- [ ] Vietnamese (`vi`)
- [ ] Hindi (`hi`)
- [ ] Indonesian (`id`)
- [ ] Catalan (`ca`)

### File Types per Language
- [ ] `welcome.json` - Welcome messages
- [ ] `chat.json` - Chat interface text
- [ ] `settings.json` - Settings interface
- [ ] `account.json` - Account management
- [ ] `prompts.json` - Prompt management
- [ ] `mcp.json` - MCP configuration

---

## Phase 4: Documentation & Marketing (Week 5)

### Main Documentation
- [ ] [`README.md`](README.md) - Primary documentation
- [ ] [`CONTRIBUTING.md`](CONTRIBUTING.md) - Contribution guidelines
- [ ] [`PRIVACY.md`](PRIVACY.md) - Privacy policy
- [ ] [`SECURITY.md`](SECURITY.md) - Security policy
- [ ] [`CHANGELOG.md`](CHANGELOG.md) - Release notes

### Localized Documentation (16 languages)
- [ ] [`locales/`](locales/) directory - All localized README files
- [ ] Update demo GIF references and links

---

## Phase 5: Package & Build Configuration (Week 5)

### Root Configuration
- [ ] [`package.json`](package.json) - Workspace name
- [ ] Turbo configuration
- [ ] Build scripts

### App Packages
- [ ] [`apps/web-roo-code/package.json`](apps/web-roo-code/package.json) - Web app
- [ ] [`apps/web-evals/package.json`](apps/web-evals/package.json) - Evals app

### Workspace Packages
- [ ] [`packages/types/package.json`](packages/types/package.json)
- [ ] [`packages/build/package.json`](packages/build/package.json)
- [ ] [`packages/evals/package.json`](packages/evals/package.json)

---

## Phase 6: External References & URLs (Week 5)

### GitHub References
- [ ] `RooCodeInc/Roo-Code` → `Founder-X-AI/Founder-X-AI`
- [ ] Repository URLs throughout codebase
- [ ] Issue templates and links

### Community Links
- [ ] `discord.gg/roocode` → `discord.gg/founder-x-ai`
- [ ] `reddit.com/r/RooCode` → `reddit.com/r/Founder-X-AI`

### Model References
- [ ] `roo/sonic` → `founder-x-ai/sonic` (or new model name)
- [ ] [`packages/types/src/providers/roo.ts`](packages/types/src/providers/roo.ts)
- [ ] [`packages/types/src/single-file-read-models.ts`](packages/types/src/single-file-read-models.ts)

### Marketplace
- [ ] `RooVeterinaryInc.roo-cline` → `Founder-X-AI.founder-x-ai`

---

## Phase 7: Logo & Visual Assets (Week 6)

### Logo Files
- [ ] `roo-logo.svg` → `founder-x-ai-logo.svg`
- [ ] Update references in [`webview-ui/src/components/welcome/RooHero.tsx`](webview-ui/src/components/welcome/RooHero.tsx)
- [ ] Update references in [`webview-ui/src/components/account/AccountView.tsx`](webview-ui/src/components/account/AccountView.tsx)

### Web App Assets
- [ ] [`apps/web-roo-code/public/`](apps/web-roo-code/public/) - All branding assets
- [ ] Favicons and app icons

---

## Phase 8: Testing & Validation (Week 6)

### Extension Testing
- [ ] Build and package extension
- [ ] Install and test in VSCode
- [ ] Verify all commands work
- [ ] Test configuration settings

### UI Testing
- [ ] Test all webview components
- [ ] Verify internationalization
- [ ] Test settings interface
- [ ] Verify marketplace functionality

### Integration Testing
- [ ] Test MCP functionality
- [ ] Verify API providers
- [ ] Test evals system
- [ ] Validate build process

---

## Implementation Checklist

### Search & Replace Patterns
- [ ] `Roo Code` → `Founder-X-AI`
- [ ] `RooCode` → `Founder-X-AI`
- [ ] `roo-cline` → `founder-x-ai`
- [ ] `RooVeterinaryInc` → `Founder-X-AI`
- [ ] `RooCodeInc` → `Founder-X-AI`
- [ ] `roo/sonic` → `founder-x-ai/sonic`
- [ ] `discord.gg/roocode` → `discord.gg/founder-x-ai`
- [ ] `reddit.com/r/RooCode` → `reddit.com/r/Founder-X-AI`

### File Count Summary
- Core extension files: ~50 files
- UI components: ~100 files
- Internationalization: ~300 files
- Documentation: ~50 files
- Configuration: ~20 files
- Total: ~520 files

### Quality Assurance
- [ ] Run linting: `pnpm lint`
- [ ] Run type checking: `pnpm check-types`
- [ ] Run tests: `pnpm test`
- [ ] Build verification: `pnpm build`
- [ ] Extension packaging: `pnpm vsix`

---

## Success Criteria
- Extension installs and runs without errors
- All UI components display correct branding
- Internationalization works in all 16 languages
- Documentation is consistent and accurate
- Build process completes successfully
- All tests pass
- Marketplace listing updated (if applicable)