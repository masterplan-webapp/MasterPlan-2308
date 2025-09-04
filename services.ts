

import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanData, Campaign, User, LanguageCode, KeywordSuggestion, CreativeTextData, AdGroup, UTMLink, GeneratedImage, AspectRatio, SummaryData, MonthlySummary } from './types';
import { MONTHS_LIST, OPTIONS, CHANNEL_FORMATS, DEFAULT_METRICS_BY_OBJECTIVE } from "./constants";

// --- Gemini API Helper ---
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Removed from top-level

// --- UTILITY FUNCTIONS ---
export const formatCurrency = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
};

export const formatPercentage = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return `${numberValue.toFixed(2)}%`;
};

export const formatNumber = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR').format(Math.round(numberValue));
};

export const sortMonthKeys = (a: string, b: string): number => {
    const [yearA, monthNameA] = a.split('-');
    const [yearB, monthNameB] = b.split('-');
    
    const monthIndexA = MONTHS_LIST.indexOf(monthNameA);
    const monthIndexB = MONTHS_LIST.indexOf(monthNameB);

    if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
    }
    return monthIndexA - monthIndexB;
};

// --- MOCK DATABASE (LocalStorage) ---
export const dbService = {
    getPlans: (userId: string): PlanData[] => {
        try {
            const data = localStorage.getItem(`masterplan_plans_${userId}`);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Failed to get plans from localStorage", error);
            return [];
        }
    },
    savePlan: (userId: string, plan: PlanData) => {
        const plans = dbService.getPlans(userId);
        const index = plans.findIndex(p => p.id === plan.id);
        if (index > -1) {
            plans[index] = plan;
        } else {
            plans.push(plan);
        }
        localStorage.setItem(`masterplan_plans_${userId}`, JSON.stringify(plans));
    },
    deletePlan: (userId: string, planId: string) => {
        let plans = dbService.getPlans(userId);
        plans = plans.filter(p => p.id !== planId);
        localStorage.setItem(`masterplan_plans_${userId}`, JSON.stringify(plans));
    },
    getPlanById: (userId: string, planId: string): PlanData | null => {
        try {
            const plans = dbService.getPlans(userId);
            const plan = plans.find((p: PlanData) => p.id === planId);
            return plan || null;
        } catch (error) {
            console.error("Failed to get plan by ID from localStorage", error);
            return null;
        }
    },
};


// --- Core Business Logic ---
export const recalculateCampaignMetrics = (campaign: Partial<Campaign>): Campaign => {
    let newCampaign: Partial<Campaign> = { ...campaign };
    
    let budget = Number(newCampaign.budget) || 0;
    let ctr = (Number(newCampaign.ctr) || 0) / 100;
    let taxaConversao = (Number(newCampaign.taxaConversao) || 0) / 100;
    let connectRate = (Number(newCampaign.connectRate) || 0) / 100;
    let cpc = Number(newCampaign.cpc) || 0;
    let cpm = Number(newCampaign.cpm) || 0;
    let impressoes = Number(newCampaign.impressoes) || 0;
    let cliques = Number(newCampaign.cliques) || 0;

    // Intelligent derivation of CPC/CPM if one is missing.
    if (cpc > 0 && ctr > 0 && cpm === 0) {
        cpm = cpc * ctr * 1000;
    } else if (cpm > 0 && ctr > 0 && cpc === 0) {
        cpc = (cpm / 1000) / ctr;
    }

    // Main calculation logic
    if (budget > 0) {
        // Prioritize buying unit.
        if (newCampaign.unidadeCompra === 'CPM' && cpm > 0) {
            impressoes = (budget / cpm) * 1000;
            cliques = impressoes * ctr;
            if(cliques > 0) cpc = budget / cliques; else if(ctr === 0 && cpc === 0) cpc = 0;
        } else if (newCampaign.unidadeCompra === 'CPC' && cpc > 0) {
            cliques = budget / cpc;
            if(ctr > 0) {
                impressoes = cliques / ctr;
                cpm = (budget / impressoes) * 1000;
            }
        } else { // Fallback if buying unit metric is zero
            if(cpm > 0) {
                impressoes = (budget / cpm) * 1000;
                cliques = impressoes * ctr;
            } else if (cpc > 0) {
                cliques = budget / cpc;
                if(ctr > 0) impressoes = cliques / ctr;
            }
        }
    } else if (impressoes > 0) {
        cliques = impressoes * ctr;
        if (cpm > 0) budget = (impressoes / 1000) * cpm;
        else if (cpc > 0) budget = cliques * cpc;
    } else if (cliques > 0) {
        if(ctr > 0) impressoes = cliques / ctr;
        if (cpc > 0) budget = cliques * cpc;
        else if (cpm > 0 && impressoes > 0) budget = (impressoes / 1000) * cpm;
    }

    const conversoes = cliques * taxaConversao;
    const cpa = conversoes > 0 ? budget / conversoes : 0;
    const visitas = cliques * connectRate;
    const orcamentoDiario = budget / 30.4;

    return {
        ...newCampaign,
        budget,
        cpc,
        cpm,
        ctr: ctr * 100,
        taxaConversao: taxaConversao * 100,
        connectRate: connectRate * 100,
        impressoes: Math.round(impressoes),
        cliques: Math.round(cliques),
        conversoes: Math.round(conversoes),
        cpa,
        visitas: Math.round(visitas),
        orcamentoDiario,
    } as Campaign;
};

