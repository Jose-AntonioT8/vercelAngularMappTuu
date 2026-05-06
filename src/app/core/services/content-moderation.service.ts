import { Injectable } from '@angular/core';

/**
 * Resultado agregado del análisis de moderación en frontend.
 */
export interface ModerationResult {
  /** `true` cuando el contenido debe bloquearse. */
  blocked: boolean;
  /** `true` cuando el contenido requiere advertencia/revisión. */
  warning: boolean;
  /** Score agregado de riesgo (0..1). */
  score: number;
  /** Claves de motivos detectados durante el análisis. */
  reasons: string[];
}

/**
 * Servicio de moderación heurística en frontend.
 *
 * Evalúa texto e imagen con reglas locales para generar un resultado de riesgo
 * previo a envío al backend/publicación.
 */
@Injectable({ providedIn: 'root' })
export class ContentModerationService {
  /** Términos de severidad alta que bloquean directamente. */
  private readonly severeBlockTerms = [
    'puto',
    'puta',
    'hijo de puta',
    'hija de puta',
    'maricon',
    'marica',
    'faggot',
    'nigger',
  ];

  /** Términos de lenguaje malsonante/profanidad para scoring incremental. */
  private readonly profanityTerms = [
    'idiota',
    'imbecil',
    'estupido',
    'estupida',
    'gilipollas',
    'subnormal',
    'retrasado',
    'mierda',
    'cabron',
    'cabrona',
    'puto',
    'puta',
    'zorra',
    'hijo de puta',
    'hija de puta',
    'fuck',
    'fucking',
    'shit',
    'bitch',
    'asshole',
    'bastard',
    'moron',
  ];

  /** Términos de contenido sexual explícito. */
  private readonly sexualTerms = [
    'porn',
    'porno',
    'xxx',
    'nude',
    'naked',
    'desnudo',
    'desnuda',
    'sex',
    'sexy',
    'hardcore',
    'fetish',
    'nsfw',
    'onlyfans',
  ];

  /** Términos asociados a violencia explícita. */
  private readonly violenceTerms = [
    'gore',
    'blood',
    'sangre',
    'matar',
    'asesinar',
    'kill',
    'suicidio',
    'suicide',
    'violence',
    'violencia',
    'arma',
    'weapon',
    'nazi',
  ];

  /** Términos de odio/discriminación para elevar riesgo. */
  private readonly hateTerms = [
    'maricon',
    'marica',
    'sudaca',
    'negro de mierda',
    'moro de mierda',
    'faggot',
    'nigger',
    'spic',
    'kike',
  ];

