import { Injectable } from '@angular/core';

export interface ModerationResult {
  blocked: boolean;
  warning: boolean;
  score: number;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class ContentModerationService {
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

  private readonly threatPatterns: RegExp[] = [
    /\b(te|os|les)\s+voy\s+a\s+matar\b/i,
    /\bvoy\s+a\s+matar(te|los|les)?\b/i,
    /\b(te|os|les)\s+voy\s+a\s+reventar\b/i,
    /\bi(?:'|\s)?ll\s+kill\s+you\b/i,
  ];

  private readonly suspiciousImageTerms = [
    ...this.sexualTerms,
    ...this.violenceTerms,
    'cp',
    'childporn',
  ];

  private readonly blockThreshold = 0.8;
  private readonly warningThreshold = 0.45;

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

  private countHits(text: string, terms: string[]): number {
    return terms.reduce((total, term) => {
      if (this.containsTerm(text, this.normalizeText(term))) {
        return total + 1;
      }
      return total;
    }, 0);
  }

  private containsTerm(text: string, term: string): boolean {
    if (!term) return false;
    const escaped = this.escapeRegex(term).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i');
    return regex.test(text);
  }

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

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

