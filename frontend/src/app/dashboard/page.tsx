import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="container">
      <div className="content">
        <h1>Attendance Management System</h1>
        <p>Dashboard here</p>
        <p><Link href="/">Back to Top</Link></p>
      </div>
    </div>
  );
}