  /** Patrones de amenaza directa en texto natural. */
  private readonly threatPatterns: RegExp[] = [
    /\b(te|os|les)\s+voy\s+a\s+matar\b/i,
    /\bvoy\s+a\s+matar(te|los|les)?\b/i,
    /\b(te|os|les)\s+voy\s+a\s+reventar\b/i,
    /\bi(?:'|\s)?ll\s+kill\s+you\b/i,
  ];

  /** Términos sospechosos aplicados a nombres/refs de imágenes. */
  private readonly suspiciousImageTerms = [
    ...this.sexualTerms,
    ...this.violenceTerms,
    'cp',
    'childporn',
  ];

  /** Umbral a partir del cual se bloquea publicación. */
  private readonly blockThreshold = 0.8;
  /** Umbral intermedio para advertencia sin bloqueo. */
  private readonly warningThreshold = 0.45;

  /**
   * Modera entrada de una actividad (texto + fichero opcional).
   */
  moderateActivityInput(
    name: string,
    description: string,
    file?: File | null
  ): ModerationResult {
    const text = this.normalizeText(`${name || ''} ${description || ''}`);
    const reasons: string[] = [];
    let score = 0;

    const severeHits = this.countHits(text, this.severeBlockTerms);
    if (severeHits > 0) {
      return {
        blocked: true,
        warning: false,
        score: 1,
        reasons: ['moderation.offensiveTextDetected'],
      };
    }

    const profanityHits = this.countHits(text, this.profanityTerms);
    if (profanityHits > 0) {
      score += Math.min(0.55, 0.2 + profanityHits * 0.12);
      reasons.push('moderation.offensiveTextDetected');
    }

    const sexualHits = this.countHits(text, this.sexualTerms);
    if (sexualHits > 0) {
      score += Math.min(0.65, 0.25 + sexualHits * 0.15);
      reasons.push('moderation.offensiveTextDetected');
    }

    const violenceHits = this.countHits(text, this.violenceTerms);
    if (violenceHits > 0) {
      score += Math.min(0.7, 0.2 + violenceHits * 0.15);
      reasons.push('moderation.offensiveTextDetected');
    }

    const hateHits = this.countHits(text, this.hateTerms);
    if (hateHits > 0) {
      score += Math.min(0.8, 0.3 + hateHits * 0.18);
      reasons.push('moderation.offensiveTextDetected');
    }

    const threatHits = this.threatPatterns.filter((pattern) =>
      pattern.test(text)
    );
    if (threatHits.length > 0) {
      score += Math.min(0.95, 0.45 + threatHits.length * 0.2);
      reasons.push('moderation.offensiveTextDetected');
    }

    if (file) {
      const imageResult = this.moderateImageFile(file);
      score += imageResult.score * 0.75;
      reasons.push(...imageResult.reasons);
    }

    const normalizedScore = Math.min(score, 1);
    const blocked = normalizedScore >= this.blockThreshold;
    const warning = !blocked && normalizedScore >= this.warningThreshold;

    return {
      blocked,
      warning,
      score: normalizedScore,
      reasons: [...new Set(reasons)],
    };
  }

  /**
   * Modera entrada de un plan combinando texto, URL de imagen y fichero opcional.
   */
  moderatePlanInput(
    name: string,
    description: string,
    imageRef?: string | null,
    file?: File | null
  ): ModerationResult {
    const baseResult = this.moderateActivityInput(name, description, file);
    const imageRefResult = this.moderateImageReference(imageRef);

    const score = Math.min(1, baseResult.score + imageRefResult.score * 0.7);
    const blocked = baseResult.blocked || imageRefResult.blocked || score >= this.blockThreshold;
    const warning =
      !blocked && (baseResult.warning || imageRefResult.warning || score >= this.warningThreshold);

    return {
      blocked,
      warning,
      score,
      reasons: [...new Set([...baseResult.reasons, ...imageRefResult.reasons])],
    };
  }

  /**
   * Modera una referencia textual de imagen (URL/path).
   */
  moderateImageReference(imageRef?: string | null): ModerationResult {
    const ref = this.normalizeText(imageRef || '');
    if (!ref) {
      return { blocked: false, warning: false, score: 0, reasons: [] };
    }

    const suspiciousHits = this.countHits(ref, this.suspiciousImageTerms);
    const score = suspiciousHits > 0 ? Math.min(0.95, 0.6 + suspiciousHits * 0.15) : 0;

    return {
      blocked: score >= this.blockThreshold,
      warning: score >= this.warningThreshold && score < this.blockThreshold,
      score,
      reasons: suspiciousHits > 0 ? ['moderation.suspiciousImageDetected'] : [],
    };
  }

  /**
   * Modera metadatos de un fichero de imagen (nombre, tipo y tamaño).
   */
  moderateImageFile(file: File): ModerationResult {
    const reasons: string[] = [];
    let score = 0;
    const filename = this.normalizeText(file.name || '');

    const suspiciousHits = this.countHits(filename, this.suspiciousImageTerms);
    if (suspiciousHits > 0) {
      score = Math.max(score, Math.min(0.95, 0.55 + suspiciousHits * 0.15));
      reasons.push('moderation.suspiciousImageDetected');
    }

    if (!file.type.startsWith('image/')) {
      score = Math.max(score, 0.9);
      reasons.push('moderation.invalidImageType');
    }

    const verySmallFile = file.size > 0 && file.size < 5000;
    if (verySmallFile && suspiciousHits > 0) {
      score = Math.max(score, 0.85);
      reasons.push('moderation.suspiciousImageDetected');
    }

    return {
      blocked: score >= this.blockThreshold,
      warning: score >= this.warningThreshold && score < this.blockThreshold,
      score,
      reasons: [...new Set(reasons)],
    };
  }

  /** Cuenta coincidencias de términos normalizados dentro de un texto. */
  private countHits(text: string, terms: string[]): number {
    return terms.reduce((total, term) => {
      if (this.containsTerm(text, this.normalizeText(term))) {
        return total + 1;
      }
      return total;
    }, 0);
  }

  /** Comprueba si un término concreto existe como palabra/patrón en el texto. */
  private containsTerm(text: string, term: string): boolean {
    if (!term) return false;
    const escaped = this.escapeRegex(term).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i');
    return regex.test(text);
  }

  /** Normaliza texto (acentos, leetspeak, repetición y caracteres especiales). */
  private normalizeText(value: string): string {
    const leetMap: Record<string, string> = {
      '0': 'o',
      '1': 'i',
      '2': 'z',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '6': 'g',
      '7': 't',
      '8': 'b',
      '9': 'g',
      '@': 'a',
      '$': 's',
      '!': 'i',
      '|': 'i',
    };

    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split('')
      .map((char) => leetMap[char] ?? char)
      .join('')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/(.)\1{2,}/g, '$1$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Escapa caracteres especiales para construir regex segura. */
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

