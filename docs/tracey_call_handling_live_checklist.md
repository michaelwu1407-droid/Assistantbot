# Tracey Call Handling Live Checklist

Use this checklist when verifying the three Tracey call-handling modes on a real phone and a real Tracey number.

## Preconditions

- Workspace has a provisioned Tracey number.
- Owner personal mobile is set.
- A real mobile handset is available for the owner.
- The handset can open `tel:` links.
- You can place a real inbound test call to the business number.

## Backup AI

Expected product meaning:
- Your phone rings first.
- Tracey only answers if you do not.

In-app checks:
- Select `Backup AI`.
- Confirm the UI shows `Backup AI pickup timing`.
- Confirm the primary next step says `turn on Backup AI from your phone`.
- Confirm the setup-text CTA is visible and says `Text me backup setup steps`.

Device checks:
- Tap the primary dialer action.
- Confirm the phone opens a no-answer forwarding code, not full forwarding.
- Optionally send the setup text and confirm it arrives with a clickable settings URL.

Live call checks:
- Place a test call to the business number.
- Confirm the owner phone rings first.
- Let it ring past the configured delay.
- Confirm Tracey answers after the missed ring window.
- Repeat and answer immediately on the owner phone.
- Confirm Tracey does not intercept that answered call.

## 100% AI

Expected product meaning:
- Tracey answers every call before the owner phone rings.

In-app checks:
- Select `100% AI`.
- Confirm the primary next step says `forward every call to Tracey`.
- Confirm the setup-text CTA is visible and says `Text me full AI setup steps`.

Device checks:
- Tap the primary dialer action.
- Confirm the phone opens the full forwarding code.
- Optionally send the setup text and confirm it arrives with a clickable settings URL.

Live call checks:
- Place a test call to the business number.
- Confirm the owner phone does not ring first.
- Confirm Tracey answers the call directly.

## Forwarding Off

Expected product meaning:
- Calls stay on the owner phone.
- Tracey does not answer them.

In-app checks:
- Select `Forwarding off`.
- Confirm the primary next step says `turn forwarding off on your phone`.
- Confirm the setup-text CTA is not shown.

Device checks:
- Tap the primary dialer action.
- Confirm the phone opens the forwarding-off code.

Live call checks:
- Place a test call to the business number.
- Confirm the owner phone receives the call normally.
- Confirm Tracey does not answer.

## Failure checks

- Remove the personal mobile and confirm setup-text CTA is disabled or errors clearly.
- Test without a provisioned Tracey number and confirm mode actions are blocked with clear copy.
- Confirm the app still lets the user switch modes even if they have not yet tapped the dialer code, but the next step remains obvious.

## Sign-off criteria

Treat a mode as fully verified only when all of these are true:

- The mode can be selected and saved in the settings UI.
- The next step shown in the UI is specific to that mode.
- The dialer code opened on the real device matches the intended behavior.
- The live inbound call behavior matches the product promise.
- The setup text, if available for that mode, arrives and contains a working settings link.
