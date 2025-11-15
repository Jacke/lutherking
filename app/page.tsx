import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">Добро пожаловать в ORATOR!</h1>
      <Link href="/dashboard" className="text-blue-600 underline">
        Перейти в дашборд
      </Link>
    </main>
  );
} 