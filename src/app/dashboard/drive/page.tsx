import { redirect } from 'next/navigation';

/** La sezione vive su /drive: il vecchio indirizzo resta come rimando. */
export default function DashboardDriveRedirect() {
  redirect('/drive');
}
