import { cn } from '@/lib/utils';

/**
 * The signature radial backdrop — black easing into the brand violet.
 *
 * Supplied as a full-screen `Hero`, which is how the reference component is
 * written, plus a `RadialBackdrop` layer for sections that need the same
 * treatment behind their own content. Both draw from the palette tokens rather
 * than literal hex, so light and dark stay coherent and the hue lives in one
 * place (see `--hero-from` and `--brand-radial-end` in globals.css).
 */
export const Hero = ({ children, className }: { children?: React.ReactNode; className?: string }) => {
  return (
    <div className={cn('relative h-screen w-full', className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="brand-radial absolute inset-0 -z-10 h-full w-full items-center px-5 py-24" />
      </div>

      {children}
    </div>
  );
};

/**
 * The same gradient as a positioned layer, for sections that supply their own
 * height and content. Decorative, so it is hidden from assistive technology.
 */
export const RadialBackdrop = ({ className }: { className?: string }) => (
  <div aria-hidden="true" className={cn('brand-radial pointer-events-none absolute inset-0 -z-10', className)} />
);

export default Hero;
