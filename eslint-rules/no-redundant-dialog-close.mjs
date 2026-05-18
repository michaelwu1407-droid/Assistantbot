/**
 * Custom ESLint rule: no-redundant-dialog-close.
 *
 * The shadcn/Radix Dialog primitive at components/ui/dialog.tsx already
 * renders an absolutely-positioned close X inside every DialogContent.
 * If a caller adds its OWN close button inside the dialog body, the
 * dialog ships with two close affordances — confusing UX, and the kind
 * of bug you only catch in production via a screenshot.
 *
 * This rule scans for any JSXElement whose opening tag is "DialogContent"
 * (or "Dialog") and walks its descendants for any element that looks
 * like a hand-rolled close button:
 *   - <DialogClose>…</DialogClose>           — Radix close primitive
 *   - <button aria-label="Close">…</button>  — manual button
 *   - <button> wrapping a <X /> lucide icon  — manual button by shape
 *
 * If you genuinely need an extra close affordance (rare — a header
 * back button, say) suppress with eslint-disable-next-line on the
 * relevant element, and label the button something other than "Close".
 */

const CLOSE_LABEL_RE = /^close$/i;
// Only check DialogContent — Dialog is the outer wrapper that always
// holds a DialogContent, so checking both would double-report.
const DIALOG_HOSTS = new Set(["DialogContent"]);

function getJSXName(node) {
  if (!node) return null;
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") return getJSXName(node.property);
  return null;
}

function getAttrValue(attr) {
  if (!attr || attr.type !== "JSXAttribute") return null;
  const v = attr.value;
  if (!v) return null;
  if (v.type === "Literal") return v.value;
  if (v.type === "JSXExpressionContainer" && v.expression?.type === "Literal") return v.expression.value;
  return null;
}

function elementHasAttr(openingElement, name, predicate) {
  const attr = openingElement.attributes?.find(
    (a) => a.type === "JSXAttribute" && a.name?.name === name,
  );
  if (!attr) return false;
  const v = getAttrValue(attr);
  return typeof v === "string" && predicate(v);
}

function isManualClose(node) {
  if (!node || node.type !== "JSXElement") return false;
  const name = getJSXName(node.openingElement.name);

  if (name === "DialogClose") return true;

  if (name === "button" || name === "Button") {
    if (elementHasAttr(node.openingElement, "aria-label", (v) => CLOSE_LABEL_RE.test(v))) {
      return true;
    }
    // <button> ... <X ... /> ... </button>  — lucide X icon inside a button.
    for (const child of node.children || []) {
      if (child.type !== "JSXElement") continue;
      const childName = getJSXName(child.openingElement.name);
      if (childName === "X" && (node.children?.length === 1 || child.children?.length === 0)) {
        return true;
      }
    }
  }
  return false;
}

function walk(node, visit) {
  if (!node || badStopper(node)) return;
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

function badStopper(node) {
  return !node || typeof node !== "object";
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow caller-side close buttons inside Dialog/DialogContent. The Dialog primitive already renders its own close X; a second one ships two close affordances stacked at the same screen position.",
    },
    schema: [],
    messages: {
      redundantClose:
        "{{ host }} already includes a close button via the Dialog primitive at components/ui/dialog.tsx. Remove this duplicate close affordance (or label it something other than 'Close' and add eslint-disable-next-line no-redundant-dialog-close if it genuinely is an intentional second control).",
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const name = getJSXName(node.openingElement.name);
        if (!DIALOG_HOSTS.has(name)) return;

        let offender = null;
        walk(node, (descendant) => {
          if (offender) return;
          if (descendant === node) return;
          if (isManualClose(descendant)) {
            offender = descendant;
          }
        });

        if (offender) {
          context.report({
            node: offender,
            messageId: "redundantClose",
            data: { host: name },
          });
        }
      },
    };
  },
};
