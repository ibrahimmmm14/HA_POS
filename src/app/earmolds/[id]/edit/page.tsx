'use client';

import React from 'react';
import { EarmoldOrderForm } from '@/components/earmolds/EarmoldOrderForm';

export default function EditEarmoldPage({ params }: { params: { id: string } }) {
  return <EarmoldOrderForm orderId={params.id} />;
}
