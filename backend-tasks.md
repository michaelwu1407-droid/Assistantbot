# Backend Development Tasks - Handoff

The frontend implementation for Global Search, Settings, and Notifications is complete. The following tasks need to be addressed by the Backend AI / Aider to enable persistence and real data flow.

## 1. Global Search
- **Action**: `actions/search-actions.ts` -> `globalSearch`
- **Current State**: `SearchDialog` uses this action, which currently performs an in-memory fuzzy search of fetched contacts, deals, and tasks.
- **Requirement**: 
  - Ensure this scales reasonably (e.g., limit initial fetch or use distinct DB `contains` queries).
  - Verify that the returned `url` property correctly maps to existing pages (e.g., `/dashboard/deals/[id]`).

## 2. Settings - Profile
- **Action**: Need `updateProfile` in `actions/auth-actions.ts` (or similar).
- **Current State**: `profile-form.tsx` is built but does NOT call any server action on submit.
- **Requirement**:
  - Create/Expose a server action `updateUserProfile({ userId, name, email, bio, urls })`.
  - Update `app/dashboard/settings/profile-form.tsx` to consume this action.

## 3. Settings - Workspace
- **Action**: `actions/workspace-actions.ts` -> `updateWorkspace`
- **Current State**: `workspace-form.tsx` is now wired to call `updateWorkspace`.
- **Requirement**:
  - Verify `updateWorkspace` correctly updates the DB and revalidates the cache.
  - Implement fetching of initial data for the form so fields aren't blank.

## 4. Notifications
- **Action**: `actions/notification-actions.ts` -> `getNotifications`, `markAsRead`, `markAllAsRead`
- **Current State**: `notification-feed.tsx` is wired to fetch data on mount.
- **Requirement**:
  - Ensure `getNotifications(userId)` returns real data from the DB.
  - Implement a mechanism to **create** notifications from other system events (e.g., when a Job status changes to 'Travel', create a notification for the Agent).

## 5. Onboarding Persistence
- **Action**: `actions/auth-actions.ts` or `workspace-actions.ts`
- **Current State**: `OnboardingModal` currently uses `localStorage`.
- **Requirement**:
  - Add `hasOnboarded` boolean to user/profile schema.
  - Create action `completeOnboarding(userId)` to set this flag.
  - Update `OnboardingModal` to call this action instead of setting localStorage.
