/**
 * uGet — Repositório de Carteirinha uGet Pass & Micro-pesquisa Pós-Visita (Módulo 4)
 */
import crypto from 'node:crypto';
import type {
  PartnerSatisfactionSummary,
  PassRedemptionRecord,
  PostVisitSurveyRecord
} from '../types/pass.ts';

export class InMemoryPassStore {
  private redemptions = new Map<string, PassRedemptionRecord>();
  private redemptionByCodeHash = new Map<string, string>();
  private surveys = new Map<string, PostVisitSurveyRecord>();
  private surveyByRedemptionId = new Map<string, string>();

  saveRedemption(rec: Omit<PassRedemptionRecord, 'id' | 'createdAt'>): PassRedemptionRecord {
    const full: PassRedemptionRecord = {
      ...rec,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.redemptions.set(full.id, full);
    this.redemptionByCodeHash.set(full.passCodeHash, full.id);
    return { ...full };
  }

  getRedemptionById(id: string): PassRedemptionRecord | null {
    const rec = this.redemptions.get(id);
    return rec ? { ...rec } : null;
  }

  findRedemptionByCodeHash(hash: string): PassRedemptionRecord | null {
    const id = this.redemptionByCodeHash.get(hash);
    if (!id) return null;
    return this.getRedemptionById(id);
  }

  markRedemptionValidated(id: string): PassRedemptionRecord | null {
    const rec = this.redemptions.get(id);
    if (!rec) return null;
    rec.status = 'VALIDATED';
    rec.validatedAt = new Date().toISOString();
    return { ...rec };
  }

  listUserRedemptions(userId: string): PassRedemptionRecord[] {
    return Array.from(this.redemptions.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({ ...r }));
  }

  listAllRedemptions(): PassRedemptionRecord[] {
    return Array.from(this.redemptions.values()).map((r) => ({ ...r }));
  }

  listAllSurveys(): PostVisitSurveyRecord[] {
    return Array.from(this.surveys.values()).map((s) => ({ ...s }));
  }

  hasSurveyForRedemption(redemptionId: string): boolean {
    return this.surveyByRedemptionId.has(redemptionId);
  }

  saveSurvey(rec: Omit<PostVisitSurveyRecord, 'id' | 'createdAt'>): PostVisitSurveyRecord {
    const full: PostVisitSurveyRecord = {
      ...rec,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.surveys.set(full.id, full);
    if (full.redemptionId) {
      this.surveyByRedemptionId.set(full.redemptionId, full.id);
    }
    return { ...full };
  }

  listUserSurveys(userId: string): PostVisitSurveyRecord[] {
    return Array.from(this.surveys.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({ ...s }));
  }

  getPartnerSatisfaction(partnerId: string): PartnerSatisfactionSummary {
    const items = Array.from(this.surveys.values()).filter((s) => s.partnerId === partnerId);
    if (items.length === 0) {
      return {
        partnerId,
        totalResponses: 0,
        averageRating: 0,
        honoredRatePct: 100,
        totalEstimatedSavingsBrl: 0
      };
    }
    const ratingSum = items.reduce((acc, s) => acc + s.rating, 0);
    const honoredCount = items.filter((s) => s.discountHonored).length;
    const savingsSum = items.reduce((acc, s) => acc + s.savedEstimateBrl, 0);
    return {
      partnerId,
      totalResponses: items.length,
      averageRating: Number((ratingSum / items.length).toFixed(2)),
      honoredRatePct: Math.round((honoredCount / items.length) * 100),
      totalEstimatedSavingsBrl: Number(savingsSum.toFixed(2))
    };
  }

  clearForTests(): void {
    this.redemptions.clear();
    this.redemptionByCodeHash.clear();
    this.surveys.clear();
    this.surveyByRedemptionId.clear();
  }
}

export const passStore = new InMemoryPassStore();