export const calculateKPIs = (campaign: Partial<Campaign>): Campaign => {
    // If the campaign from AI is missing core metrics, apply defaults based on its type.
    const objective = campaign.tipoCampanha;
    if (objective && DEFAULT_METRICS_BY_OBJECTIVE[objective]) {
        const defaults = DEFAULT_METRICS_BY_OBJECTIVE[objective];
        // The order here is important. `...campaign` comes last so its values (like budget) overwrite the defaults.
        const campaignWithDefaults = { ...defaults, ...campaign };
        return recalculateCampaignMetrics(campaignWithDefaults);
    }
    // Fallback for campaigns without a matching type or for manual creation
    return recalculateCampaignMetrics(campaign);
};

export const calculatePlanSummary = (planData: PlanData): { summary: SummaryData; monthlySummary: MonthlySummary } => {
    const allCampaigns: Campaign[] = Object.values(planData.months || {}).flat();

    const summary: SummaryData = allCampaigns.reduce((acc, campaign) => {
        const budget = Number(campaign.budget) || 0;
        acc.budget += budget;
        acc.impressoes += Number(campaign.impressoes) || 0;
        acc.alcance += Number(campaign.alcance) || 0;
        acc.cliques += Number(campaign.cliques) || 0;
        acc.conversoes += Number(campaign.conversoes) || 0;
        if(campaign.canal) {
            acc.channelBudgets[campaign.canal] = (acc.channelBudgets[campaign.canal] || 0) + budget;
        }
        return acc;
    }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {} } as SummaryData);

    summary.ctr = summary.impressoes > 0 ? (summary.cliques / summary.impressoes) * 100 : 0;
    summary.cpc = summary.cliques > 0 ? summary.budget / summary.cliques : 0;
    summary.cpm = summary.impressoes > 0 ? (summary.budget / summary.impressoes) * 1000 : 0;
    summary.cpa = summary.conversoes > 0 ? summary.budget / summary.conversoes : 0;
    summary.taxaConversao = summary.cliques > 0 ? (summary.conversoes / summary.cliques) * 100 : 0;
    
    const numMonths = Object.keys(planData.months || {}).length;
    if (numMonths > 0) {
        summary.orcamentoDiario = summary.budget / (numMonths * 30.4);
    } else {
        summary.orcamentoDiario = 0;
    }
    
    const monthlySummary: MonthlySummary = {};
    Object.entries(planData.months || {}).forEach(([month, campaigns]) => {
        monthlySummary[month] = campaigns.reduce((acc, c) => {
            const budget = Number(c.budget) || 0;
            acc.budget += budget;
            acc.impressoes += Number(c.impressoes) || 0;
            acc.alcance += Number(c.alcance) || 0;
            acc.cliques += Number(c.cliques) || 0;
            acc.conversoes += Number(c.conversoes) || 0;
            return acc;
        }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {}} as SummaryData);
        monthlySummary[month].taxaConversao = monthlySummary[month].cliques > 0 ? (monthlySummary[month].conversoes / monthlySummary[month].cliques) * 100 : 0;
    });

    return { summary, monthlySummary };
};

// --- PLAN CREATION ---

export const createNewEmptyPlan = (userId: string): PlanData => {
    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        campaignName: 'Novo Plano em Branco',
        objective: '',
        targetAudience: '',
        location: '',
        totalInvestment: 10000,
        logoUrl: '',
        customFormats: [],
        utmLinks: [],
        months: {},
        creatives: {},
        adGroups: []
    };
    dbService.savePlan(userId, newPlan);
    return newPlan;
};

