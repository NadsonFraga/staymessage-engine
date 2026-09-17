/**
 * StayMessage Engine — Client Profile: Pousada Vila Verde (Mock Profile for Multi-Profile Testing)
 */

export const VILA_VERDE_PROFILE = {
  id: 'vila_verde',
  meta: {
    id: 'vila_verde',
    name: 'Pousada Vila Verde (Demo)',
    propertyType: 'inn',
    currency: 'BRL',
    currencySymbol: 'R$',
    theme: {
      colorPrimary: '#0f766e',
      colorPrimaryDark: '#115e59',
      colorPrimaryLight: '#14b8a6',
      colorPrimarySubtle: '#f0fdfa',
      brandIconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>`
    }
  },

  accommodations: [
    {
      id: 'suite_presidencial',
      name: 'Suíte Presidencial (hidro e lareira)',
      label: 'Suíte Presidencial',
      sublabel: 'Capacidade máxima: 2 pessoas',
      category: 'SUÍTES ESPECIAIS',
      tags: ['hydro'],
      maxCapacity: 2,
      placeholder: '0,00',
      badge: {
        text: 'Hidro & Lareira',
        cssClass: 'cat-hydro'
      }
    },
    {
      id: 'chale_bosque',
      name: 'Chalé do Bosque',
      label: 'Chalé do Bosque',
      sublabel: 'Capacidade máxima: 3 pessoas',
      category: 'CHALÉS FAMÍLIA',
      tags: ['cozy'],
      maxCapacity: 3,
      placeholder: '0,00',
      badge: {
        text: 'Vista Bosque',
        cssClass: 'cat-no-hydro'
      }
    },
    {
      id: 'apartamento_jardim',
      name: 'Apartamento Jardim',
      label: 'Apartamento Jardim',
      sublabel: 'Capacidade máxima: 4 pessoas (2 a 4 hóspedes)',
      category: 'CHALÉS FAMÍLIA',
      tags: [],
      maxCapacity: 4,
      placeholder: '0,00',
      badge: {
        text: 'Standard',
        cssClass: 'cat-no-hydro'
      }
    }
  ],

  pricing: {
    datalistSuggestions: [
      420, 580, 840, 950, 1160, 1500, 1900, 2300, 2800
    ],
    autoFillTable: {
      1: {
        apartamento_jardim: 420,
        chale_bosque: 580,
        suite_presidencial: 950
      },
      2: {
        apartamento_jardim: 840,
        chale_bosque: 1160,
        suite_presidencial: 1900
      }
    },
    autoFillRules: {
      eligibleNights: [1, 2],
      eligibleGuests: [1, 2]
    }
  },

  policies: {
    childRestrictions: {
      enabled: true,
      restrictedTags: ['hydro'],
      blockedMessage: 'Não permite crianças',
      modalWarningTitle: 'Política de Crianças - Vila Verde',
      modalWarningText: 'A acomodação {unitName} possui banheira de hidromassagem e não é recomendada para crianças. Deseja autorizar a edição do valor mesmo assim?'
    },
    capacityWarning: {
      enabled: true,
      messageTemplate: 'Capacidade máx. recomendada: {maxCapacity} pessoas (Total atual: {totalGuests})'
    }
  },

  messageTemplates: {
    budget: {
      padrao: {
        title: 'Orçamento Padrão (14h / 12h)',
        header: '*ORÇAMENTO — POUSADA VILA VERDE*',
        checkinTime: '14h',
        checkoutTime: '12h'
      },
      dayuse_chale: {
        title: 'Day Use com Chalé (09h / 17h)',
        header: '*ORÇAMENTO DAY USE — POUSADA VILA VERDE*',
        checkinTime: '09h',
        checkoutTime: '17h'
      },
      categoryOrder: ['SUÍTES ESPECIAIS', 'CHALÉS FAMÍLIA'],
      categoryHeaders: {
        'SUÍTES ESPECIAIS': '*SUÍTES ESPECIAIS:*',
        'CHALÉS FAMÍLIA': '*CHALÉS FAMÍLIA:*'
      },
      labels: {
        unavailable: 'Indisponível',
        blockedByPolicy: 'Não permite crianças',
        onDemand: 'A consultar'
      }
    },
    dayUseData: {
      header: '*DADOS PARA DAY-USE — VILA VERDE*',
      labels: {
        paying: 'Pagante',
        exempt: 'Não pagante'
      }
    }
  },

  dayUse: {
    defaultPricePerPerson: 75,
    priceOptions: [75, 95],
    exemptionRules: {
      maxExemptChildren: 2,
      maxExemptAge: 6
    }
  }
};
