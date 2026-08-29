/** iOS UIPickerView: list scrolls; gray slot stays centered; snap to row. */

const ITEM_H = 48;

export function mountWheel(el, { onChange } = {}) {
  const items = () => [...el.querySelectorAll(".wheel-item")];

  function pad() {
    return Math.max(0, (el.clientHeight - ITEM_H) / 2);
  }

  function layoutPads() {
    const h = `${pad()}px`;
    el.querySelectorAll(".wheel-pad").forEach((p) => {
      p.style.height = h;
    });
  }

  function indexFromScroll() {
    const list = items();
    const i = Math.round(el.scrollTop / ITEM_H);
    return Math.max(0, Math.min(list.length - 1, i));
  }

  function scrollToIndex(i, smooth) {
    const list = items();
    const idx = Math.max(0, Math.min(list.length - 1, i));
    el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? "smooth" : "auto" });
    return list[idx];
  }

  function paintCenter() {
    const list = items();
    const i = indexFromScroll();
    list.forEach((row, j) => row.classList.toggle("on", j === i));
    return list[i];
  }

  layoutPads();
  const selected = el.querySelector(".wheel-item.on");
  const startIdx = selected ? items().indexOf(selected) : 0;
  scrollToIndex(startIdx, false);
  paintCenter();

  let drag = null;
  let snapTimer = 0;
  let ignoreClick = false;
  let snapTarget = null;

  function emit(row) {
    if (row?.dataset.id) onChange?.(row.dataset.id);
  }

  function settle() {
    const i = indexFromScroll();
    const target = i * ITEM_H;
    if (Math.abs(el.scrollTop - target) < 1) {
      snapTarget = null;
      emit(paintCenter());
      return;
    }
    snapTarget = target;
    el.scrollTo({ top: target, behavior: "smooth" });
  }

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    snapTarget = null;
    drag = { id: e.pointerId, y: e.clientY, top: el.scrollTop, moved: false };
    el.classList.add("dragging");
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  });

  el.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 3) drag.moved = true;
      el.scrollTop = drag.top - dy;
      paintCenter();
      e.preventDefault();
    },
    { passive: false },
  );

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const moved = drag.moved;
    drag = null;
    el.classList.remove("dragging");
    if (moved) {
      ignoreClick = true;
      setTimeout(() => {
        ignoreClick = false;
      }, 400);
      settle();
    }
  }

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);

  el.addEventListener("scroll", () => {
    paintCenter();
    if (drag) return;
    if (snapTarget != null) {
      if (Math.abs(el.scrollTop - snapTarget) < 1.5) {
        snapTarget = null;
        emit(paintCenter());
      }
      return;
    }
    clearTimeout(snapTimer);
    snapTimer = setTimeout(settle, 90);
  });

  el.querySelectorAll(".wheel-item").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (ignoreClick || drag?.moved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const i = items().indexOf(row);
      snapTarget = i * ITEM_H;
      scrollToIndex(i, true);
    });
  });

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      const i = indexFromScroll();
      layoutPads();
      scrollToIndex(i, false);
    });
    ro.observe(el);
  }

  return { layoutPads, scrollToIndex };
}
