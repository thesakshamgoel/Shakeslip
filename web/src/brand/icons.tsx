import './icons.css'

/* Brand marks, from the supplied vector files in /public/brand: the Shakeslip logo, and the Studio and Slip variants.
   spinning: the mark turns while the app is working. Unchanged artwork, never recoloured or stretched. */
type IconProps = { size?: number; className?: string; title?: string; spinning?: boolean }

const Mark = ({ src, alt, size, className = '', spinning }: IconProps & { src: string; alt: string }) => (
  <img src={src} width={size} height={size} alt={alt} className={`logo-mark ${spinning ? 'is-spinning' : ''} ${className}`} style={{ aspectRatio: '1 / 1', objectFit: 'contain' }} />
)

export const StudioIcon = ({ size = 40, title = 'Studio', ...p }: IconProps) => <Mark src={`${import.meta.env.BASE_URL}brand/studio.svg`} alt={title} size={size} {...p} />
export const SlipIcon = ({ size = 40, title = 'Slip', ...p }: IconProps) => <Mark src={`${import.meta.env.BASE_URL}brand/slip.svg`} alt={title} size={size} {...p} />
export const LogoMark = ({ size = 32, title = 'Shakeslip', ...p }: IconProps) => <Mark src={`${import.meta.env.BASE_URL}brand/shakeslip.svg`} alt={title} size={size} {...p} />