export const createNewPlanFromTemplate = (userId: string): PlanData => {
    const currentYear = new Date().getFullYear();
    const awarenessDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Awareness'];
    const leadsDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Geração de Leads'];
    const conversionDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Conversão'];

    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        campaignName: 'Plano de Lançamento (Modelo)',
        objective: 'Lançar novo produto de skincare e gerar 100 vendas iniciais.',
        targetAudience: 'Mulheres de 25-45 anos interessadas em beleza, bem-estar e produtos sustentáveis.',
        location: 'Brasil',
        totalInvestment: 50000,
        logoUrl: 'https://placehold.co/400x300/f472b6/ffffff?text=BeautyCo',
        customFormats: [],
        utmLinks: [],
        creatives: {},
        adGroups: [],
        months: {
            [`${currentYear}-Julho`]: [
                calculateKPIs({
                    ...awarenessDefaults,
                    id: 'c_template_1',
                    tipoCampanha: 'Awareness',
                    etapaFunil: 'Topo',
                    canal: 'Meta Ads',
                    formato: 'Stories/Reels',
                    objetivo: 'Aumentar reconhecimento da marca',
                    kpi: 'Alcance e Impressões',
                    publicoAlvo: 'Público frio com interesse em skincare',
                    budget: 5000,
                })
            ],
            [`${currentYear}-Agosto`]: [
                 calculateKPIs({
                    ...leadsDefaults,
                    id: 'c_template_2',
                    tipoCampanha: 'Geração de Leads',
                    etapaFunil: 'Meio',
                    canal: 'Google Ads',
                    formato: 'Search',
                    objetivo: 'Capturar leads qualificados',
                    kpi: 'CPL e Taxa de Conversão de Landing Page',
                    publicoAlvo: 'Pessoas buscando por "rotina de skincare"',
                    budget: 15000,
                }),
                calculateKPIs({
                    ...conversionDefaults,
                    id: 'c_template_3',
                    tipoCampanha: 'Conversão',
                    etapaFunil: 'Fundo',
                    canal: 'Meta Ads',
                    formato: 'Carrossel',
                    objetivo: 'Gerar vendas do novo produto',
                    kpi: 'CPA e ROAS',
                    publicoAlvo: 'Retargeting de visitantes do site e leads',
                    budget: 10000,
                })
            ]
        },
    };
    dbService.savePlan(userId, newPlan);
    return newPlan;
};

