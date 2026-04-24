const EDITABLE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '.ant-input',
  '.ant-input-number',
  '.ant-input-number-input',
  '.ant-select',
  '.ant-select-selector',
  '.ant-picker',
  '[data-editor-text-input="true"]',
].join(', ');

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  return !!element.closest(EDITABLE_SELECTOR);
}

export function isTextEditingEventTarget(target: EventTarget | null): boolean {
  return target instanceof Element && isEditableElement(target);
}

export function isTextEditingActive(target?: EventTarget | null): boolean {
  if (isTextEditingEventTarget(target ?? null)) {
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  return isEditableElement(document.activeElement);
}
