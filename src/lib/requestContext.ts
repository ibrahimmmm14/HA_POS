import { AsyncLocalStorage } from 'node:async_hooks';

/** Who is making the current API request, so audit entries are attributed to the real user. */
export interface RequestActor {
  userId: string;
  userName: string;
  branchId: string;
}

export const requestActor = new AsyncLocalStorage<RequestActor>();
