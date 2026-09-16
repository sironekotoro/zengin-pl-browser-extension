import { describe, expect, it, vi } from 'vitest';
import { handleResultNavigationKeydown } from './resultNavigation';

type FakeFocusable = HTMLElement & {
  click: ReturnType<typeof vi.fn>;
  tabIndex: number;
};

function createHarness(resultCount = 2): {
  input: HTMLInputElement;
  results: HTMLElement;
  buttons: FakeFocusable[];
  focus: (element: HTMLElement) => void;
} {
  const fakeDocument = { activeElement: null as Element | null };
  const focus = (element: HTMLElement): void => {
    fakeDocument.activeElement = element;
  };
  const input = {
    ownerDocument: fakeDocument,
    focus() {
      focus(input as unknown as HTMLElement);
    },
    tabIndex: 0,
  } as unknown as HTMLInputElement;
  const buttons = Array.from({ length: resultCount }, () => {
    const button = {
      ownerDocument: fakeDocument,
      focus() {
        focus(button as unknown as HTMLElement);
      },
      click: vi.fn(),
      tabIndex: 0,
      getAttribute: vi.fn((name: string) => (name === 'aria-pressed' ? 'false' : null)),
    };
    return button as unknown as FakeFocusable;
  });
  const results = {
    querySelectorAll: vi.fn(() => buttons),
  } as unknown as HTMLElement;
  return { input, results, buttons, focus };
}

function keyboardEvent(
  key: string,
  options: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'isComposing' | 'metaKey' | 'shiftKey'>> = {},
): KeyboardEvent {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    isComposing: false,
    metaKey: false,
    shiftKey: false,
    ...options,
    defaultPrevented: false,
    preventDefault() {
      Object.defineProperty(this, 'defaultPrevented', { value: true });
    },
  } as KeyboardEvent;
}

describe('result keyboard navigation', () => {
  it('moves from the input to the first result with ArrowDown', () => {
    const harness = createHarness();
    harness.focus(harness.input);
    const event = keyboardEvent('ArrowDown');

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(harness.input.ownerDocument.activeElement).toBe(harness.buttons[0]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('moves between results with ArrowDown and ArrowUp', () => {
    const harness = createHarness();
    harness.focus(harness.buttons[0]!);
    const down = keyboardEvent('ArrowDown');
    handleResultNavigationKeydown(down, harness.input, harness.results);
    expect(harness.input.ownerDocument.activeElement).toBe(harness.buttons[1]);
    expect(down.defaultPrevented).toBe(true);

    const up = keyboardEvent('ArrowUp');
    handleResultNavigationKeydown(up, harness.input, harness.results);
    expect(harness.input.ownerDocument.activeElement).toBe(harness.buttons[0]);
    expect(up.defaultPrevented).toBe(true);
  });

  it('returns from the first result to the input with ArrowUp', () => {
    const harness = createHarness();
    harness.focus(harness.buttons[0]!);
    const event = keyboardEvent('ArrowUp');

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(harness.input.ownerDocument.activeElement).toBe(harness.input);
    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps focus on the last result with ArrowDown', () => {
    const harness = createHarness();
    harness.focus(harness.buttons[1]!);
    const event = keyboardEvent('ArrowDown');

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(harness.input.ownerDocument.activeElement).toBe(harness.buttons[1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does nothing when ArrowDown is pressed with no results', () => {
    const harness = createHarness(0);
    harness.focus(harness.input);
    const event = keyboardEvent('ArrowDown');

    expect(() => handleResultNavigationKeydown(event, harness.input, harness.results)).not.toThrow();
    expect(harness.input.ownerDocument.activeElement).toBe(harness.input);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ['Tab', false],
    ['Tab', true],
  ])('leaves %s (shift=%s) to native focus navigation', (key, shiftKey) => {
    const harness = createHarness();
    harness.focus(harness.buttons[0]!);
    const event = keyboardEvent(key, { shiftKey });

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(event.defaultPrevented).toBe(false);
    expect(harness.input.ownerDocument.activeElement).toBe(harness.buttons[0]);
    expect(harness.buttons.every((button) => button.tabIndex === 0)).toBe(true);
  });

  it.each([
    ['IME composition', { isComposing: true }],
    ['Alt', { altKey: true }],
    ['Control', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
  ])('does not intercept ArrowDown during %s', (_label, options) => {
    const harness = createHarness();
    harness.focus(harness.input);
    const event = keyboardEvent('ArrowDown', options);

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(event.defaultPrevented).toBe(false);
    expect(harness.input.ownerDocument.activeElement).toBe(harness.input);
  });
});

describe('native result activation', () => {
  it.each(['Enter', ' '])('does not synthesize or prevent a click for %j', (key) => {
    const harness = createHarness();
    const selectedButton = harness.buttons[0]!;
    harness.focus(selectedButton);
    const event = keyboardEvent(key);

    handleResultNavigationKeydown(event, harness.input, harness.results);

    expect(event.defaultPrevented).toBe(false);
    expect(selectedButton.click).not.toHaveBeenCalled();
    expect(selectedButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('moves focus without changing the selected state', () => {
    const harness = createHarness();
    harness.focus(harness.input);

    handleResultNavigationKeydown(keyboardEvent('ArrowDown'), harness.input, harness.results);

    expect(harness.buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(harness.buttons[1]!.getAttribute('aria-pressed')).toBe('false');
  });
});
