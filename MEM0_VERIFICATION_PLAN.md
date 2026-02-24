# Mem0 Integration Verification Plan

## Overview
This document provides testing procedures to verify the Mem0 long-term memory integration for Travis (Earlymark AI Assistant).

## Prerequisites
- Ensure `MEM0_API_KEY` is set in your `.env.local` file
- The application should be running (`npm run dev`)
- API endpoint: `http://localhost:3000/api/chat`

---

## Test 1: Store a Memory (The Learning)

**Objective:** Verify that Travis can learn and store user preferences.

### Curl Command
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "My hourly rate is $100"
      }
    ],
    "workspaceId": "workspace_123"
  }'
```

### Expected Console Output
```
[Mem0] Starting memory recall for workspace: workspace_123
[Mem0] User ID: user_123
[Mem0] Last message: "My hourly rate is $100..."
[Mem0] Searching for relevant memories...
[Mem0] Found 0 memories
[Mem0] No relevant memories found
[Mem0] Memory context prepared, proceeding to stream generation
[Mem0] Starting memory storage...
[Mem0] Successfully saved interaction
```

### Success Criteria
- ✅ Console shows `[Mem0] Successfully saved interaction`
- ✅ No errors in the console
- ✅ Response streams successfully

---

## Test 2: Retrieve a Memory (The Recall)

**Objective:** Verify that Travis can recall previously stored information.

### Curl Command
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is my hourly rate?"
      }
    ],
    "workspaceId": "workspace_123"
  }'
```

### Expected Console Output
```
[Mem0] Starting memory recall for workspace: workspace_123
[Mem0] User ID: user_123
[Mem0] Last message: "What is my hourly rate?..."
[Mem0] Searching for relevant memories...
[Mem0] Found 1 memories
[Mem0] Memory 1: My hourly rate is $100
[Mem0] Memory context prepared, proceeding to stream generation
[Mem0] Starting memory storage...
```

### Success Criteria
- ✅ Console shows `[Mem0] Found X memories` (where X > 0)
- ✅ Memory content is displayed in console
- ✅ Travis responds with the correct hourly rate ($100)
- ✅ Response includes context from previous conversation

---

## Test 3: Multiple Memories Context

**Objective:** Verify that Travis can handle multiple stored facts.

### Step 3a: Store Multiple Facts
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I prefer working in the eastern suburbs"
      }
    ],
    "workspaceId": "workspace_123"
  }'
```

### Step 3b: Query with Multiple Memories
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What are my preferences for jobs?"
      }
    ],
    "workspaceId": "workspace_123"
  }'
```

### Expected Console Output
```
[Mem0] Found 2 memories
[Mem0] Memory 1: My hourly rate is $100
[Mem0] Memory 2: I prefer working in the eastern suburbs
```

---

## Test 4: Different User Isolation

**Objective:** Verify that memories are isolated per user.

### Curl Command (Different User)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_456" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is my hourly rate?"
      }
    ],
    "workspaceId": "workspace_456"
  }'
```

### Expected Console Output
```
[Mem0] Starting memory recall for workspace: workspace_456
[Mem0] User ID: user_456
[Mem0] Found 0 memories
[Mem0] No relevant memories found
```

### Success Criteria
- ✅ No memories found for different user
- ✅ User isolation is working correctly

---

## Debugging & Troubleshooting

### Where to Look for Logs

1. **Vercel Console (Production)**
   - Go to your Vercel dashboard
   - Select your project
   - Click "Logs" tab
   - Filter by function: `api/chat`

2. **Local Console (Development)**
   - Look at your terminal running `npm run dev`
   - Logs appear in real-time as requests come in

### Key Log Patterns

| Log Pattern | Meaning |
|------------|---------|
| `[Mem0] Starting memory recall...` | Beginning of memory search phase |
| `[Mem0] Found X memories` | Successfully retrieved X memories |
| `[Mem0] Memory N: [content]` | Individual memory content |
| `[Mem0] Successfully saved interaction` | Memory storage completed |
| `[Mem0] Error searching memories` | Memory retrieval failed |
| `[Mem0] Error saving interaction` | Memory storage failed |

### Common Issues

**Issue 1: `MEM0_API_KEY not found`**
```
Error: MEM0_API_KEY is required
```
**Solution:** Add `MEM0_API_KEY=your_key_here` to `.env.local`

**Issue 2: No memories found**
```
[Mem0] Found 0 memories
```
**Solution:** This is normal for first-time users. Run Test 1 first to store a memory.

**Issue 3: Memory storage timeout**
```
[Mem0] Error saving interaction: [TimeoutError]
```
**Solution:** Memory storage is non-blocking. The response will still return to the user.

---

## Integration Summary

### What Was Implemented

1. **The Recall (Pre-Generation)**
   - Searches Mem0 for relevant memories before generating response
   - Injects memory context into system prompt
   - Includes up to 5 most relevant memories

2. **The Learning (Post-Generation)**
   - Stores user-assistant interaction in Mem0
   - Non-blocking operation (doesn't delay response)
   - Includes metadata (timestamp, source, workspaceId)

3. **Debugging & Visibility**
   - Comprehensive console logging
   - Clear memory operation indicators
   - Error handling with graceful fallbacks

### Files Modified
- `app/api/chat/route.ts` - Main chat endpoint with Mem0 integration
- `package.json` - Added `mem0ai` dependency

### Environment Variables Required
```env
MEM0_API_KEY=your_mem0_api_key_here
```

---

## Next Steps

1. **Get Mem0 API Key:**
   - Sign up at https://mem0.ai
   - Create a new project
   - Copy the API key

2. **Configure Environment:**
   - Add `MEM0_API_KEY` to `.env.local`
   - Restart development server

3. **Run Tests:**
   - Execute the curl commands above
   - Verify console logs show expected output
   - Confirm Travis recalls information correctly

4. **Production Deployment:**
   - Add `MEM0_API_KEY` to Vercel environment variables
   - Deploy and monitor logs

---

## Support

For issues with Mem0 integration:
- Check Mem0 documentation: https://docs.mem0.ai
- Verify API key is valid
- Check Vercel logs for detailed error messages
