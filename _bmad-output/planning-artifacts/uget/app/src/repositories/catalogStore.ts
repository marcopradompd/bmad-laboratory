/**
 * uGet — Repositório Geoespacial de Clubes, Parceiros e Benefícios (Seed Bahia/Salvador)
 * Baseado diretamente nas associações e clubes mapeados no Plano de Negócio uGet.
 */
import type {
  BenefitRecord,
  ClubRecord,
  PartnerRecord,
  PartnerUnitRecord
} from '../types/catalog.ts';

const SEED_CLUBS: ClubRecord[] = [
  { id: 'club-oab-ba', slug: 'oab-ba', name: 'OAB-BA · CAAB', segment: 'Entidade de Classe', membersEstimate: 45000, isActive: true },
  { id: 'club-abm', slug: 'abm', name: 'ABM · Associação Médica', segment: 'Entidade de Classe', membersEstimate: 20000, isActive: true },
  { id: 'club-croba', slug: 'croba', name: 'CROBA · Odontologia', segment: 'Entidade de Classe', membersEstimate: 17000, isActive: true },
  { id: 'club-esquadrao', slug: 'socio-esquadrao', name: 'Sócio Esquadrão', segment: 'Clube Esportivo', membersEstimate: 15000, isActive: true },
  { id: 'club-atarde', slug: 'atarde-mais', name: 'Clube A Tarde+', segment: 'Rede de Comunicação', membersEstimate: 42000, isActive: true },
  { id: 'club-alpha', slug: 'alphaclub', name: 'AlphaClub Benefícios', segment: 'Bem-Estar & Fitness', membersEstimate: 10000, isActive: true }
];

const SEED_PARTNERS: PartnerRecord[] = [
  {
    id: 'ptr-drogaria-vida',
    name: 'Drogaria Vida Barra',
    category: 'Saúde',
    description: 'Rede farmacêutica completa com descontos exclusivos em genéricos, medicamentos de uso contínuo e dermocosméticos.',
    phone: '+557133331010',
    whatsapp: '5571999991010',
    website: 'https://drogariavida.exemplo.com.br',
    rating: 4.9,
    isActive: true
  },
  {
    id: 'ptr-cafe-origem',
    name: 'Café & Bistrô Origem',
    category: 'Gastronomia',
    description: 'Cozinha contemporânea baiana, cafés especiais e almoço executivo em ambiente climatizado.',
    phone: '+557133332020',
    whatsapp: '5571999992020',
    website: 'https://cafeorigem.exemplo.com.br',
    rating: 4.8,
    isActive: true
  },
  {
    id: 'ptr-academia-pulse',
    name: 'Rede Academia Pulse',
    category: 'Bem-Estar',
    description: 'Estrutura premium de musculação, funcional, natação e avaliação física periódica.',
    phone: '+557133333030',
    whatsapp: '5571999993030',
    website: 'https://academiapulse.exemplo.com.br',
    rating: 4.9,
    isActive: true
  },
  {
    id: 'ptr-livraria-atlantico',
    name: 'Livraria Atlântico',
    category: 'Educação',
    description: 'Livros jurídicos, técnicos, literatura nacional e papelaria executiva.',
    phone: '+557133334040',
    whatsapp: '5571999994040',
    website: 'https://livrariaatlantico.exemplo.com.br',
    rating: 4.7,
    isActive: true
  },
  {
    id: 'ptr-lab-diagnostica',
    name: 'Laboratório Diagnóstica',
    category: 'Saúde',
    description: 'Exames laboratoriais, imagem e coleta domiciliar com atendimento prioritário para conveniados.',
    phone: '+557133335050',
    whatsapp: '5571999995050',
    website: 'https://labdiagnostica.exemplo.com.br',
    rating: 4.8,
    isActive: true
  },
  {
    id: 'ptr-auto-prime',
    name: 'AutoCenter Prime Pituba',
    category: 'Serviços',
    description: 'Revisão preventiva, alinhamento, estética automotiva e troca de óleo expressa.',
    phone: '+557133336060',
    whatsapp: '5571999996060',
    website: 'https://autoprime.exemplo.com.br',
    rating: 4.6,
    isActive: true
  },
  {
    id: 'ptr-emporio-mar',
    name: 'Empório do Mar Gourmet',
    category: 'Varejo',
    description: 'Delicatessen, vinhos selecionados, pães artesanais e produtos saudáveis.',
    phone: '+557133337070',
    whatsapp: '5571999997070',
    website: 'https://emporiodomar.exemplo.com.br',
    rating: 4.9,
    isActive: true
  }
];

