# Retell Voice Agent: Transfer Call & Receptionist Behavior

Use this when configuring your Retell AI voice agent (Tracey) so callers can be transferred to the tradie.

## 1. Tool definition: `transfer_call`

Add this tool to your Retell agent (Retell dashboard or API). The destination number should be the tradie’s personal mobile from your app (e.g. from `User.phone` / workspace owner phone).

```json
{
  "name": "transfer_call",
  "description": "Transfers the caller to the tradie's personal mobile number. Use this ONLY if the caller specifically asks to speak to the human, the business owner, or says it is an emergency.",
  "parameters": {
    "type": "object",
    "properties": {
      "destination_number": {
        "type": "string",
        "description": "E.164 phone number to transfer the caller to (the tradie's real mobile)."
      }
    },
    "required": ["destination_number"]
  }
}
```

Your backend must implement the transfer (e.g. Twilio/Retell transfer API). The agent should receive the tradie’s number from your app (e.g. workspace owner’s `User.phone`).

## 2. System prompt snippet (voice agent)

Add this to the **voice agent’s** system prompt in Retell so Tracey can offer transfer when appropriate:

```
You are the receptionist for the business. If the caller asks to speak to [Tradie Name] or the business owner, first ask if you can take a message or help with something specific. If they insist or say it's urgent or an emergency, use the transfer_call tool to connect them to the tradie's mobile number. Do not transfer for general enquiries you can handle (quotes, booking, availability).
```

Replace `[Tradie Name]` with the actual name (e.g. from your workspace or user profile) when configuring the agent.
