'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Branch, Warehouse, User } from '@/types';
import { initialBranches, initialWarehouses } from '@/lib/seedData';
import { Permission } from '@/lib/permissions';

export interface SessionUser extends User {
  permissions: Permission[];
  mustChangePassword: boolean;
}

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

// Used only while nobody is signed in (the app shell shows no pages in that state)
const NOBODY: User = {
  id: '',
  username: '',
  nameAr: '',
  nameEn: '',
  role: 'cashier',
  branchIds: [],
  currentBranchId: '',
};

interface BranchContextType {
  branches: Branch[];
  warehouses: Warehouse[];
  currentBranch: Branch;
  currentWarehouse: Warehouse;
  setCurrentBranchId: (id: string) => void;
  /** Branches the signed-in user may switch to (all of them for a system administrator) */
  selectableBranches: Branch[];
  currentUser: User;
  authStatus: AuthStatus;
  session: SessionUser | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  logout: () => Promise<void>;
  /** Re-read who is signed in (call after signing in or changing own details) */
  refreshSession: () => Promise<void>;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [currentBranchId, setCurrentBranchId] = useState<string>(initialBranches[0].id);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  // Who is signed in (also extends the session and picks up permission changes)
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        setSession(null);
        setAuthStatus('signedOut');
        return;
      }
      const data = await res.json();
      setSession(data.user);
      setAuthStatus('signedIn');
    } catch {
      // Network problem: keep whatever state we had rather than signing the user out
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const timer = setInterval(refreshSession, 5 * 60 * 1000);
    const onFocus = () => refreshSession();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshSession]);

  // Any API call answered with "not signed in" (e.g. the session expired or the account was disabled)
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : String(args[0]);
      if (res.status === 401 && url.includes('/api/') && !url.includes('/api/auth/')) {
        setSession(null);
        setAuthStatus('signedOut');
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setSession(null);
      setAuthStatus('signedOut');
    }
  }, []);

  // Fetch updated branches from API if available
  const refreshBranches = () =>
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) setBranches(data.branches);
        if (data.warehouses) setWarehouses(data.warehouses);
      })
      .catch(() => {
        // Fallback to initial seed
      });

  useEffect(() => {
    if (authStatus === 'signedIn') refreshBranches();
  }, [authStatus]);

  const selectableBranches =
    !session || session.role === 'super_admin'
      ? branches
      : branches.filter((b) => session.branchIds.includes(b.id));

  // Start on the user's own branch once we know who they are
  useEffect(() => {
    if (session && selectableBranches.length > 0 && !selectableBranches.some((b) => b.id === currentBranchId)) {
      setCurrentBranchId(
        selectableBranches.find((b) => b.id === session.currentBranchId)?.id ?? selectableBranches[0].id
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, branches]);

  const currentBranch =
    branches.find((b) => b.id === currentBranchId) || branches[0];
  const currentWarehouse =
    warehouses.find((w) => w.branchId === currentBranch.id) || warehouses[0];
  const currentUser: User = session ?? NOBODY;
  const permissions: Permission[] = session?.permissions ?? [];
  const can = (permission: Permission) => permissions.includes(permission);

  return (
    <BranchContext.Provider
      value={{
        branches,
        warehouses,
        currentBranch,
        currentWarehouse,
        setCurrentBranchId,
        selectableBranches,
        currentUser,
        authStatus,
        session,
        permissions,
        can,
        logout,
        refreshSession,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