// --- DATA EXPORT ---
const escapeCSV = (str: any): string => {
    const s = String(str || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const buildPdfHtml = (plan: PlanData, summary: SummaryData, monthlySummary: MonthlySummary, t: (key: string, substitutions?: Record<string, string>) => string): string => {
    const styles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { 
                font-family: 'Roboto', sans-serif; 
                font-size: 9px; 
                color: #333;
                background-color: #fff;
            }
            .page {
                width: 267mm;
                min-height: 180mm;
                padding: 15mm;
                margin: 0 auto;
                page-break-after: always;
                background-color: white;
                box-sizing: border-box;
            }
            .page:last-child {
                page-break-after: avoid;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #007bff;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .header img {
                max-width: 150px;
                max-height: 75px;
                object-fit: contain;
                margin-bottom: 10px;
            }
            .header h1 {
                font-size: 24px;
                color: #003366;
                margin: 0;
            }
            .section-title {
                font-size: 18px;
                color: #003366;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 8px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 5px;
                text-align: left;
                word-break: break-word;
            }
            th {
                background-color: #f0f6ff;
                font-weight: bold;
                color: #003366;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
            .summary-item, .info-item {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
            }
            .summary-item dt, .info-item dt {
                font-weight: bold;
                color: #555;
                font-size: 10px;
            }
            .summary-item dd, .info-item dd {
                margin-left: 0;
                font-size: 14px;
                color: #003366;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 8px;
                color: #777;
            }
        </style>
    `;

    const summaryPage = `
        <div class="page">
            <div class="header">
                ${plan.logoUrl ? `<img src="${plan.logoUrl}" alt="Logo">` : ''}
                <h1>${t('media_plan')}: ${plan.campaignName}</h1>
            </div>
            
            <div class="section-title">${t('Resumo do Plano')}</div>
            <div class="summary-grid">
                <div class="info-item"><dt>${t('Objetivo Geral')}</dt><dd>${plan.objective}</dd></div>
                <div class="info-item"><dt>${t('Público-Alvo Principal')}</dt><dd>${plan.targetAudience}</dd></div>
            </div>

            <div class="section-title">${t('Métricas Estimadas')} (${t('Totais')})</div>
            <table>
                <thead>
                    <tr>
                        <th>${t('Investimento Previsto')}</th>
                        <th>${t('Impressões')}</th>
                        <th>${t('Cliques')}</th>
                        <th>${t('Conversões')}</th>
                        <th>${t('CTR (%)')}</th>
                        <th>${t('CPA (R$)')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${formatCurrency(summary.budget)}</td>
                        <td>${formatNumber(summary.impressoes)}</td>
                        <td>${formatNumber(summary.cliques)}</td>
                        <td>${formatNumber(summary.conversoes)}</td>
                        <td>${formatPercentage(summary.ctr)}</td>
                        <td>${formatCurrency(summary.cpa)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">${t('Investimento por Canal')}</div>
            <table>
                <thead>
                    <tr><th>${t('Canal')}</th><th>${t('Budget')}</th><th>% Share</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(summary.channelBudgets).map(([channel, budget]) => `
                        <tr>
                            <td>${channel}</td>
                            <td>${formatCurrency(budget)}</td>
                            <td>${formatPercentage((budget / summary.budget) * 100)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                &copy; ${new Date().getFullYear()} MasterPlan AI. ${t('Todos os direitos reservados.')}
            </div>
        </div>
    `;

    const monthlyPages = Object.keys(plan.months).sort(sortMonthKeys).map(monthKey => {
        const monthName = monthKey.split('-').reverse().map(p => t(p)).join(' ');
        const campaigns = plan.months[monthKey];
        const monthSummary = monthlySummary[monthKey];
        
        const getUnitValue = (c: Campaign) => {
            switch (c.unidadeCompra) {
                case 'CPC': return formatCurrency(c.cpc);
                case 'CPM': return formatCurrency(c.cpm);
                default: return 'N/A';
            }
        };
        
        const aggregateCTR = monthSummary.impressoes > 0 ? (monthSummary.cliques / monthSummary.impressoes) * 100 : 0;
        const aggregateConvRate = monthSummary.cliques > 0 ? (monthSummary.conversoes / monthSummary.cliques) * 100 : 0;
        const aggregateCPA = monthSummary.conversoes > 0 ? (monthSummary.budget / monthSummary.conversoes) : 0;

        return `
            <div class="page">
                <div class="header">
                    <h1>${t('Plano de Mídia - {month}', { month: monthName })}</h1>
                </div>
                <div class="section-title">${t('Campanhas')}</div>
                <table>
                    <thead>
                        <tr>
                            <th>${t('Tipo Campanha')}</th>
                            <th>${t('Etapa Funil')}</th>
                            <th>${t('Canal')}</th>
                            <th>${t('Formato')}</th>
                            <th style="width:15%">${t('Objetivo')}</th>
                            <th>${t('Budget')}</th>
                            <th>${t('% Share')}</th>
                            <th>${t('Unidade de Compra')}</th>
                            <th>${t('Valor da Unidade (R$)')}</th>
                            <th>${t('Impressões')}</th>
                            <th>${t('Cliques')}</th>
                            <th>${t('CTR (%)')}</th>
                            <th>${t('Conversões')}</th>
                            <th>${t('Taxa de Conversão (%)')}</th>
                            <th>${t('CPA (R$)')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaigns.map(c => {
                            const share = plan.totalInvestment > 0 ? (Number(c.budget || 0) / plan.totalInvestment) * 100 : 0;
                            return `
                            <tr>
                                <td>${c.tipoCampanha || ''}</td>
                                <td>${c.etapaFunil || ''}</td>
                                <td>${c.canal || ''}</td>
                                <td>${c.formato || ''}</td>
                                <td>${c.objetivo || ''}</td>
                                <td>${formatCurrency(c.budget)}</td>
                                <td>${formatPercentage(share)}</td>
                                <td>${c.unidadeCompra || ''}</td>
                                <td>${getUnitValue(c)}</td>
                                <td>${formatNumber(c.impressoes)}</td>
                                <td>${formatNumber(c.cliques)}</td>
                                <td>${formatPercentage(c.ctr)}</td>
                                <td>${formatNumber(c.conversoes)}</td>
                                <td>${formatPercentage(c.taxaConversao)}</td>
                                <td>${formatCurrency(c.cpa)}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background-color: #f0f6ff;">
                            <td colspan="5">${t('Totais do Mês')}</td>
                            <td>${formatCurrency(monthSummary.budget)}</td>
                            <td>${formatPercentage(plan.totalInvestment > 0 ? (monthSummary.budget / plan.totalInvestment) * 100 : 0)}</td>
                            <td colspan="2"></td>
                            <td>${formatNumber(monthSummary.impressoes)}</td>
                            <td>${formatNumber(monthSummary.cliques)}</td>
                            <td>${formatPercentage(aggregateCTR)}</td>
                            <td>${formatNumber(monthSummary.conversoes)}</td>
                            <td>${formatPercentage(aggregateConvRate)}</td>
                            <td>${formatCurrency(aggregateCPA)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }).join('');

    return `<div id="pdf-report-content">${styles}${summaryPage}${monthlyPages}</div>`;
};


export const exportPlanAsPDF = async (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const { summary, monthlySummary } = calculatePlanSummary(plan);
    const reportHTML = buildPdfHtml(plan, summary, monthlySummary, t);
    
    // Create a temporary container for rendering the HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Position off-screen
    container.style.top = '0';
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    try {
        const pdf = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Select all elements that should be a separate page
        const pages = container.querySelectorAll('.page');
        
        // Loop through each page element and add it to the PDF
        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i] as HTMLElement;
            
            // Use html2canvas to render the element to a canvas
            const canvas = await html2canvas(pageElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // For external images like logos
                logging: false,
                width: pageElement.scrollWidth,
                height: pageElement.scrollHeight,
                windowWidth: pageElement.scrollWidth,
                windowHeight: pageElement.scrollHeight,
            });
            
            // Calculate the aspect ratio to fit the canvas image onto the PDF page
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const aspectRatio = imgWidth / imgHeight;
            
            let finalWidth = pdfWidth;
            let finalHeight = pdfWidth / aspectRatio;
            
            // If the calculated height is greater than the PDF page height, scale by height instead
            if (finalHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * aspectRatio;
            }

            // Add a new page for all but the first element
            if (i > 0) {
                pdf.addPage();
            }

            // Add the canvas image to the PDF, centered if it's smaller than the page
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = (pdfHeight - finalHeight) / 2;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        }

        // Save the generated PDF
        pdf.save(`${plan.campaignName.replace(/ /g, '_') || 'media-plan'}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert('An error occurred while generating the PDF.');
    } finally {
        // Clean up by removing the temporary container from the DOM
        document.body.removeChild(container);
    }
};

export const exportCreativesAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = ['Channel', 'Group Name', 'Context', 'Type', 'Text'];
    let csvContent = headers.join(',') + '\r\n';

    if (!plan.creatives) return;

    for (const channel in plan.creatives) {
        plan.creatives[channel].forEach(group => {
            group.headlines.forEach(headline => {
                const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Títulos (Headlines)')),
                    escapeCSV(headline)
                ];
                csvContent += row.join(',') + '\r\n';
            });
            (group.longHeadlines || []).forEach(longHeadline => {
                 const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Títulos Longos (Long Headlines)')),
                    escapeCSV(longHeadline)
                ];
                csvContent += row.join(',') + '\r\n';
            });
            group.descriptions.forEach(description => {
                const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Descrições (Descriptions)')),
                    escapeCSV(description)
                ];
                csvContent += row.join(',') + '\r\n';
            });
        });
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-creatives.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const exportCreativesAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `Plano de Mídia: ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;

    if (!plan.creatives || Object.keys(plan.creatives).length === 0) {
        txtContent += 'Nenhum criativo encontrado.';
    } else {
        for (const channel in plan.creatives) {
            txtContent += `Canal: ${channel}\n`;
            txtContent += `-----------------------------------------\n`;
            plan.creatives[channel].forEach(group => {
                txtContent += `\nGrupo de Criativos: ${group.name}\n`;
                txtContent += `Contexto: ${group.context || 'N/A'}\n\n`;
                
                txtContent += `>> ${t('Títulos (Headlines)')}:\n`;
                group.headlines.forEach(headline => {
                    txtContent += `- ${headline || ''}\n`;
                });
                txtContent += `\n`;

                if(group.longHeadlines && group.longHeadlines.length > 0) {
                     txtContent += `>> ${t('Títulos Longos (Long Headlines)')}:\n`;
                    group.longHeadlines.forEach(longHeadline => {
                        txtContent += `- ${longHeadline || ''}\n`;
                    });
                    txtContent += `\n`;
                }

                txtContent += `>> ${t('Descrições (Descriptions)')}:\n`;
                group.descriptions.forEach(description => {
                    txtContent += `- ${description || ''}\n`;
                });
                txtContent += `\n\n`;
            });
        }
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-creatives.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const exportUTMLinksAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = [
        t('Data'),
        t('URL do Site *'),
        t('Campaign Source *'),
        t('Campaign Medium *'),
        t('Campaign Name *'),
        t('Campaign Term'),
        t('Campaign Content'),
        t('URL Completa'),
    ];
    let csvContent = headers.join(',') + '\r\n';

    if (!plan.utmLinks || plan.utmLinks.length === 0) return;

    plan.utmLinks.forEach(link => {
        const row = [
            escapeCSV(new Date(link.createdAt).toLocaleDateString()),
            escapeCSV(link.url),
            escapeCSV(link.source),
            escapeCSV(link.medium),
            escapeCSV(link.campaign),
            escapeCSV(link.term),
            escapeCSV(link.content),
            escapeCSV(link.fullUrl)
        ];
        csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    const url = URL.createObjectURL(blob);
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${plan.campaignName}-utm-links.csv`);
    downloadLink.style.visibility = 'hidden';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

export const exportUTMLinksAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `${t('Links Salvos')} - ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;

    if (!plan.utmLinks || plan.utmLinks.length === 0) {
        txtContent += t('Nenhum link salvo ainda.');
    } else {
        plan.utmLinks.forEach(link => {
            txtContent += `----------------------------------------\n`;
            txtContent += `${t('Data')}: ${new Date(link.createdAt).toLocaleDateString()}\n`;
            txtContent += `${t('Campaign Name *')}: ${link.campaign}\n`;
            txtContent += `${t('URL do Site *')}: ${link.url}\n`;
            txtContent += `${t('Campaign Source *')}: ${link.source}\n`;
            txtContent += `${t('Campaign Medium *')}: ${link.medium}\n`;
            if (link.term) txtContent += `${t('Campaign Term')}: ${link.term}\n`;
            if (link.content) txtContent += `${t('Campaign Content')}: ${link.content}\n`;
            txtContent += `\n${t('URL Completa')}:\n${link.fullUrl}\n`;
            txtContent += `----------------------------------------\n\n`;
        });
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    const url = URL.createObjectURL(blob);
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${plan.campaignName}-utm-links.txt`);
    downloadLink.style.visibility = 'hidden';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

export const exportGroupedKeywordsAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = [
        t('ad_group_column'),
        t('keyword'),
        t('search_volume'),
        t('estimated_clicks'),
        t('min_cpc'),
        t('max_cpc'),
    ];
    let csvContent = headers.join(',') + '\r\n';

    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');
    
    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    sortedGroups.forEach(group => {
        if (group.keywords.length > 0) {
            group.keywords.forEach(kw => {
                const row = [
                    escapeCSV(group.name),
                    escapeCSV(kw.keyword),
                    escapeCSV(kw.volume),
                    escapeCSV(kw.clickPotential),
                    escapeCSV(kw.minCpc),
                    escapeCSV(kw.maxCpc),
                ];
                csvContent += row.join(',') + '\r\n';
            });
        }
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-keywords.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const buildGroupedKeywordsPdfHtml = (plan: PlanData, t: (key: string) => string): string => {
    const styles = `
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
            h1 { font-size: 18px; color: #003366; text-align: center; margin-bottom: 20px; }
            h2 { font-size: 14px; color: #003366; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
        </style>
    `;

    let content = `<h1>${t('export_all_keywords')} - ${plan.campaignName}</h1>`;

    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');
    
    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    sortedGroups.forEach(group => {
        if (group.keywords && group.keywords.length > 0) {
            content += `<h2>${group.name}</h2>`;
            content += `
                <table>
                    <thead>
                        <tr>
                            <th>${t('keyword')}</th>
                            <th>${t('search_volume')}</th>
                            <th>${t('estimated_clicks')}</th>
                            <th>${t('min_cpc')}</th>
                            <th>${t('max_cpc')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.keywords.map(kw => `
                            <tr>
                                <td>${kw.keyword}</td>
                                <td>${formatNumber(kw.volume)}</td>
                                <td>${formatNumber(kw.clickPotential)}</td>
                                <td>${formatCurrency(kw.minCpc)}</td>
                                <td>${formatCurrency(kw.maxCpc)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    });

    return `<div id="pdf-keywords-content" style="padding: 20px;">${styles}${content}</div>`;
};


export const exportGroupedKeywordsToPDF = async (plan: PlanData, t: (key: string) => string) => {
    const reportHTML = buildGroupedKeywordsPdfHtml(plan, t);
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width for rendering
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    try {
        const content = container.querySelector('#pdf-keywords-content') as HTMLElement;
        const canvas = await html2canvas(content, { scale: 2 });
        
        const pdf = new jsPDF('p', 'mm', 'a4'); // portrait, mm, A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const aspectRatio = imgWidth / imgHeight;
        
        let finalWidth = pdfWidth - 20; // with margin
        let finalHeight = finalWidth / aspectRatio;
        
        const xOffset = 10;
        let yOffset = 10;

        // Basic handling for content that might be taller than one page
        const pageHeightInCanvas = (pdfHeight - 2 * yOffset) * (imgWidth / finalWidth);

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas.toDataURL('image/png', 0.9), 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        heightLeft -= pageHeightInCanvas;

        while (heightLeft > 0) {
            position += pageHeightInCanvas;
            pdf.addPage();
            pdf.addImage(canvas.toDataURL('image/png', 0.9), 'PNG', xOffset, yOffset - position, finalWidth, finalHeight);
            heightLeft -= pageHeightInCanvas;
        }
        
        pdf.save(`${plan.campaignName}-keywords.pdf`);

    } catch (error) {
        console.error("Error generating keywords PDF:", error);
        alert('An error occurred while generating the PDF.');
    } finally {
        document.body.removeChild(container);
    }
};

export const exportGroupedKeywordsAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `${t('ad_groups')} - ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;
    
    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');
    
    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    if (sortedGroups.length > 0) {
        sortedGroups.forEach(group => {
            if (group.keywords.length > 0) {
                txtContent += `${t('ad_group_column')}: ${group.name}\n`;
                txtContent += `-----------------------------------------\n`;
                group.keywords.forEach(kw => {
                    txtContent += `- ${kw.keyword}\n`;
                });
                txtContent += `\n`;
            }
        });
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-keywords.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- AI API CALLS ---
export const callGeminiAPI = async (prompt: string, isJsonOutput: boolean = false): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            ...(isJsonOutput && { config: { responseMimeType: "application/json" } })
        });

        let textResponse = response.text.trim();
        
        // More robust stripping of markdown fences (e.g., ```json or ```html)
        textResponse = textResponse.replace(/^```(?:json|html)?\s*\n/, '').replace(/\n?```$/, '').trim();
        
        if (isJsonOutput) {
            try {
                return JSON.parse(textResponse);
            } catch (e) {
                console.error("Failed to parse JSON response from Gemini:", e, "Raw response:", textResponse);
                throw new Error("Invalid JSON response from AI.");
            }
        }
        return textResponse;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};

export const generateAIPlan = async (prompt: string, language: LanguageCode): Promise<Partial<PlanData>> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';

    // Step 1: Dynamically determine the months for the plan from the user's prompt
    const periodRegex = /(\d+)\s*(meses|mês|months|month)/i;
    const periodMatch = prompt.match(periodRegex);
    // Use a robust default of 3 months if not specified
    const numberOfMonths = periodMatch ? parseInt(periodMatch[1], 10) : 3;

    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const planMonths = Array.from({ length: numberOfMonths }, (_, i) => {
        const monthIndex = (currentMonthIndex + i) % 12;
        const year = currentYear + Math.floor((currentMonthIndex + i) / 12);
        return `${year}-${MONTHS_LIST[monthIndex]}`;
    });

    const monthsJsonStructure = planMonths.map(month => `"${month}": [ /* list of campaigns for ${month} */ ]`).join(',\n            ');
    
    // Step 2: Extract budget information to guide the AI
    const budgetRegex = /(?:R\$|R\$ ?|budget of|orçamento de)\s*([\d.,]+(?:,\d{2})?)\s*(?:por mês|mensal|monthly)/i;
    const budgetMatch = prompt.match(budgetRegex);
    let totalInvestmentInstruction = `totalInvestment: A number representing the total estimated budget for the ${numberOfMonths} months. You must calculate this from the user's prompt.`;
    if (budgetMatch) {
        // Handle numbers like "5.000,00" or "6000"
        const monthlyBudget = parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(monthlyBudget)) {
            const totalBudget = monthlyBudget * numberOfMonths;
            totalInvestmentInstruction = `totalInvestment: ${totalBudget}, /* This was pre-calculated from the user's monthly budget of ${monthlyBudget} for ${numberOfMonths} months. Use this exact total. */`;
        }
    }

    const aiPrompt = `
        You are a world-class media planning expert. Your task is to create a detailed, strategic media plan based on the user's prompt.
        User prompt: "${prompt}"

        **CRITICAL INSTRUCTIONS:**
        1.  **Period:** The plan MUST span exactly ${numberOfMonths} months. This is a strict requirement.
        2.  **Budget:** Adhere strictly to the budget specified in the user prompt. The total sum of all campaign budgets MUST equal the final 'totalInvestment'.
        3.  **Output Format:** The output MUST be a single, valid JSON object. Do not include any text, explanations, or markdown fences like \`\`\`json before or after the JSON.

        **JSON Structure:**
        {
          "campaignName": "A creative and relevant name for the plan based on the user prompt",
          "objective": "A clear, measurable main objective, derived from the user prompt",
          "targetAudience": "A detailed description of the main target audience from the prompt",
          "location": "The main location for the campaigns (e.g., Brazil, São Paulo), extracted from the prompt",
          ${totalInvestmentInstruction}
          "logoUrl": "A placeholder logo URL from a service like placehold.co that semantically matches the business type",
          "aiImagePrompt": "A detailed, vivid DALL-E or Midjourney style prompt to generate a hero image for this campaign.",
          "months": {
            ${monthsJsonStructure}
          }
        }

        **Campaign Object Structure (for each campaign inside the 'months' arrays):**
        - "tipoCampanha": Strategically choose from: ${JSON.stringify(OPTIONS.tipoCampanha)}. A good strategy often starts with Awareness/Alcance in early months and moves to Conversão/Retargeting in later months.
        - "etapaFunil": Choose from ${JSON.stringify(OPTIONS.etapaFunil)}, corresponding to the 'tipoCampanha'.
        - "canal": Choose the most appropriate channel from: ${JSON.stringify(OPTIONS.canal)}.
        - "formato": Based on the channel, choose a suitable format from the list: ${JSON.stringify(CHANNEL_FORMATS)}.
        - "objetivo": A specific, short objective for this particular campaign.
        - "kpi": The main Key Performance Indicator for this campaign (e.g., "CPM", "CPC", "CPA", "CTR").
        - "publicoAlvo": A specific audience segment for this campaign (e.g., "Retargeting de visitantes do site", "Público de interesse em moda sustentável").
        - "budget": A numeric portion of the totalInvestment. Distribute it logically across all months and campaigns.
        - "unidadeCompra": Choose from ${JSON.stringify(OPTIONS.unidadeCompra)} based on the campaign objective.

        ${langInstruction}
    `;
    
    return callGeminiAPI(aiPrompt, true);
};

export const generateAIKeywords = async (planData: PlanData, mode: 'seed' | 'prompt', input: string, language: LanguageCode, keywordCount: string): Promise<KeywordSuggestion[]> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';
    const promptContext = `
        Plan Objective: ${planData.objective}
        Target Audience: ${planData.targetAudience}
        Business description from prompt: ${mode === 'prompt' ? input : 'N/A'}
        Seed Keywords: ${mode === 'seed' ? input : 'N/A'}
    `;

    const aiPrompt = `
        You are a Google Ads keyword research expert. Based on the provided context, generate a list of ${keywordCount} highly relevant keywords.
        The output MUST be a valid JSON object with a single key "keywords" which contains an array of keyword objects.
        Do not include any text, explanation, or markdown fences like \`\`\`json around the JSON output.
        
        Each keyword object in the array must have this exact structure:
        {
            "keyword": "the suggested keyword phrase",
            "volume": a number representing estimated monthly search volume (e.g., 1500),
            "clickPotential": a number representing estimated monthly clicks based on the search volume and general competitiveness (e.g., 120),
            "minCpc": a number for the minimum CPC bid in BRL (e.g., 0.85),
            "maxCpc": a number for the maximum CPC bid in BRL (e.g., 3.50)
        }

        Context:
        ${promptContext}

        ${langInstruction}
        Generate a diverse list including short-tail, long-tail, and question-based keywords.
    `;
    const response = await callGeminiAPI(aiPrompt, true);
    if (response && response.keywords && Array.isArray(response.keywords)) {
        return response.keywords;
    }
    throw new Error("Invalid response from AI for keywords");
};

export const generateAIImages = async (prompt: string, images?: { base64: string; mimeType: string }[]): Promise<GeneratedImage[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    if (images && images.length > 0) {
        // --- Image Editing Task ---
        try {
            const imageParts = images.map(image => ({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.base64,
                },
            }));
            const textPart = { text: prompt };
            const allParts = [...imageParts, textPart];

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: allParts },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            const imagePartsFromResponse = response.candidates[0].content.parts.filter(part => part.inlineData);

            if (imagePartsFromResponse.length > 0 && imagePartsFromResponse[0].inlineData) {
                // The model returns one image; we return it in an array to match the function signature.
                // The aspect ratio of the edited image will be the same as the input. 
                // We use '1:1' as a placeholder since the exact ratio isn't known and the type requires a value.
                const generatedImage: GeneratedImage = {
                    base64: imagePartsFromResponse[0].inlineData.data,
                    aspectRatio: '1:1',
                };
                return [generatedImage];
            } else {
                 throw new Error("Image editing failed or returned no image part.");
            }
        } catch (error) {
            console.error("Error calling Gemini Image Editing API:", error);
            throw error;
        }
    } else {
        // --- Image Generation Task ---
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 2, // Generate two options for the user
                    outputMimeType: 'image/png',
                    aspectRatio: '1:1', // Always generate a square base image
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const validImages = response.generatedImages.map(img => ({
                    base64: img.image.imageBytes,
                    aspectRatio: '1:1' as AspectRatio,
                }));
                return validImages;
            } else {
                throw new Error("Image generation returned no images.");
            }
        } catch (error) {
            console.error(`Error generating images:`, error);
            throw new Error("Image generation failed.");
        }
    }
};