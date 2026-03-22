/**
 * lucide-react ships typings on the package root; deep icon paths are untyped.
 * Used to import Sparkles without the main barrel (Turbopack HMR can leave stale bot.js refs).
 */
declare module "lucide-react/dist/esm/icons/sparkles" {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react"
  const Sparkles: ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
  >
  export default Sparkles
}
