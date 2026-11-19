import { Cam } from '@prisma/client';

/** Medio con el que se registro el hecho, tal como se guarda en Report.media */
export interface ReportMedium {
  cam: Cam;
  /** Dispositivo registrado (Bodycam.id); null para celular */
  id: string | null;
  name: string | null;
}

/** Como se nombra cada tipo de medio en el texto del informe */
const MEDIUM_TEXT: Record<Cam, string> = {
  BODYCAM: 'la BODYCAM',
  CAMERA: 'la CÁMARA',
  RADIO: 'la RADIO',
  PHONE: 'un CELULAR',
};

/** "la BODYCAM SG004" · "un CELULAR" */
export function describeMedium(medium: ReportMedium): string {
  const base = MEDIUM_TEXT[medium.cam] ?? 'el medio';
  return medium.name ? `${base} ${medium.name}` : base;
}

/** Une frases en español: "a", "a y b", "a, b y c" */
export function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/** "la BODYCAM SG004, la CÁMARA 104A y un CELULAR" */
export function describeMedia(media: ReportMedium[]): string {
  return joinSpanish(media.map(describeMedium));
}

/** Etiqueta corta para tablas y Excel: "Bodycam, Cámara" */
export function mediaLabel(media: ReportMedium[] | null | undefined): string {
  const labels: Record<Cam, string> = {
    BODYCAM: 'Bodycam',
    CAMERA: 'Cámara',
    RADIO: 'Radio',
    PHONE: 'Celular',
  };
  return (media ?? []).map((m) => labels[m.cam] ?? m.cam).join(', ');
}
