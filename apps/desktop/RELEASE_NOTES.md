Download the installer for your computer from **Assets** below (the source-code archives are for developers):

| Computer | Download |
| --- | --- |
| Windows 64-bit | `Raalhu-…-win-x64.exe` |
| Mac with Apple Silicon (M1 or later) | `Raalhu-…-mac-arm64.dmg` |
| Mac with Intel processor | `Raalhu-…-mac-x64.dmg` |
| Linux 64-bit | `Raalhu-…-linux-x64.AppImage` or `.deb` |

No Bun, Node.js, or local development server is needed. Install and sign in with your own account. Internet access and access to the configured Raalhu backend are required. BYOK uses your own Google AI Studio key and may incur provider charges; requests, including the key needed to authenticate BYOK requests, pass through the configured backend. Conversation storage is local, but prompts and files used in requests are sent to the relevant services.

Community builds may be unsigned. macOS Gatekeeper or Windows SmartScreen may block or warn about an unsigned download. Maintainers should state the signing status of this release before publishing. Linux BYOK requires a working OS credential store (such as GNOME Keyring or KWallet). For AppImage permission or runtime issues, use the `.deb` on Debian/Ubuntu systems.

`SHA256SUMS.txt` lists installer checksums. Updates are manual: download and install a newer release. Back up important conversations before upgrading.

Maintainer: add changes, signing status, and the bundled backend URL here after testing the installers.
