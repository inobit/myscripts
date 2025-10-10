# myscripts

Personal collection of browser userscripts and small utilities.

## emacs-input.user.js

- File: `emacs-input.user.js`
- Purpose: Emacs-style editing keys for `input` and `textarea` elements on web pages.
- Scope: Regular web pages only; extension pages (e.g., `chrome-extension://`) are not controlled by userscripts.

### Dependencies

- Tampermonkey (or a compatible userscript manager)

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

## translator.py

- File: `translator.py`
- Purpose: translate in terminal

### Dependencies

optional uv

without uv, make sure you have python environment with `pip install requests`

### Feature

- google (default)
- azure
- baidu
- youdao
- bing
- ciba
- deeplx

### Config

Path: `~/.config/translator/config.toml`

```toml
[default]
timeout = 5
proxy = "<your proxy address>"


[deeplx]
url = "https://api.deeplx.org/<your-api-key>/translate"
```

### Usage

usage: translator.py {--engine=xx} {--from=xx} {--to=xx}

example:

```sh
chmod +x translator.py
ln -sf translator.py ~/.local/bin/ts
ts --engine=google --from=zh --to=en 正在测试翻译一段话
```

### Knowledge

the raw code is from https://github.com/skywind3000/translator/blob/master/translator.py
