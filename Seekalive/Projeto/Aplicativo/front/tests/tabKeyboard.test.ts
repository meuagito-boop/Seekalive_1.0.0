import { test } from "node:test";
import assert from "node:assert/strict";
import { getTabKeyboardIndex, handleTabKeyDown } from "../src/lib/tabKeyboard";

test("tab keyboard navigation wraps horizontally and supports Home/End", () => {
  assert.equal(getTabKeyboardIndex("ArrowRight", 0, 4), 1);
  assert.equal(getTabKeyboardIndex("ArrowRight", 3, 4), 0);
  assert.equal(getTabKeyboardIndex("ArrowLeft", 0, 4), 3);
  assert.equal(getTabKeyboardIndex("ArrowLeft", 2, 4), 1);
  assert.equal(getTabKeyboardIndex("Home", 2, 4), 0);
  assert.equal(getTabKeyboardIndex("End", 1, 4), 3);
});

test("tab keyboard navigation ignores unrelated keys and empty tabsets", () => {
  assert.equal(getTabKeyboardIndex("ArrowUp", 1, 3), null);
  assert.equal(getTabKeyboardIndex("Enter", 1, 3), null);
  assert.equal(getTabKeyboardIndex("ArrowRight", 0, 0), null);
});

test("handled tab keys activate and focus the destination tab", () => {
  const focused: number[] = [];
  const activated: number[] = [];
  let prevented = false;
  const tabs = Array.from({ length: 3 }, (_, index) => ({ focus: () => focused.push(index) }));
  const currentTarget = {
    closest: () => ({ querySelectorAll: () => tabs }),
  } as unknown as HTMLButtonElement;

  handleTabKeyDown({
    key: "End",
    currentTarget,
    preventDefault: () => { prevented = true; },
  }, 0, tabs.length, (index) => activated.push(index));

  assert.equal(prevented, true);
  assert.deepEqual(activated, [2]);
  assert.deepEqual(focused, [2]);
});
