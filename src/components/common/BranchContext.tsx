'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Warehouse, User } from '@/types';
import { initialBranches, initialWarehouses, initialUsers } from '@/lib/seedData';

interface BranchContextType {
  branches: Branch[];
  warehouses: Warehouse[];
  currentBranch: Branch;
  currentWarehouse: Warehouse;
  setCurrentBranchId: (id: string) => void;
  currentUser: User;
  users: User[];
  setCurrentUserId: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [currentBranchId, setCurrentBranchId] = useState<string>(initialBranches[0].id);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<string>(initialUsers[0].id);

  // Fetch updated branches from API if available
  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) setBranches(data.branches);
        if (data.warehouses) setWarehouses(data.warehouses);
      })
      .catch(() => {
        // Fallback to initial seed
      });
  }, []);

  const currentBranch =
    branches.find((b) => b.id === currentBranchId) || branches[0];
  const currentWarehouse =
    warehouses.find((w) => w.branchId === currentBranch.id) || warehouses[0];
  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  return (
    <BranchContext.Provider
      value={{
        branches,
        warehouses,
        currentBranch,
        currentWarehouse,
        setCurrentBranchId,
        currentUser,
        users,
        setCurrentUserId,
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
