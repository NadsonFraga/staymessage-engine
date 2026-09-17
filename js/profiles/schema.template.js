/**
 * StayMessage Engine — Profile Schema Contract & Documentation Template
 *
 * This template defines the data structure required for any hospitality establishment.
 * Any property profile (hotel, inn, resort, vacation rental) must conform to this schema.
 *
 * @typedef {Object} AccommodationBadge
 * @property {string} text - Badge text displayed in UI (e.g., "Hidro maior", "Standard")
 * @property {string} cssClass - CSS styling modifier class (e.g., "cat-hydro", "cat-no-hydro")
 *
 * @typedef {Object} AccommodationUnit
 * @property {string} id - Unique slug identifier (e.g., "vista_lago")
 * @property {string} name - Full display name used in WhatsApp text
 * @property {string} label - Card title in UI
 * @property {string} sublabel - Subtitle description in UI
 * @property {string} category - WhatsApp category section name (e.g., "COM HIDRO", "SEM HIDRO")
 * @property {string[]} tags - Functional tags evaluated by policies (e.g., ["hydro", "couple_only"])
 * @property {number} maxCapacity - Maximum recommended guests count
 * @property {string} placeholder - Default input price placeholder
 * @property {AccommodationBadge} badge - Category pill configuration
 *
 * @typedef {Object} ProfileSchema
 * @property {Object} meta - Property identity, name and currency
 * @property {AccommodationUnit[]} accommodations - List of inventory units
 * @property {Object} pricing - Datalist suggestions and auto-fill price tables
 * @property {Object} policies - Configurable business rules (child restriction, capacity warning)
 * @property {Object} messageTemplates - Text boilerplate and category headers for WhatsApp messages
 * @property {Object} dayUse - Day Use pricing, options, and exemption rules
 */

export const PROFILE_SCHEMA_TEMPLATE = {
  meta: {
    id: 'establishment_slug',
    name: 'Establishment Display Name',
    propertyType: 'chalets', // 'chalets' | 'hotel' | 'inn' | 'resort'
    currency: 'BRL',
    currencySymbol: 'R$'
  },

  accommodations: [
    {
      id: 'unit_slug',
      name: 'Unit Display Name (Full)',
      label: 'Unit UI Label',
      sublabel: 'Capacidade máxima: 2 pessoas',
      category: 'CATEGORY_NAME',
      tags: ['hydro'],
      maxCapacity: 2,
      placeholder: '0,00',
      badge: {
        text: 'Badge Text',
        cssClass: 'cat-hydro'
      }
    }
  ],

  pricing: {
    datalistSuggestions: [],
    autoFillTable: {
      1: {},
      2: {}
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
      modalWarningText: 'A unidade {unitName} possui restrições para crianças. Deseja liberar a edição e inserir um valor de exceção mesmo assim?'
    },
    capacityWarning: {
      enabled: true,
      messageTemplate: 'Capacidade máx. recomendada: {maxCapacity} pessoas (Total atual: {totalGuests})'
    }
  },

  messageTemplates: {
    budget: {
      padrao: {
        title: 'Orçamento Padrão',
        header: '*ORÇAMENTO*',
        checkinTime: '14h',
        checkoutTime: '12h'
      },
      dayuse_chale: {
        title: 'Orçamento Day Use com Chalé',
        header: '*ORÇAMENTO - DAY USE COM CHALÉ*',
        checkinTime: '09h',
        checkoutTime: '17h'
      },
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
