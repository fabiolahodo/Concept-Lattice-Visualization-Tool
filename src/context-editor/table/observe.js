// Observers related to the Grid.js table

// Re-run a callback whenever pagination DOM changes (page switch)
export function watchPagination(tableSelector, onChange) {
  const root = document.querySelector(tableSelector);
  const pager = root?.querySelector(".gridjs-pagination");
  if (!pager) return;
  const mo = new MutationObserver(() => onChange());
  mo.observe(pager, { childList: true, subtree: true });
  root._pagerObserver = mo; // keep a handle if you need to disconnect later
}

// Re-run on container resize (useful when sidebars open/close)
export function watchResize(tableSelector, onResize) {
  const root = document.querySelector(tableSelector);
  if (!root) return;
  const ro = new ResizeObserver(() => onResize());
  const wrapper = root.querySelector(".gridjs-wrapper") || root;
  ro.observe(wrapper);
  root._resizeObserver = ro;
}
