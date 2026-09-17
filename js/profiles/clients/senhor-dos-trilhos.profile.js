/**
 * StayMessage Engine — Client Profile: Chalés Senhor dos Trilhos
 */

export const SENHOR_DOS_TRILHOS_PROFILE = {
  id: 'senhor_dos_trilhos',
  meta: {
    id: 'senhor_dos_trilhos',
    name: 'Chalés Senhor dos Trilhos',
    propertyType: 'chalets',
    currency: 'BRL',
    currencySymbol: 'R$',
    theme: {
      colorPrimary: '#128c7e',
      colorPrimaryDark: '#075e54',
      colorPrimaryLight: '#25d366',
      colorPrimarySubtle: '#e8f7f3',
      brandIconSvg: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M3 21h18" />
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        <path d="M9 7h1" />
        <path d="M14 7h1" />
        <path d="M9 11h1" />
        <path d="M14 11h1" />
        <path d="M9 15h1" />
        <path d="M14 15h1" />
        <path d="M10 21v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
      </svg>`
    }
  },

  accommodations: [
    {
      id: 'vista_lago',
      name: 'Vista do lago (hidro maior)',
      label: 'Vista do lago',
      sublabel: 'Capacidade máxima: 2 pessoas',
      category: 'COM HIDRO',
      tags: ['hydro'],
      maxCapacity: 2,
      placeholder: '0,00',
      badge: {
        text: 'Hidro maior',
        cssClass: 'cat-hydro'
      }
    },
    {
      id: 'hortensia',
      name: 'Hortênsia (hidro menor)',
      label: 'Hortênsia',
      sublabel: 'Capacidade máxima: 2 pessoas',
      category: 'COM HIDRO',
      tags: ['hydro'],
      maxCapacity: 2,
      placeholder: '0,00',
      badge: {
        text: 'Hidro menor',
        cssClass: 'cat-hydro'
      }
    },
    {
      id: 'sem_hidro',
      name: 'Chalés sem hidro',
      label: 'Chalés sem hidro',
      sublabel: 'Capacidade máxima: 4 pessoas (3 a 4 hóspedes)',
      category: 'SEM HIDRO',
      tags: [],
      maxCapacity: 4,
      placeholder: '0,00',
      badge: {
        text: 'Padrão',
        cssClass: 'cat-no-hydro'
      }
    }
  ],

  pricing: {
    datalistSuggestions: [
      350, 490, 590, 700, 710, 750, 850, 980, 990, 
      1050, 1180, 1370, 1470, 1500, 1700, 1770, 2250, 2550
    ],
    autoFillTable: {
      1: {
        sem_hidro: 490,
        hortensia: 750,
        vista_lago: 850
      },
      2: {
        sem_hidro: 980,
        hortensia: 1500,
        vista_lago: 1700
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
      modalWarningTitle: 'Política de Crianças',
      modalWarningText: 'O chalé {unitName} possui hidromassagem e não é recomendado para crianças. Deseja liberar a edição e inserir um valor de exceção mesmo assim?'
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
        header: '*ORÇAMENTO*',
        checkinTime: '14h',
        checkoutTime: '12h'
      },
      dayuse_chale: {
        title: 'Day Use com Chalé (09h / 17h)',
        header: '*ORÇAMENTO - DAY USE COM CHALÉ*',
        checkinTime: '09h',
        checkoutTime: '17h'
      },
      categoryOrder: ['COM HIDRO', 'SEM HIDRO'],
      categoryHeaders: {
        'COM HIDRO': '*CHALÉS COM HIDRO:*',
        'SEM HIDRO': '*CHALÉS SEM HIDRO:*'
      },
      labels: {
        unavailable: 'Indisponível',
        blockedByPolicy: 'Não permite crianças',
        onDemand: 'A consultar'
      }
    },
    dayUseData: {
      header: '*DADOS PARA DAY-USE*',
      labels: {
        paying: 'Pagante',
        exempt: 'Não pagante'
      }
    }
  },

  dayUse: {
    defaultPricePerPerson: 65,
    priceOptions: [65, 80],
    exemptionRules: {
      maxExemptChildren: 2,
      maxExemptAge: 7
    }
  }
};