const SEED_UNITS: PartnerUnitRecord[] = [
  { id: 'unit-drogaria-barra', partnerId: 'ptr-drogaria-vida', unitName: 'Unidade Farol da Barra', address: 'Av. Oceânica, 420', neighborhood: 'Barra', city: 'Salvador', state: 'BA', lat: -13.0098, lon: -38.5315 },
  { id: 'unit-cafe-barra', partnerId: 'ptr-cafe-origem', unitName: 'Unidade Porto da Barra', address: 'Av. Sete de Setembro, 3680', neighborhood: 'Barra', city: 'Salvador', state: 'BA', lat: -13.0052, lon: -38.5322 },
  { id: 'unit-pulse-pituba', partnerId: 'ptr-academia-pulse', unitName: 'Unidade Pituba Orla', address: 'Av. Octávio Mangabeira, 1180', neighborhood: 'Pituba', city: 'Salvador', state: 'BA', lat: -13.0038, lon: -38.4585 },
  { id: 'unit-livraria-barra', partnerId: 'ptr-livraria-atlantico', unitName: 'Shopping Barra Piso L2', address: 'Av. Centenário, 2992', neighborhood: 'Chame-Chame', city: 'Salvador', state: 'BA', lat: -13.0067, lon: -38.5236 },
  { id: 'unit-lab-graca', partnerId: 'ptr-lab-diagnostica', unitName: 'Unidade Graça', address: 'Rua da Graça, 145', neighborhood: 'Graça', city: 'Salvador', state: 'BA', lat: -12.9985, lon: -38.5230 },
  { id: 'unit-auto-pituba', partnerId: 'ptr-auto-prime', unitName: 'Unidade Paulo VI', address: 'Av. Paulo VI, 890', neighborhood: 'Pituba', city: 'Salvador', state: 'BA', lat: -12.9992, lon: -38.4642 },
  { id: 'unit-emporio-rv', partnerId: 'ptr-emporio-mar', unitName: 'Unidade Rio Vermelho', address: 'Rua Fonte do Boi, 210', neighborhood: 'Rio Vermelho', city: 'Salvador', state: 'BA', lat: -13.0124, lon: -38.4918 }
];

const SEED_BENEFITS: BenefitRecord[] = [
  {
    id: 'ben-drogaria-oab',
    clubId: 'club-oab-ba',
    partnerId: 'ptr-drogaria-vida',
    title: 'Desconto em Medicamentos & Dermocosméticos',
    discountLabel: '25% OFF',
    rules: 'Válido em medicamentos tarjados genéricos (25% OFF) e dermocosméticos (15% OFF). Apresente o uGet Pass antes de fechar a compra.',
    validFromHour: 7,
    validToHour: 22,
    validWindowLabel: 'Todos os dias · 07h às 22h',
    isVip: false,
    isActive: true
  },
  {
    id: 'ben-cafe-oab',
    clubId: 'club-oab-ba',
    partnerId: 'ptr-cafe-origem',
    title: 'Almoço Executivo & Cafés Especiais',
    discountLabel: '20% OFF',
    rules: '20% de desconto no cardápio de almoço executivo e cafés especiais para o titular + 1 acompanhante.',
    validFromHour: 11,
    validToHour: 15,
    validWindowLabel: 'Almoço · 11h às 15h',
    isVip: false,
    isActive: true
  },
  {
    id: 'ben-pulse-esquadrao',
    clubId: 'club-esquadrao',
    partnerId: 'ptr-academia-pulse',
    title: 'Plano Anual VIP + Isenção de Matrícula',
    discountLabel: '30% OFF',
    rules: 'Isenção total da taxa de matrícula + 30% de desconto na mensalidade do plano completo.',
    validFromHour: 6,
    validToHour: 22,
    validWindowLabel: 'Seg a Sáb · 06h às 22h',
    isVip: true,
    isActive: true
  },
  {
    id: 'ben-livraria-oab',
    clubId: 'club-oab-ba',
    partnerId: 'ptr-livraria-atlantico',
    title: 'Obras Jurídicas, Técnicas & Literatura',
    discountLabel: '18% OFF',
    rules: '18% OFF em livros técnicos/jurídicos e 12% OFF em papelaria executiva.',
    validFromHour: 9,
    validToHour: 21,
    validWindowLabel: 'Seg a Sáb · 09h às 21h',
    isVip: false,
    isActive: true
  },
  {
    id: 'ben-lab-abm',
    clubId: 'club-abm',
    partnerId: 'ptr-lab-diagnostica',
    title: 'Check-up Completo & Exames Particulares',
    discountLabel: '35% OFF',
    rules: 'Desconto especial sobre tabela particular para associados ABM e dependentes diretos.',
    validFromHour: 6,
    validToHour: 17,
    validWindowLabel: 'Seg a Sáb · 06h às 17h',
    isVip: true,
    isActive: true
  },
  {
    id: 'ben-auto-atarde',
    clubId: 'club-atarde',
    partnerId: 'ptr-auto-prime',
    title: 'Alinhamento + Balanceamento + Revisão',
    discountLabel: '22% OFF',
    rules: '22% de desconto em serviços de oficina e estética automotiva mediante apresentação do uGet Pass.',
    validFromHour: 8,
    validToHour: 18,
    validWindowLabel: 'Seg a Sáb · 08h às 18h',
    isVip: false,
    isActive: true
  },
  {
    id: 'ben-emporio-croba',
    clubId: 'club-croba',
    partnerId: 'ptr-emporio-mar',
    title: 'Adega, Padaria Artesanal & Delicatessen',
    discountLabel: '15% OFF',
    rules: '15% OFF em compras acima de R$ 80 na padaria artesanal e rótulos selecionados da adega.',
    validFromHour: 8,
    validToHour: 21,
    validWindowLabel: 'Todos os dias · 08h às 21h',
    isVip: false,
    isActive: true
  }
];

