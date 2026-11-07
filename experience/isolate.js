// Makes everything on the page except `keep` inert (unfocusable, hidden from
// assistive tech) — the modal behaviour that aria-modal only announces.
// Returns a function that restores the previous state.

export function isolate(keep) {
    const touched = [];
    for (const el of document.body.children) {
        if (el === keep || el.contains(keep) || el.tagName === 'SCRIPT' || el.inert) continue;
        el.inert = true;
        touched.push(el);
    }
    return () => touched.forEach(el => { el.inert = false; });
}
