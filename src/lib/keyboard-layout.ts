/**
 * Barcode/QR scanners plugged in as USB "keyboard wedge" devices send physical
 * keystrokes, which Windows translates through whatever keyboard layout is
 * currently active. Member codes/barcodes are plain ASCII ("FX3-00001"), but
 * when the active layout is Arabic, the OS maps those same physical keys to
 * Arabic characters before the browser ever sees them — so the scanned text
 * comes out garbled and lookup by code fails, until staff manually switch back
 * to English.
 *
 * `event.code` identifies the physical key itself (e.g. "KeyF", "Digit3") and
 * is layout-independent, unlike `event.key` which is already translated. This
 * maps physical keys to the ASCII character a US layout would have produced,
 * so scanning/typing a code works the same regardless of active OS layout.
 */
const DIGIT_CHARS: Record<string, string> = {
  Digit0: "0", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4",
  Digit5: "5", Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9",
  Numpad0: "0", Numpad1: "1", Numpad2: "2", Numpad3: "3", Numpad4: "4",
  Numpad5: "5", Numpad6: "6", Numpad7: "7", Numpad8: "8", Numpad9: "9",
};

const DIGIT_SHIFT_CHARS: Record<string, string> = {
  Digit1: "!", Digit2: "@", Digit3: "#", Digit4: "$", Digit5: "%",
  Digit6: "^", Digit7: "&", Digit8: "*", Digit9: "(", Digit0: ")",
};

/** Returns the ASCII character a US-QWERTY layout would produce for this keydown, or null if not a character key we handle (Enter, Backspace, Tab, arrows, etc. — let those behave natively). */
export function physicalChar(e: { code: string; shiftKey: boolean }): string | null {
  const { code, shiftKey } = e;

  if (code.startsWith("Key")) {
    const letter = code.slice(3);
    return shiftKey ? letter.toUpperCase() : letter.toLowerCase();
  }
  if (code in DIGIT_CHARS) {
    return shiftKey ? (DIGIT_SHIFT_CHARS[code] ?? DIGIT_CHARS[code]) : DIGIT_CHARS[code];
  }
  if (code === "Minus") return shiftKey ? "_" : "-";
  if (code === "Equal") return shiftKey ? "+" : "=";
  if (code === "Period") return shiftKey ? ">" : ".";
  if (code === "Comma") return shiftKey ? "<" : ",";
  if (code === "Slash") return shiftKey ? "?" : "/";
  if (code === "Space") return " ";

  return null;
}
