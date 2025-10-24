# Phase 7: Logo and Visual Assets Update Guide

## Overview
This document outlines the visual assets that need to be updated from RooCode to Founder-X-AI branding. Since actual image files cannot be created programmatically, this guide provides instructions for manual replacement.

## Main Extension Assets (src/assets/)

### Icons Directory (src/assets/icons/)
The following files need to be replaced with Founder-X-AI branded versions:

1. **`icon.png`** - Main extension icon (128x128 pixels)
2. **`icon.svg`** - Vector version of main extension icon
3. **`icon-nightly.png`** - Nightly build extension icon
4. **`panel_dark.png`** - Dark theme panel icon
5. **`panel_light.png`** - Light theme panel icon

### Images Directory (src/assets/images/)
The following files need to be replaced:

1. **`roo-logo.svg`** - Roo logo SVG file
2. **`openrouter.png`** - OpenRouter integration image
3. **`requesty.png`** - Requesty integration image

## Web Application Assets (apps/web-roo-code/public/)

### Logo Files to Replace:
1. **`Roo-Code-Logo-Horiz-blk.svg`** - Horizontal logo (black)
2. **`Roo-Code-Logo-Horiz-white.svg`** - Horizontal logo (white)
3. **`RooCode-Badge-blk.svg`** - Badge logo (black)
4. **`RooCode-Badge-white.svg`** - Badge logo (white)

### Favicon and App Icons:
1. **`android-chrome-192x192.png`** - Android Chrome icon (192x192)
2. **`android-chrome-512x512.png`** - Android Chrome icon (512x512)
3. **`apple-touch-icon.png`** - Apple touch icon
4. **`favicon-16x16.png`** - Favicon (16x16)
5. **`favicon-32x32.png`** - Favicon (32x32)
6. **`favicon.ico`** - Main favicon

## VSCode Nightly Extension (apps/vscode-nightly/)

The nightly extension references `assets/icons/icon-nightly.png` from the main src/assets directory.

## File References to Update

### Package.json Files:
- **`src/package.json`** - Line 7: `"icon": "assets/icons/icon.png"`
- **`apps/vscode-nightly/package.nightly.json`** - Line 4: `"icon": "assets/icons/icon-nightly.png"`

## Implementation Steps

1. **Design New Assets**: Create Founder-X-AI branded versions of all listed files
2. **Replace Files**: Manually replace all the files listed above
3. **Verify References**: Ensure all file references in package.json files are correct
4. **Test Display**: Verify icons display correctly in VSCode extension and web applications

## Naming Convention for New Files

For Founder-X-AI branding, consider these naming patterns:
- `founder-x-ai-logo-horiz-blk.svg`
- `founder-x-ai-logo-horiz-white.svg`
- `founder-x-ai-badge-blk.svg`
- `founder-x-ai-badge-white.svg`
- `founder-x-ai-icon.png`
- `founder-x-ai-icon.svg`

## Notes
- All SVG files should maintain the same dimensions and aspect ratios
- PNG files should maintain the same pixel dimensions
- Color schemes should be consistent with Founder-X-AI branding guidelines
- Test all icons in both light and dark themes