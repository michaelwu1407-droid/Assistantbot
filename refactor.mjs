import fs from 'fs';

let content = fs.readFileSync('app/api/chat/route.ts', 'utf-8');

// normalize first
content = content.replace(/\r\n/g, '\n');

// 1. replace imports
const oldImports = `import { streamText, convertToModelMessages, tool, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { MemoryClient } from "mem0ai";
import {
  runMoveDeal,
  runListDeals,
  runCreateDeal,
  runCreateJobNatural,
  runProposeReschedule,
  saveUserMessage,
  runUpdateInvoiceAmount,
  runUpdateAiPreferences,
  runLogActivity,
  runCreateTask,
  runSearchContacts,
  runCreateContact,
  runSendSms,
  runSendEmail,
  runMakeCall,
  runGetConversationHistory,
  runCreateScheduledNotification,
  runUndoLastAction,
  runAssignTeamMember,
  handleSupportRequest,
  runAppendTicketNote,
  recordManualRevenue,
} from "@/actions/chat-actions";
import {
  runGetSchedule,
  runSearchJobHistory,
  runGetFinancialReport,
  runGetClientContext,
  runGetTodaySummary,
  runGetAvailability,
} from "@/actions/agent-tools";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { buildJobDraftFromParams } from "@/lib/chat-utils";
import { parseJobWithAI, parseMultipleJobsWithAI, extractAllJobsFromParagraph } from "@/lib/ai/job-parser";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { appendTicketNote } from "@/actions/activity-actions";`;

const newImports = `import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { saveUserMessage, appendTicketNote } from "@/actions/chat-actions";
import { getDeals } from "@/actions/deal-actions";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { buildJobDraftFromParams } from "@/lib/chat-utils";
import { parseJobWithAI, parseMultipleJobsWithAI, extractAllJobsFromParagraph } from "@/lib/ai/job-parser";
import { buildAgentContext, fetchMemoryContext, getMemoryClient } from "@/lib/ai/context";
import { getAgentTools } from "@/lib/ai/tools";`;

content = content.replace(oldImports.replace(/\r\n/g, '\n'), newImports);

// 2. replace mem0
content = content.replace(/\/\/ Lazy initialization of Mem0 Memory Client[\s\S]+?return memoryClient;\n}/, '');

// 3. replace context builder cleanly using indexOf
const startStr = `    const settings = await getWorkspaceSettingsById(workspaceId);

    // Resolve current user's role in this workspace (for data-correction / manager-only rules)
    let userRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" = "TEAM_MEMBER";`;

const endStr = `    console.log(\`[Mem0] Memory context prepared, proceeding to stream generation\`);`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const endTotal = endIndex + endStr.length;
  const replacementContext = `    // Extract user ID from headers or use workspaceId as fallback
    const userId = req.headers.get("x-user-id") || workspaceId;
    const lastUserMessage = messages.filter((m: { role?: string }) => m.role === "user").pop();
    const lastMessageContent = lastUserMessage?.content || "";

    const {
      settings,
      userRole,
      knowledgeBaseStr,
      agentModeStr,
      workingHoursStr,
      agentScriptStr,
      allowedTimesStr,
      preferencesStr,
      pricingRulesStr
    } = await buildAgentContext(workspaceId, userId);

    const memoryContextStr = await fetchMemoryContext(userId, lastMessageContent);`;

  content = content.substring(0, startIndex) + replacementContext + content.substring(endTotal);
} else {
  console.log("Could not find start/end bounds for context builder!");
}

// 4. replace tools block cleanly
const toolsStart = `      tools: {
        listDeals: tool({`;
const toolsEnd = `        }),
      },
      stopWhen: stepCountIs(5),`;

const toolsStartIndex = content.indexOf(toolsStart);
const toolsEndIndex = content.indexOf(toolsEnd, toolsStartIndex);

if (toolsStartIndex !== -1 && toolsEndIndex !== -1) {
  const endTotal = toolsEndIndex + toolsEnd.length;
  const replacementTools = `      tools: getAgentTools(workspaceId, settings, userId),
      stopWhen: stepCountIs(5),`;
  content = content.substring(0, toolsStartIndex) + replacementTools + content.substring(endTotal);
} else {
  console.log("Could not find start/end bounds for tools builder!");
}

// save it
fs.writeFileSync('app/api/chat/route.ts', content);
console.log("Replaced successfully!");
