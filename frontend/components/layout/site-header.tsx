'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Car, Home, Info, LayoutDashboard, LogOut, Menu, ShieldCheck, User, Video } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NavBar, type NavItem } from '@/components/ui/tubelight-navbar';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { revealHeader, useHeaderRetreated, useScrolledPast } from '@/hooks/use-client-store';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/services/uploads.service';

/**
 * Global header (spec §7): logo, language switcher, theme toggle and navigation.
 * The logo is a placeholder until the real asset is supplied.
 */
export function SiteHeader() {
  const { t, dir } = useLocale();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrolledPast(8);
  const retreated = useHeaderRetreated();

  const links = [
    { href: '/', label: t.nav.home, icon: Home },
    { href: '/cars', label: t.nav.cars, icon: Car },
    { href: '/videos', label: t.videos.navLabel, icon: Video },
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

  /*
   * The header paints nothing itself, so each cluster carries its own capsule.
   * It is there from the start, not only once the page scrolls: over the hero
   * photograph the controls are dark ink on a dark picture, and the language
   * and theme buttons simply could not be seen until something appeared behind
   * them. It deepens slightly on scroll, when page content passes underneath.
   */
  const floatingSurface = cn(
    'border-border/60 border shadow-sm backdrop-blur-lg transition-colors duration-300',
    scrolled ? 'bg-background/85' : 'bg-background/70',
  );

  return (
    /*
     * The header steps out of the way while the reader moves down the page and
     * returns the moment they move back up, at every width. It floats over the
     * content rather than pushing it down, so on the way down it sits on top of
     * whatever is being read — the orbital diagram and the showcase photograph
     * both pass underneath it. Getting out of the way is the whole point of a
     * header with no bar of its own.
     */
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-transform duration-300 ease-out',
        retreated ? '-translate-y-full' : 'translate-y-0',
      )}
      onFocusCapture={revealHeader}
    >
      {/*
        No bar of its own: the header is a layout row over the page, and each
        cluster inside it carries its own surface. A solid strip across the top
        cut the hero in half.
      */}
      {/*
        Three columns rather than an absolutely centred pill: the pill used to
        be positioned independently of the clusters beside it, so between 768px
        and roughly 930px the account controls sat on top of "About Us". Equal
        side columns keep the pill centred in the row and make an overlap
        impossible at any width or in any language.
      */}
      <div className="relative mx-auto grid h-16 w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 sm:px-8 md:h-20">
        {/* The mark itself now, rather than the placeholder icon and wordmark. */}
        <Link
          href="/"
          className={cn(
            'group/brand flex w-fit items-center justify-self-start rounded-full transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4',
            floatingSurface,
            'px-4 py-1.5',
          )}
          aria-label={t.nav.home}
        >
          {/* The crest alone below `sm`, where the full mark would be a smear. */}
          <BrandLogo
            symbolOnly
            height={30}
            animated
            className="transition-transform duration-300 motion-safe:group-hover/brand:-translate-y-0.5 sm:hidden"
          />
          <BrandLogo
            height={26}
            animated
            className="hidden transition-transform duration-300 motion-safe:group-hover/brand:-translate-y-0.5 sm:inline-block"
          />
        </Link>

        {/*
          Primary navigation. The pill appears once there is genuinely room for
          it beside the logo and the account controls — below that width the
          floating bar at the bottom carries it, which is where a thumb reaches
          anyway.
        */}
        {/*
          The column itself is always present. Hiding it with `display: none`
          removes it from the grid altogether, and the account controls slide
          into the middle column with it.
        */}
        <div className="flex justify-center">
          <div className="hidden lg:block">
            <NavBar items={navItems} variant="inline" layoutGroup="header" />
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-1 justify-self-end rounded-full px-1.5 py-1',
            floatingSurface,
          )}
        >
          <LanguageSwitcher />
          <ThemeToggle />

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-2">
                  <Avatar className="size-7">
                    {/* Their own photograph if they have set one; the initials
                        otherwise, which is what this has always shown. The URL
                        is resolved because uploads are served by the API. */}
                    {user?.profileImage && (
                      <AvatarImage src={resolveImageUrl(user.profileImage)} alt="" />
                    )}
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

          {/*
            Account actions for the narrowest screens only. From `sm` up the
            same actions are already on the header itself — Sign In and Sign Up
            for a guest, the avatar menu for a signed-in customer — so on a
            tablet this button opened a panel offering exactly what was visible
            behind it.
          */}
          <Sheet
            open={mobileOpen}
            onOpenChange={(open) => {
              if (open) revealHeader();
              setMobileOpen(open);
            }}
          >
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label={t.nav.openMenu}>
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-[min(20rem,90vw)]">
              <SheetHeader>
                <SheetTitle className="font-display">ZODIC CAR</SheetTitle>
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
