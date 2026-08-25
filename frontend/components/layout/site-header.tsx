'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Car, Home, Info, LayoutDashboard, LogOut, Menu, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { useScrolledPast } from '@/hooks/use-client-store';
import { cn } from '@/lib/utils';

/**
 * Global header (spec §7): logo, language switcher, theme toggle and navigation.
 * The logo is a placeholder until the real asset is supplied.
 */
export function SiteHeader() {
  const { t, dir } = useLocale();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrolledPast(8);

  const links = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/cars', label: t.nav.cars, icon: Car },
    { href: '/about', label: t.nav.about, icon: Info },
  ];

  /** Shape the tubelight navigation expects. */
  const navItems: NavItem[] = links.map((link) => ({
    name: link.label,
    url: link.href,
    icon: link.icon,
  }));

  const initials = (user?.fullName ?? '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-shadow duration-300',
        scrolled
          ? 'bg-background/85 border-border border-b shadow-sm backdrop-blur-lg'
          : 'bg-background/60 border-transparent border-b backdrop-blur-sm',
      )}
    >
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-5 sm:px-8">
        {/* Logo placeholder (spec §7 — do not invent the final logo) */}
        <Link
          href="/"
          className="group/brand flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label={t.nav.home}
        >
          <span className="bg-primary/10 ring-primary/20 grid size-9 place-items-center rounded-lg ring-1 ring-inset transition-transform duration-300 motion-safe:group-hover/brand:-translate-y-0.5">
            <Car className="text-primary size-5" aria-hidden="true" />
          </span>
          <span className="font-display hidden text-base font-semibold tracking-tight sm:inline">
            Car Platform
          </span>
        </Link>

        {/*
          Primary navigation. The pill is centred on wide screens and becomes a
          floating bar at the bottom on small ones, which is where a thumb
          actually reaches.
        */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <NavBar items={navItems} variant="inline" indicator="pill" layoutGroup="header" />
        </div>

        <div className="ms-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[11px] font-semibold">{initials || '—'}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
                    {user?.fullName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal">
                  <span className="block text-sm font-medium">{user?.fullName}</span>
                  <span className="text-muted-foreground block truncate text-xs">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" aria-hidden="true" />
                    {t.nav.dashboard}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="size-4" aria-hidden="true" />
                    {t.dashboard.profile}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      {t.nav.admin}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()}>
                  <LogOut className="size-4" aria-hidden="true" />
                  {t.nav.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t.nav.signIn}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">{t.nav.signUp}</Link>
              </Button>
            </div>
          )}

          {/* Mobile navigation */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label={t.nav.openMenu}>
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-[min(20rem,90vw)]">
              <SheetHeader>
                <SheetTitle className="font-display">Car Platform</SheetTitle>
              </SheetHeader>
              <nav aria-label={t.nav.dashboard} className="mt-2 flex flex-col gap-1 px-4">
                {/*
                  Account actions only: the floating bar below already carries
                  Home, Cars and About, and repeating them here would be noise.
                */}
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground rounded-md px-3 py-2.5 text-sm font-medium"
                    >
                      {t.nav.dashboard}
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileOpen(false)}
                      className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground rounded-md px-3 py-2.5 text-sm font-medium"
                    >
                      {t.dashboard.profile}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground rounded-md px-3 py-2.5 text-sm font-medium"
                      >
                        {t.nav.admin}
                      </Link>
                    )}
                    <Separator className="my-3" />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileOpen(false);
                        void logout();
                      }}
                    >
                      <LogOut className="size-4" aria-hidden="true" />
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <div className="grid gap-2">
                    <Button asChild variant="outline">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        {t.nav.signIn}
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href="/signup" onClick={() => setMobileOpen(false)}>
                        {t.nav.signUp}
                      </Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
