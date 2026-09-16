/**
 * Keep native button tab order while adding non-cycling arrow-key navigation.
 * Result buttons are queried for every key event because searches replace them.
 */
export function handleResultNavigationKeydown(
  event: KeyboardEvent,
  input: HTMLInputElement,
  results: HTMLElement,
): void {
  if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

  const buttons = Array.from(results.querySelectorAll<HTMLButtonElement>('.result-item'));
  if (buttons.length === 0) return;

  const activeElement = input.ownerDocument.activeElement;
  if (activeElement === input) {
    if (event.key === 'ArrowDown') {
      buttons[0]?.focus();
      event.preventDefault();
    }
    return;
  }

  const currentIndex = buttons.indexOf(activeElement as HTMLButtonElement);
  if (currentIndex === -1) return;

  if (event.key === 'ArrowUp') {
    if (currentIndex === 0) {
      input.focus();
    } else {
      buttons[currentIndex - 1]?.focus();
    }
  } else {
    // The last result is a boundary: keep focus there instead of cycling.
    (buttons[currentIndex + 1] ?? buttons[currentIndex])?.focus();
  }
  event.preventDefault();
}

export function enableResultKeyboardNavigation(input: HTMLInputElement, results: HTMLElement): void {
  const handleKeydown = (event: KeyboardEvent): void => {
    handleResultNavigationKeydown(event, input, results);
  };
  input.addEventListener('keydown', handleKeydown);
  results.addEventListener('keydown', handleKeydown);
}
