# myscripts

Personal collection of browser userscripts and small utilities.

## Dependencies

- Tampermonkey (or a compatible userscript manager)

## emacs-input.user.js

- File: `emacs-input.user.js`
- Purpose: Emacs-style editing keys for `input` and `textarea` elements on web pages.
- Scope: Regular web pages only; extension pages (e.g., `chrome-extension://`) are not controlled by userscripts.

### Install

- Install Tampermonkey in your browser.
- Create a new userscript and paste the content of `emacs-input.user.js`.
- Save and reload the target pages.

### Keybindings

- `C-a`: beginning of line
- `C-e`: end of line (if not reserved by the browser)
- `C-b` / `C-f`: backward/forward char
- `C-d`: delete char forward
- `C-h`: delete char backward (Backspace)
- `C-k`: kill to end of line (joins next line if at end)
- `M-b` / `M-f`: backward/forward word
- `M-d` / `M-Backspace`: delete word forward/backward
- `C-n` / `C-p` (textarea only): next/previous line

Note: Browser/system-reserved shortcuts (e.g., `Ctrl+T`, `Ctrl+W`, sometimes `Ctrl+E`) cannot be intercepted by page scripts.

### Toggle

- `Ctrl+Alt+/`: toggle enable/disable interception.
- A small toast appears near the caret when possible; otherwise it is centered on screen.
- Per-element opt-out: add `data-no-emacs-keys="true"` to an `input`/`textarea`.

### Limitations

- Userscripts cannot run in extension pages (`chrome-extension://`).
- `input[type=number]` is excluded due to inconsistent selection APIs.
