function execCommandCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const prevRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }

  document.body.removeChild(textarea);

  if (prevRange && selection) {
    selection.removeAllRanges();
    selection.addRange(prevRange);
  }

  return succeeded;
}

/**
 * Copies text to the clipboard reliably across top-level tabs, mobile browsers,
 * and sandboxed iframes where navigator.clipboard.writeText may be blocked.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const isInIframe = (() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // Inside iframes, try synchronous execCommand('copy') first while the user click gesture is active
  if (isInIframe && execCommandCopy(text)) {
    return true;
  }

  // Try modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  // Fallback for non-iframe browsers without Async Clipboard API
  if (!isInIframe && execCommandCopy(text)) {
    return true;
  }

  return false;
}
