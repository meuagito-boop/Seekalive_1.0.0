export function getTabKeyboardIndex(key: string, currentIndex: number, tabCount: number): number | null {
  if (tabCount < 1) return null;
  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % tabCount;
    case "ArrowLeft":
      return (currentIndex - 1 + tabCount) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return null;
  }
}

export function handleTabKeyDown(
  event: { key: string; preventDefault: () => void; currentTarget: HTMLButtonElement },
  currentIndex: number,
  tabCount: number,
  activate: (index: number) => void,
) {
  const nextIndex = getTabKeyboardIndex(event.key, currentIndex, tabCount);
  if (nextIndex === null) return;

  event.preventDefault();
  activate(nextIndex);
  const tabs = event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  tabs?.[nextIndex]?.focus();
}
