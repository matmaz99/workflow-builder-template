'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserMenu } from '@/components/workflows/user-menu';

interface AppHeaderProps {
  title?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  disableTitleLink?: boolean;
  mobileLayout?: 'single' | 'two-line';
}

export function AppHeader({
  title = 'Workflow Builder',
  showBackButton,
  onBack,
  actions,
  disableTitleLink = false,
  mobileLayout = 'single',
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push('/');
    }
  };

  if (mobileLayout === 'two-line') {
    return (
      <header className="border-b">
        {/* First line: Back button + Title */}
        <div className="flex items-center gap-2 px-4 py-3 md:hidden">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to workflows">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {disableTitleLink ? (
            <div className="flex-1 text-lg font-semibold">{title}</div>
          ) : (
            <Link href="/" className="flex-1 transition-opacity hover:opacity-80">
              <h1 className="text-lg font-semibold">{title}</h1>
            </Link>
          )}
          <UserMenu />
        </div>

        {/* Second line: Actions (mobile only) */}
        <div className="border-t px-4 py-2 md:hidden">
          <div className="flex items-center gap-1">{actions}</div>
        </div>

        {/* Desktop: Single line */}
        <div className="hidden px-6 py-4 md:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && (
                <Button variant="ghost" size="icon" onClick={handleBack} title="Back to workflows">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {disableTitleLink ? (
                <div className="text-xl font-semibold">{title}</div>
              ) : (
                <Link href="/" className="transition-opacity hover:opacity-80">
                  <h1 className="text-xl font-semibold">{title}</h1>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to workflows">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {disableTitleLink ? (
            <div className="text-xl font-semibold">{title}</div>
          ) : (
            <Link href="/" className="transition-opacity hover:opacity-80">
              <h1 className="text-xl font-semibold">{title}</h1>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
