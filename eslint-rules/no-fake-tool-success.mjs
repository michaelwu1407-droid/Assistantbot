/**
 * Custom ESLint rule: no-fake-tool-success.
 *
 * Catches the bug class behind the original "call Michael" incident:
 * an AI agent tool (exported async function whose name starts with `run`)
 * returns a friendly success string ("📞 Calling…", "Sent", "Booked")
 * without ever invoking the external client that would do the work.
 *
 * Heuristic — we accept some false-positives in exchange for catching
 * the pattern at PR time. Override with eslint-disable-next-line when
 * the success copy is intentional (e.g. queueing a job that the cron
 * actually performs).
 *
 * Triggers: function body contains a ReturnStatement whose value
 * matches SUCCESS_COPY_PATTERN.
 * Excuses: function body contains a CallExpression matching any
 * EXTERNAL_CLIENT_PATTERN — i.e. it really does invoke an external
 * service (Twilio, Resend, Stripe, LiveKit, our outbound-call helper,
 * etc.) before returning the success copy.
 */

const SUCCESS_COPY_PATTERN = /📞|📲|✉️|📧|✅|^Sent\b|^Sending\b|^Calling\b|^Email sent\b|^SMS sent\b|^Booked\b|^Scheduled\b/i;

const EXTERNAL_CLIENT_HINTS = [
  // Genuine outbound integrations
  "twilioClient",
  "twilio.messages",
  "resend.emails",
  "stripe.",
  "initiateOutboundCall",
  "sendSMS",
  "sendEmail",
  "sendWhatsApp",
  "sendViaTwilio",
  "sendNotification",
  "createSipParticipant",
  "googleClient",
  "fetch(",
  // Internal helpers that still perform real work
  "createTask",
  "createNotification",
  "createDeal",
  "createContact",
  "createSupportTicket",
  "issueInvoice",
  "markInvoicePaid",
  "rejectDraft",
  "generateQuote",
  "completeTask",
  "deleteTask",
  "updateJobStatus",
  "createQuoteVariation",
  "updateDealStage",
  "updateDealMetadata",
  "updateDealAssignedTo",
  "appendTicketNote",
  // Direct DB writes
  "db.",
];

function functionInvokesExternalClient(node, sourceCode) {
  const text = sourceCode.getText(node);
  return EXTERNAL_CLIENT_HINTS.some((hint) => text.includes(hint));
}

function isExportedRunFunction(node) {
  if (node.type !== "FunctionDeclaration" && node.type !== "FunctionExpression") return false;
  if (!node.async) return false;
  const name = node.id?.name || node.parent?.id?.name || "";
  return /^run[A-Z]/.test(name);
}

function literalLooksLikeSuccess(literal) {
  if (typeof literal.value !== "string") return false;
  return SUCCESS_COPY_PATTERN.test(literal.value);
}

function templateLooksLikeSuccess(template) {
  const firstQuasi = template.quasis?.[0]?.value?.cooked || "";
  return SUCCESS_COPY_PATTERN.test(firstQuasi);
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Flag AI agent tools whose function body returns a success-shaped string without invoking any external client.",
    },
    schema: [],
    messages: {
      noFakeSuccess:
        "{{ name }} returns success-styled copy ({{ snippet }}) but does not appear to invoke any external client (Twilio, Resend, Stripe, LiveKit, initiateOutboundCall, sendSMS/sendEmail). If this tool really does perform the action, add the missing call. If it intentionally only logs, change the copy to reflect that. Or add eslint-disable-next-line no-fake-tool-success if the success path is actually delegated elsewhere.",
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkFunction(fnNode, displayName) {
      if (functionInvokesExternalClient(fnNode, sourceCode)) return;

      let badLiteral = null;
      const visit = (node) => {
        if (!node || badLiteral) return;
        if (node.type === "ReturnStatement" && node.argument) {
          if (node.argument.type === "Literal" && literalLooksLikeSuccess(node.argument)) {
            badLiteral = node.argument;
          } else if (node.argument.type === "TemplateLiteral" && templateLooksLikeSuccess(node.argument)) {
            badLiteral = node.argument;
          }
        }
        for (const key of Object.keys(node)) {
          if (key === "parent" || key === "loc" || key === "range") continue;
          const value = node[key];
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === "object" && typeof value.type === "string") visit(value);
        }
      };
      visit(fnNode.body);

      if (badLiteral) {
        const snippet = sourceCode.getText(badLiteral).slice(0, 60).replace(/\s+/g, " ");
        context.report({
          node: badLiteral,
          messageId: "noFakeSuccess",
          data: { name: displayName, snippet },
        });
      }
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration?.type === "FunctionDeclaration" && isExportedRunFunction(node.declaration)) {
          checkFunction(node.declaration, node.declaration.id.name);
        }
        if (node.declaration?.type === "VariableDeclaration") {
          for (const decl of node.declaration.declarations) {
            const init = decl.init;
            if (
              (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression") &&
              init.async &&
              /^run[A-Z]/.test(decl.id.name || "")
            ) {
              checkFunction(init, decl.id.name);
            }
          }
        }
      },
    };
  },
};