export class InMemoryCatalogStore {
  private clubs = new Map<string, ClubRecord>();
  private partners = new Map<string, PartnerRecord>();
  private units = new Map<string, PartnerUnitRecord>();
  private benefits = new Map<string, BenefitRecord>();
  private userClubIds = new Map<string, Set<string>>();
  private userFavoriteIds = new Map<string, Set<string>>();

  constructor() {
    this.seed();
  }

  seed(): void {
    this.clubs.clear();
    this.partners.clear();
    this.units.clear();
    this.benefits.clear();
    SEED_CLUBS.forEach((c) => this.clubs.set(c.id, { ...c }));
    SEED_PARTNERS.forEach((p) => this.partners.set(p.id, { ...p }));
    SEED_UNITS.forEach((u) => this.units.set(u.id, { ...u }));
    SEED_BENEFITS.forEach((b) => this.benefits.set(b.id, { ...b }));
  }

  listClubs(): ClubRecord[] {
    return Array.from(this.clubs.values()).filter((c) => c.isActive);
  }

  getClubById(id: string): ClubRecord | null {
    return this.clubs.get(id) || null;
  }

  getPartnerById(id: string): PartnerRecord | null {
    return this.partners.get(id) || null;
  }

  listUnitsByPartner(partnerId: string): PartnerUnitRecord[] {
    return Array.from(this.units.values()).filter((u) => u.partnerId === partnerId);
  }

  listBenefits(includeInactive = false): BenefitRecord[] {
    return Array.from(this.benefits.values()).filter((b) => includeInactive || b.isActive);
  }

  getBenefitById(id: string): BenefitRecord | null {
    return this.benefits.get(id) || null;
  }

  listPartners(): PartnerRecord[] {
    return Array.from(this.partners.values()).filter((p) => p.isActive);
  }

  createBenefit(rec: BenefitRecord): BenefitRecord {
    this.benefits.set(rec.id, { ...rec });
    return { ...rec };
  }

  setBenefitActive(id: string, isActive: boolean): BenefitRecord | null {
    const existing = this.benefits.get(id);
    if (!existing) return null;
    existing.isActive = isActive;
    return { ...existing };
  }

  getUserClubs(userId: string): string[] {
    const set = this.userClubIds.get(userId);
    if (!set) return ['club-oab-ba', 'club-esquadrao', 'club-abm']; // Default inicial para descoberta imediata
    return Array.from(set);
  }

  setUserClubs(userId: string, clubIds: string[]): string[] {
    const valid = clubIds.filter((id) => this.clubs.has(id));
    this.userClubIds.set(userId, new Set(valid));
    return valid;
  }

  getUserFavorites(userId: string): Set<string> {
    return this.userFavoriteIds.get(userId) || new Set<string>();
  }

  toggleFavorite(userId: string, benefitId: string): boolean {
    let set = this.userFavoriteIds.get(userId);
    if (!set) {
      set = new Set<string>();
      this.userFavoriteIds.set(userId, set);
    }
    if (set.has(benefitId)) {
      set.delete(benefitId);
      return false;
    }
    set.add(benefitId);
    return true;
  }

  resetUserStateForTests(): void {
    this.userClubIds.clear();
    this.userFavoriteIds.clear();
  }
}

export const catalogStore = new InMemoryCatalogStore();
