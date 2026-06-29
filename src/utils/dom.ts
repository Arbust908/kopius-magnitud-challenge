export function findElement<TElement extends Element>(root: Element, selector: string): TElement {
  const element = root.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}
