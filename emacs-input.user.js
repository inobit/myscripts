// ==UserScript==
// @name         Emacs Keys for Inputs & Textareas
// @namespace    https://github.com/inobit/myscripts
// @version      0.1.0
// @description  Emacs-like keybindings (C-a, C-e, C-d, M-d, C-f, etc.) for input and textarea elements to move the caret and edit text.
// @author       inobit
// @match        *://*/*
// @grant        none
// @all-frames   true
// @run-at       document-start
// ==/UserScript==

(function() {
  "use strict";

  // Simple runtime toggle (Ctrl+Alt+/). Default: enabled
  let enabled = true;
  const addOpts = { capture: true, passive: false };

  // Compute approximate caret rect for input/textarea using a hidden mirror
  function caretClientRect(el) {
    try {
      if (!el || typeof el.selectionStart !== "number") return null;
      const doc = el.ownerDocument || document;
      const win = doc.defaultView || window;
      const s = el.selectionStart;
      const v = el.value || "";
      const rect = el.getBoundingClientRect();
      const cs = win.getComputedStyle(el);

      const mirror = doc.createElement("div");
      const isTA = el.tagName === "TEXTAREA";
      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.pointerEvents = "none";
      mirror.style.whiteSpace = isTA ? "pre-wrap" : "pre";
      mirror.style.wordWrap = isTA ? "break-word" : "normal";
      mirror.style.overflow = "hidden";
      mirror.style.boxSizing = cs.boxSizing;
      mirror.style.width = rect.width + "px";
      mirror.style.height = rect.height + "px";
      mirror.style.left = rect.left + win.scrollX - el.scrollLeft + "px";
      mirror.style.top = rect.top + win.scrollY - el.scrollTop + "px";
      mirror.style.padding = cs.padding;
      mirror.style.border = cs.border;
      mirror.style.font = cs.font;
      mirror.style.letterSpacing = cs.letterSpacing;
      mirror.style.textTransform = cs.textTransform;
      mirror.style.textAlign = cs.textAlign;
      mirror.style.lineHeight = cs.lineHeight;
      mirror.style.direction = cs.direction;

      const before = doc.createTextNode(v.slice(0, s));
      const marker = doc.createElement("span");
      marker.textContent = "\u200b"; // zero-width space
      const after = doc.createTextNode(v.slice(s));
      mirror.appendChild(before);
      mirror.appendChild(marker);
      mirror.appendChild(after);

      (doc.body || doc.documentElement).appendChild(mirror);
      const mrect = marker.getBoundingClientRect();
      mirror.parentNode.removeChild(mirror);
      return mrect;
    } catch (_) {
      return null;
    }
  }

  // Tiny toast for status feedback on toggle; place near caret if possible
  function showToast(text, targetEl) {
    try {
      const el = document.createElement("div");
      el.textContent = text;
      const style = el.style;
      style.position = "fixed";
      style.zIndex = "2147483647";
      style.background = "rgba(0,0,0,0.82)";
      style.color = "#fff";
      style.padding = "6px 10px";
      style.borderRadius = "6px";
      style.font =
        "12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
      style.opacity = "0";
      style.transition = "opacity 80ms ease";

      // Position near caret if available
      let placed = false;
      if (targetEl && isEditableTarget(targetEl)) {
        const caretRect = caretClientRect(targetEl);
        if (caretRect) {
          const x = Math.min(
            Math.max(4, caretRect.left),
            window.innerWidth - 4,
          );
          const y = Math.min(
            Math.max(4, caretRect.top - 24),
            window.innerHeight - 4,
          );
          style.left = Math.round(x) + "px";
          style.top = Math.round(y) + "px";
          placed = true;
        }
      }
      if (!placed) {
        // Center of screen
        style.left = "50%";
        style.top = "50%";
        style.transform = "translate(-50%, -50%)";
      }

      (document.body || document.documentElement).appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = "1";
      });
      setTimeout(() => {
        el.style.opacity = "0";
      }, 500);
      setTimeout(() => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 700);
    } catch (_) { }
  }

  /**
   * Basic Emacs-style editing for inputs/textareas.
   *
   * Supported keys (when an editable input or textarea is focused):
   *  - Ctrl-a: beginning of line
   *  - Ctrl-e: end of line
   *  - Ctrl-b: backward char
   *  - Ctrl-f: forward char
   *  - Ctrl-d: delete forward char
   *  - Ctrl-k: kill to end of line (remove newline if at end)
   *  - Alt-b: backward word
   *  - Alt-f: forward word
   *  - Alt-d: delete (kill) word forward
   *  - Alt-Backspace: delete (kill) word backward
   *  - Ctrl-n / Ctrl-p (textarea only): next/prev line (keeps column)
   *
   * Opt-out: add attribute data-no-emacs-keys="true" to an input/textarea.
   */

  const isWordChar = (ch) => /[A-Za-z0-9_]/.test(ch);
  const isWhite = (ch) => /\s/.test(ch);

  function isEditableTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.getAttribute && el.getAttribute("data-no-emacs-keys") === "true")
      return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA") return !el.readOnly && !el.disabled;
    if (tag === "INPUT") {
      if (el.readOnly || el.disabled) return false;
      // Allow text-like inputs; skip buttons, checkboxes, etc.
      const type = (el.getAttribute("type") || "").toLowerCase();
      return (
        type === "" ||
        type === "text" ||
        type === "search" ||
        type === "url" ||
        type === "email" ||
        type === "tel" ||
        type === "password"
      );
    }
    return false;
  }

  function getValue(el) {
    return el.value || "";
  }

  function setSelection(el, start, end) {
    const v = getValue(el);
    const len = v.length;
    const s = Math.max(0, Math.min(start, len));
    const e = Math.max(0, Math.min(end == null ? s : end, len));
    el.setSelectionRange(s, e, "none");
  }

  function caretPos(el) {
    return el.selectionStart == null ? 0 : el.selectionStart;
  }

  function selectionRange(el) {
    const s = el.selectionStart == null ? 0 : el.selectionStart;
    const e = el.selectionEnd == null ? s : el.selectionEnd;
    return [s, e];
  }

  function lineBounds(el, idx) {
    const v = getValue(el);
    if (el.tagName === "TEXTAREA") {
      // Find start = char after previous \n; end = next \n or end of text
      let start = v.lastIndexOf("\n", Math.max(0, idx - 1));
      start = start === -1 ? 0 : start + 1;
      let end = v.indexOf("\n", idx);
      end = end === -1 ? v.length : end;
      return [start, end];
    }
    // Single-line inputs: the "line" is the whole value
    return [0, v.length];
  }

  function beginningOfLine(el) {
    const pos = caretPos(el);
    const [start] = lineBounds(el, pos);
    setSelection(el, start);
  }

  function endOfLine(el) {
    const pos = caretPos(el);
    const [, end] = lineBounds(el, pos);
    setSelection(el, end);
  }

  function backwardChar(el) {
    const [s, e] = selectionRange(el);
    const pos = Math.min(s, e);
    setSelection(el, pos - 1);
  }

  function forwardChar(el) {
    const [s, e] = selectionRange(el);
    const pos = Math.max(s, e);
    setSelection(el, pos + 1);
  }

  function deleteCharForward(el) {
    const v = getValue(el);
    let [s, e] = selectionRange(el);
    if (s !== e) {
      el.setRangeText("", s, e, "start");
      return;
    }
    if (s >= v.length) return;
    el.setRangeText("", s, s + 1, "start");
  }

  function deleteCharBackward(el) {
    const v = getValue(el);
    let [s, e] = selectionRange(el);
    if (s !== e) {
      el.setRangeText("", s, e, "start");
      return;
    }
    if (s <= 0) return;
    el.setRangeText("", s - 1, s, "start");
  }

  function deleteWordForward(el) {
    const v = getValue(el);
    const len = v.length;
    let [s, e] = selectionRange(el);
    if (s !== e) {
      el.setRangeText("", s, e, "start");
      return;
    }
    let i = s;
    // If at whitespace, skip it first
    while (i < len && isWhite(v[i])) i++;
    if (i < len && isWordChar(v[i])) {
      // From start of a word, advance to its end
      while (i < len && isWordChar(v[i])) i++;
    } else {
      // Punctuation cluster
      while (i < len && !isWhite(v[i]) && !isWordChar(v[i])) i++;
    }
    el.setRangeText("", s, i, "start");
  }

  function deleteWordBackward(el) {
    const v = getValue(el);
    let [s, e] = selectionRange(el);
    if (s !== e) {
      el.setRangeText("", s, e, "start");
      return;
    }
    let i = s;
    // If at whitespace, skip left over whitespace
    while (i > 0 && isWhite(v[i - 1])) i--;
    if (i > 0 && isWordChar(v[i - 1])) {
      while (i > 0 && isWordChar(v[i - 1])) i--;
    } else {
      while (i > 0 && !isWhite(v[i - 1]) && !isWordChar(v[i - 1])) i--;
    }
    el.setRangeText("", i, s, "start");
  }

  function forwardWord(el) {
    const v = getValue(el);
    const len = v.length;
    const [, e] = selectionRange(el);
    let i = e;
    while (i < len && isWhite(v[i])) i++;
    if (i < len && isWordChar(v[i])) {
      while (i < len && isWordChar(v[i])) i++;
    } else {
      while (i < len && !isWhite(v[i]) && !isWordChar(v[i])) i++;
    }
    setSelection(el, i);
  }

  function backwardWord(el) {
    const v = getValue(el);
    const [s] = selectionRange(el);
    let i = s;
    while (i > 0 && isWhite(v[i - 1])) i--;
    if (i > 0 && isWordChar(v[i - 1])) {
      while (i > 0 && isWordChar(v[i - 1])) i--;
    } else {
      while (i > 0 && !isWhite(v[i - 1]) && !isWordChar(v[i - 1])) i--;
    }
    setSelection(el, i);
  }

  function killToEndOfLine(el) {
    const v = getValue(el);
    const len = v.length;
    let [s, e] = selectionRange(el);
    if (s !== e) {
      el.setRangeText("", s, e, "start");
      return;
    }
    const pos = s;
    const [, lineEnd] = lineBounds(el, pos);
    if (pos < lineEnd) {
      // Remove to end of line
      el.setRangeText("", pos, lineEnd, "start");
    } else if (el.tagName === "TEXTAREA" && lineEnd < len) {
      // At end of line: remove the newline too (join with next line)
      // lineEnd is position of '\n'; delete that single char
      el.setRangeText("", pos, Math.min(pos + 1, len), "start");
    }
  }

  function moveLine(el, direction) {
    // direction: +1 for next line (C-n), -1 for previous line (C-p)
    if (el.tagName !== "TEXTAREA") return;
    const v = getValue(el);
    const [s, e] = selectionRange(el);
    const pos = e; // caret toward end of selection
    const [lineStart, lineEnd] = lineBounds(el, pos);
    const col = pos - lineStart;

    if (direction > 0) {
      // Next line start = char after current lineEnd (i.e., skip newline if any)
      const nextStart =
        v.indexOf("\n", lineEnd) === lineEnd
          ? lineEnd + 1
          : lineEnd + (v[lineEnd] === "\n" ? 1 : 0);
      if (nextStart <= v.length - 1) {
        const [, nextEnd] = lineBounds(el, nextStart);
        const nextPos = Math.min(nextStart + col, nextEnd);
        setSelection(el, nextPos);
      }
    } else {
      // Previous line: find previous line start, then previous line start again to get its start/end
      const prevNL = v.lastIndexOf("\n", Math.max(0, lineStart - 2));
      const prevStart = prevNL === -1 ? 0 : prevNL + 1;
      const prevEnd = lineStart - 1 >= 0 ? lineStart - 1 : 0;
      if (lineStart > 0) {
        const prevPos = Math.min(prevStart + col, prevEnd);
        setSelection(el, prevPos);
      }
    }
  }

  function handleKeydown(ev) {
    if (ev.defaultPrevented || ev.isComposing) return;
    if (!enabled) return;
    const t = ev.target;
    if (!isEditableTarget(t)) return;

    const key = (ev.key || "").toLowerCase();
    const ctrl = ev.ctrlKey;
    const alt = ev.altKey; // aka Meta on many PC keyboards
    const meta = ev.metaKey; // Command on macOS
    const shift = ev.shiftKey;

    // Do not interfere when Command key is pressed (browser/system shortcuts)
    if (meta) return;

    // Map of handlers. Each returns true if it handled the event.
    let handled = false;

    // Ctrl-based
    if (ctrl && !alt) {
      switch (key) {
        case "a":
          beginningOfLine(t);
          handled = true;
          break;
        case "e":
          endOfLine(t);
          handled = true;
          break;
        case "b":
          backwardChar(t);
          handled = true;
          break;
        case "f":
          forwardChar(t);
          handled = true;
          break;
        case "d":
          deleteCharForward(t);
          handled = true;
          break;
        case "h":
          // Many platforms map C-h -> Backspace in terminals; emulate delete backward
          deleteCharBackward(t);
          handled = true;
          break;
        case "k":
          killToEndOfLine(t);
          handled = true;
          break;
        case "n":
          moveLine(t, +1);
          handled = true;
          break;
        case "p":
          moveLine(t, -1);
          handled = true;
          break;
        default:
          break;
      }
    }

    // Alt-based (Meta)
    if (!handled && alt && !ctrl) {
      switch (key) {
        case "f":
          forwardWord(t);
          handled = true;
          break;
        case "b":
          backwardWord(t);
          handled = true;
          break;
        case "d":
          deleteWordForward(t);
          handled = true;
          break;
        case "backspace":
          deleteWordBackward(t);
          handled = true;
          break;
        default:
          break;
      }
    }

    if (handled) {
      try {
        ev.preventDefault();
      } catch (e) { }
      try {
        ev.stopImmediatePropagation();
      } catch (e) { }
      try {
        ev.stopPropagation();
      } catch (e) { }
      return false;
    }
  }

  // Extra guard: stop keypress/keyup for our combos to avoid UA fallbacks
  function isOurCombo(e) {
    const key = (e.key || "").toLowerCase();
    return (
      (e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        ["a", "e", "b", "f", "d", "k", "n", "p", "h"].includes(key)) ||
      (e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        (["f", "b", "d"].includes(key) || key === "backspace"))
    );
  }
  // Add/remove listeners so toggle truly detaches handlers
  const keydownHandler = (e) => handleKeydown(e);
  const keypressHandler = (e) => {
    if (!enabled) return;
    if (!isEditableTarget(e.target)) return;
    if (!isOurCombo(e)) return;
    try {
      e.preventDefault();
    } catch (err) { }
    try {
      e.stopImmediatePropagation();
    } catch (err) { }
    try {
      e.stopPropagation();
    } catch (err) { }
    return false;
  };
  const keyupHandler = (e) => {
    if (!enabled) return;
    if (!isEditableTarget(e.target)) return;
    if (!isOurCombo(e)) return;
    try {
      e.preventDefault();
    } catch (err) { }
    try {
      e.stopImmediatePropagation();
    } catch (err) { }
    try {
      e.stopPropagation();
    } catch (err) { }
    return false;
  };

  function addListeners() {
    window.addEventListener("keydown", keydownHandler, addOpts);
    window.addEventListener("keypress", keypressHandler, addOpts);
    window.addEventListener("keyup", keyupHandler, addOpts);
  }
  function removeListeners() {
    window.removeEventListener("keydown", keydownHandler, addOpts);
    window.removeEventListener("keypress", keypressHandler, addOpts);
    window.removeEventListener("keyup", keyupHandler, addOpts);
  }

  // Always-on tiny listener for toggling: Ctrl+Alt+/
  function isSlashKey(e) {
    const k = e.key;
    return (
      k === "/" || e.code === "Slash" || e.keyCode === 191 || e.which === 191
    );
  }
  function toggleKeydown(e) {
    if (e.isComposing) return;
    if (e.ctrlKey && e.altKey && !e.metaKey && isSlashKey(e)) {
      try {
        e.preventDefault();
      } catch (_) { }
      try {
        e.stopImmediatePropagation();
      } catch (_) { }
      try {
        e.stopPropagation();
      } catch (_) { }
      enabled = !enabled;
      const target = document.activeElement;
      if (enabled) {
        addListeners();
        showToast("Emacs Keys: On", target);
      } else {
        removeListeners();
        showToast("Emacs Keys: Off", target);
      }
    }
  }

  // Initialize
  addListeners();
  window.addEventListener("keydown", toggleKeydown, addOpts);
})();
