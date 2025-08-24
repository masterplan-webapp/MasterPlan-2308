

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanData, Campaign, User, LanguageCode, KeywordSuggestion, CreativeTextData, AdGroup, UTMLink, GeneratedImage, AspectRatio, SummaryData, MonthlySummary } from './types';
import { MONTHS_LIST, OPTIONS, CHANNEL_FORMATS, DEFAULT_METRICS_BY_OBJECTIVE } from "./constants";

// --- Gemini API Helper ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
export const recalculateCampaignMetrics = (campaign: Partial<Campaign>, changedField?: keyof Campaign, value?: any): Campaign => {
    let newCampaign: Partial<Campaign> = changedField ? { ...campaign, [changedField]: value } : { ...campaign };
    
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
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container.querySelector('#pdf-report-content')!, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: container.querySelector('.page')?.scrollWidth,
            windowWidth: container.querySelector('.page')?.scrollWidth,
        });

        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / pdfWidth;
        const canvasPageHeight = pageHeight * ratio;

        let yPos = 0;
        let pages = 0;
        while (yPos < canvasHeight) {
            if (pages > 0) {
                pdf.addPage();
            }
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvasWidth;
            pageCanvas.height = canvasPageHeight;
            const pageCtx = pageCanvas.getContext('2d');
            pageCtx?.drawImage(canvas, 0, yPos, canvasWidth, canvasPageHeight, 0, 0, canvasWidth, canvasPageHeight);
            
            pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pageHeight);
            
            yPos += canvasPageHeight;
            pages++;
        }

        pdf.save(`${plan.campaignName.replace(/ /g, '_') || 'media-plan'}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert('An error occurred while generating the PDF.');
    } finally {
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
    ];
    let csvContent = headers.join(',') + '\r\n';

    const groupedKeywords = plan.adGroups?.filter(g => g.id !== 'unassigned' && g.keywords.length > 0) || [];

    groupedKeywords.forEach(group => {
        group.keywords.forEach(kw => {
            const row = [
                escapeCSV(group.name),
                escapeCSV(kw.keyword),
            ];
            csvContent += row.join(',') + '\r\n';
        });
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

export const exportGroupedKeywordsAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `${t('ad_groups')} - ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;
    
    const groupedKeywords = plan.adGroups?.filter(g => g.id !== 'unassigned' && g.keywords.length > 0) || [];

    if (groupedKeywords.length > 0) {
        groupedKeywords.forEach(group => {
            txtContent += `${t('ad_group_column')}: ${group.name}\n`;
            txtContent += `-----------------------------------------\n`;
            group.keywords.forEach(kw => {
                txtContent += `- ${kw.keyword}\n`;
            });
            txtContent += `\n`;
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
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            ...(isJsonOutput && { config: { responseMimeType: "application/json" } })
        });

        let textResponse = response.text;
        
        if (isJsonOutput) {
            let jsonStr = textResponse.trim();
            const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
            const match = jsonStr.match(fenceRegex);
            if (match && match[2]) {
                jsonStr = match[2].trim();
            }
            try {
                return JSON.parse(jsonStr);
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

    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const nextThreeMonths = Array.from({ length: 3 }, (_, i) => {
        const monthIndex = (currentMonthIndex + i) % 12;
        const year = currentYear + Math.floor((currentMonthIndex + i) / 12);
        return `${year}-${MONTHS_LIST[monthIndex]}`;
    });

    const aiPrompt = `
        You are a media planning expert. Based on the user's prompt, create a comprehensive media plan.
        User prompt: "${prompt}"

        The output MUST be a valid JSON object. Do not include any text, explanation, or markdown fences like \`\`\`json around the JSON output.
        The JSON object should have the following structure:
        {
          "campaignName": "A creative and relevant name for the plan",
          "objective": "A clear, measurable main objective for the plan",
          "targetAudience": "A description of the main target audience",
          "location": "The main location for the campaigns (e.g., Brazil, São Paulo)",
          "totalInvestment": A number representing the total estimated budget for the 3 months,
          "logoUrl": "A placeholder logo URL from a service like placehold.co based on the business type",
          "aiImagePrompt": "A detailed DALL-E or Midjourney style prompt to generate a hero image for this campaign.",
          "months": {
            "${nextThreeMonths[0]}": [ /* list of campaigns for month 1 */ ],
            "${nextThreeMonths[1]}": [ /* list of campaigns for month 2 */ ],
            "${nextThreeMonths[2]}": [ /* list of campaigns for month 3 */ ]
          }
        }

        For each campaign inside the 'months' arrays, create a campaign object with these fields:
        - "tipoCampanha": Choose from ${JSON.stringify(OPTIONS.tipoCampanha)}
        - "etapaFunil": Choose from ${JSON.stringify(OPTIONS.etapaFunil)}
        - "canal": Choose from ${JSON.stringify(OPTIONS.canal)}
        - "formato": Based on the channel, choose a suitable format from ${JSON.stringify(CHANNEL_FORMATS)}
        - "objetivo": A specific, short objective for this particular campaign.
        - "kpi": The main Key Performance Indicator for this campaign.
        - "publicoAlvo": A specific audience for this campaign.
        - "budget": A portion of the totalInvestment. The sum of all campaign budgets should roughly equal totalInvestment.
        - "unidadeCompra": Choose from ${JSON.stringify(OPTIONS.unidadeCompra)}
        
        ${langInstruction}
        Distribute the budget logically across the months and campaigns based on a ramp-up strategy (e.g., less in month 1, more in months 2 & 3).
    `;
    return callGeminiAPI(aiPrompt, true);
};

export const generateAIKeywords = async (planData: PlanData, mode: 'seed' | 'prompt', input: string, language: LanguageCode): Promise<KeywordSuggestion[]> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';
    const promptContext = `
        Plan Objective: ${planData.objective}
        Target Audience: ${planData.targetAudience}
        Business description from prompt: ${mode === 'prompt' ? input : 'N/A'}
        Seed Keywords: ${mode === 'seed' ? input : 'N/A'}
    `;

    const aiPrompt = `
        You are a Google Ads keyword research expert. Based on the provided context, generate a list of 20-30 highly relevant keywords.
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

export const generateAIImages = async (prompt: string): Promise<GeneratedImage[]> => {
    const aspectRatios: AspectRatio[] = ["1:1", "16:9", "9:16", "3:4"];

   const imagePromises = aspectRatios.map(async (aspectRatio) => {
       try {
           const response = await ai.models.generateImages({
               model: 'imagen-3.0-generate-002',
               prompt: prompt,
               config: {
                   numberOfImages: 1,
                   outputMimeType: 'image/png',
                   aspectRatio: aspectRatio,
               },
           });

           if (response.generatedImages && response.generatedImages.length > 0) {
               return {
                   base64: response.generatedImages[0].image.imageBytes,
                   aspectRatio: aspectRatio,
               };
           }
       } catch (error) {
           console.error(`Error generating image for aspect ratio ${aspectRatio}:`, error);
       }
       return null;
   });

   const results = await Promise.all(imagePromises);
   const validImages = results.filter((img): img is GeneratedImage => img !== null);

   if (validImages.length === 0) {
       throw new Error("Image generation failed or returned no images.");
   }

   return validImages;
};