import { redirect } from 'next/navigation';

// Now a popup inside the Inventory screen
export default function Page() {
  redirect('/inventory');
}
