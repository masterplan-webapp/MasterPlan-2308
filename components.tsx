

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy as CopyIcon, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, Sun, Moon, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, LucideProps, AlertTriangle, KeyRound, Tags, Tag, ImageIcon, Video } from 'lucide-react';
import { useLanguage, useTheme, useAuth } from './contexts';
import { callGeminiAPI, formatCurrency, formatPercentage, formatNumber, recalculateCampaignMetrics, calculateKPIs, dbService, sortMonthKeys, generateAIKeywords, generateAIImages, exportCreativesAsCSV, exportCreativesAsTXT, exportUTMLinksAsCSV, exportUTMLinksAsTXT, exportGroupedKeywordsAsCSV, exportGroupedKeywordsAsTXT, calculatePlanSummary } from './services';
import { TRANSLATIONS, OPTIONS, COLORS, MONTHS_LIST, CHANNEL_FORMATS, DEFAULT_METRICS_BY_OBJECTIVE } from './constants';
import {
    PlanData, Campaign, CreativeTextData, UTMLink, MonthlySummary, SummaryData, KeywordSuggestion, AdGroup,
    CardProps, CharacterCountInputProps, AIResponseModalProps, CampaignModalProps, PlanDetailsModalProps,
    DashboardPageProps, MonthlyPlanPageProps, CreativeGroupProps, CopyBuilderPageProps, UTMBuilderPageProps, KeywordBuilderPageProps, CreativeBuilderPageProps,
    AddMonthModalProps, OnboardingPageProps, PlanSelectorPageProps, AISuggestionsModalProps,
    ChartCardProps, ChartsSectionProps, DashboardHeaderProps, RenamePlanModalProps, PlanCreationChoiceModalProps, AIPlanCreationModalProps,
    GeneratedImage,
    GeneratedVideo,
    AspectRatio,
    VideoBuilderPageProps
} from './types';

// MasterPlan Logo URLs
export const LOGO_LIGHT = "https://drive.google.com/thumbnail?id=12zbca1bSq5F3bN52DzwoTQhcfVmdruWy";
export const LOGO_DARK = "https://drive.google.com/thumbnail?id=130_QHuGV1iT2c3BCgjNepuzNMi9rmxz3";
export const ICON_LOGO = "https://drive.google.com/thumbnail?id=132HE4ri3Ghz1xKFbfBSGRZ2E6P6wUDW3";

// --- Custom Icon Components (defined before usage) ---
const EyeIcon = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const MousePointerClick = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/></svg>;
const CheckSquare = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
const TrendingUp = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const DollarSign = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const Target = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const VisitsIcon = (props: LucideProps) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;


const ChannelDisplay: React.FC<{ channel: string, className?: string }> = ({ channel, className }) => {
    // The component now just returns the channel name as text, removing the problematic icons.
    return (
        <span className={className}>{channel}</span>
    );
};


// --- Reusable UI Components ---
export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
    const baseClasses = "bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6";
    const clickableClasses = onClick ? "cursor-pointer hover:shadow-md transition-shadow" : "";
    return (
        <div className={`${baseClasses} ${clickableClasses} ${className}`} onClick={onClick}>
            {children}
        </div>
    );
};

export const CharacterCountInput: React.FC<CharacterCountInputProps> = ({ value, onChange, maxLength, placeholder, rows, onBlur }) => {
    const remaining = maxLength - value.length;
    const isError = remaining < 0;

    const commonProps = {
        value,
        onChange,
        maxLength,
        placeholder,
        onBlur,
        className: `w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 ${isError ? 'ring-red-500 border-red-500' : 'focus:ring-blue-500 focus:border-transparent'}`
    };

    return (
        <div className="w-full">
            {rows ? (
                <textarea {...commonProps} rows={rows}></textarea>
            ) : (
                <input type="text" {...commonProps} />
            )}
            <p className={`text-xs mt-1 text-right ${isError ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                {remaining}
            </p>
        </div>
    );
};

export const AIResponseModal: React.FC<AIResponseModalProps> = ({ isOpen, onClose, title, content, isLoading }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Sparkles className="text-blue-500"/> {title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <LoaderIcon className="animate-spin text-blue-500" size={40}/>
                        </div>
                    ) : (
                        <div className="prose prose-sm sm:prose-base dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }}/>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

export const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose, onSave, campaignData, month, planObjective, customFormats, onAddFormat }) => {
    const { t } = useLanguage();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [newFormat, setNewFormat] = useState('');
    const [isAddingFormat, setIsAddingFormat] = useState(false);
    const [isAISuggestionLoading, setIsAISuggestionLoading] = useState(false);
    const [aiSuggestion, setAISuggestion] = useState<string>('');

    useEffect(() => {
        if (isOpen && campaignData) {
            setCampaign(campaignData);
        } else if (isOpen) {
            const defaultMetrics = DEFAULT_METRICS_BY_OBJECTIVE['Tráfego']; // Default to Tráfego
            const newCampaign = calculateKPIs({
                id: `c_${new Date().getTime()}`,
                tipoCampanha: 'Tráfego',
                budget: 1000,
                ...defaultMetrics
            });
            setCampaign(newCampaign);
        } else {
            setCampaign(null);
            setAISuggestion('');
        }
    }, [isOpen, campaignData]);

    const handleChange = (field: keyof Campaign, value: any) => {
        if (!campaign) return;

        let newCampaign: Campaign = { ...campaign, [field]: value };

        if (field === 'tipoCampanha') {
            const defaults = DEFAULT_METRICS_BY_OBJECTIVE[value as string] || {};
            newCampaign = { ...newCampaign, ...defaults };
        }
        
        const recalculated = recalculateCampaignMetrics(newCampaign, field, value);
        setCampaign(recalculated);
    };

    const handleSave = () => {
        if (campaign) {
            onSave(month, campaign);
            onClose();
        }
    };
    
    const handleAddFormat = () => {
        if (newFormat.trim() && !isAddingFormat) {
            onAddFormat(newFormat.trim());
            setCampaign(prev => prev ? { ...prev, formato: newFormat.trim() } : null);
            setNewFormat('');
            setIsAddingFormat(false);
        }
    };

    const handleSuggestAudience = async () => {
        if (!campaign?.tipoCampanha || !campaign.canal || !campaign.objetivo) {
            alert(t('aiSuggestionPrereqAlert'));
            return;
        }
        setIsAISuggestionLoading(true);
        setAISuggestion('');
        try {
            const prompt = `Based on a media plan with the general objective "${planObjective}", generate a concise target audience suggestion (max 200 characters) for a specific campaign.
            Campaign Type: ${campaign.tipoCampanha}
            Channel: ${campaign.canal}
            Specific Objective: ${campaign.objetivo}
            
            Provide only the audience description text, with no preamble. For example: "Young professionals aged 25-35 interested in productivity software and tech news."`;
            
            const suggestion = await callGeminiAPI(prompt);
            setAISuggestion(suggestion);
        } catch (error) {
            console.error(error);
            setAISuggestion(t('Não foi possível gerar la sugestão. Tente novamente.'));
        } finally {
            setIsAISuggestionLoading(false);
        }
    };
    
    if (!isOpen || !campaign) return null;

    const availableFormats = [...new Set([...(CHANNEL_FORMATS[campaign?.canal || ''] || []), ...(customFormats || [])])];
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8 animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{campaignData ? t('Editar Campanha') : t('Nova Campanha')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    {/* Coluna 1: Planejamento */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b pb-2 mb-2">Planejamento Estratégico</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Tipo Campanha')}</label>
                                <select value={campaign.tipoCampanha || ''} onChange={(e) => handleChange('tipoCampanha', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.tipoCampanha.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Etapa Funil')}</label>
                                <select value={campaign.etapaFunil || ''} onChange={(e) => handleChange('etapaFunil', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.etapaFunil.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                         </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Canal')}</label>
                                <select value={campaign.canal || ''} onChange={(e) => handleChange('canal', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                     <option value="">{t('Selecione')}</option>
                                     {OPTIONS.canal.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Formato')}</label>
                                {isAddingFormat ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newFormat}
                                            onChange={(e) => setNewFormat(e.target.value)}
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                            placeholder="Nome do formato"
                                            autoFocus
                                        />
                                        <button onClick={handleAddFormat} className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm">{t('save')}</button>
                                        <button onClick={() => setIsAddingFormat(false)} className="mt-1 px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select 
                                            value={campaign.formato || ''} 
                                            onChange={(e) => handleChange('formato', e.target.value)} 
                                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={!campaign.canal}
                                        >
                                            <option value="">{t(campaign.canal ? 'Selecione' : 'Selecione um canal')}</option>
                                            {availableFormats.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <button onClick={() => setIsAddingFormat(true)} className="mt-1 p-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"><PlusCircle size={20} /></button>
                                    </div>
                                )}
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Objetivo')}</label>
                            <input type="text" value={campaign.objetivo || ''} onChange={(e) => handleChange('objetivo', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('KPI')}</label>
                            <input type="text" value={campaign.kpi || ''} onChange={(e) => handleChange('kpi', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Público-Alvo')}</label>
                           <textarea value={campaign.publicoAlvo || ''} onChange={(e) => handleChange('publicoAlvo', e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                           <button onClick={handleSuggestAudience} disabled={isAISuggestionLoading} className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50">
                                {isAISuggestionLoading ? <LoaderIcon size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {t('Sugerir Público com IA')}
                           </button>
                           {aiSuggestion && (
                               <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-800 dark:text-blue-200">
                                   <p>{aiSuggestion}</p>
                                   <button onClick={() => { handleChange('publicoAlvo', aiSuggestion); setAISuggestion(''); }} className="mt-2 text-xs font-bold hover:underline">{t('Aplicar')}</button>
                               </div>
                           )}
                        </div>
                        
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b pb-2 pt-4 mb-2">Orçamento e Compra</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Budget (R$)')}</label>
                                <input type="number" step="100" value={campaign.budget || ''} onChange={(e) => handleChange('budget', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Unidade de Compra')}</label>
                                <select value={campaign.unidadeCompra || ''} onChange={(e) => handleChange('unidadeCompra', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.unidadeCompra.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Coluna 2: Métricas */}
                    <div className="md:col-span-1 space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-700">
                         <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b pb-2 mb-2">{t('Métricas Estimadas')}</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Impressões')}</label>
                                <input type="number" value={Math.round(campaign.impressoes || 0)} onChange={(e) => handleChange('impressoes', parseInt(e.target.value, 10))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Cliques')}</label>
                                <input type="number" value={Math.round(campaign.cliques || 0)} onChange={(e) => handleChange('cliques', parseInt(e.target.value, 10))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('CTR (%)')}</label>
                                <input type="number" step="0.01" value={campaign.ctr || ''} onChange={(e) => handleChange('ctr', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('CPC (R$)')}</label>
                                <input type="number" step="0.01" value={Number(campaign.cpc).toFixed(2) || ''} onChange={(e) => handleChange('cpc', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('CPM (R$)')}</label>
                                <input type="number" step="0.01" value={Number(campaign.cpm).toFixed(2) || ''} onChange={(e) => handleChange('cpm', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                              </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Taxa de Conversão (%)')}</label>
                                <input type="number" step="0.01" value={campaign.taxaConversao || ''} onChange={(e) => handleChange('taxaConversao', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Connect Rate (%)')}</label>
                                <input type="number" step="1" value={campaign.connectRate || ''} onChange={(e) => handleChange('connectRate', parseFloat(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Conversões')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-200 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 text-sm font-semibold">{formatNumber(campaign.conversoes)}</p>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('Visitas')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-200 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 text-sm font-semibold">{formatNumber(campaign.visitas)}</p>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('CPA (R$)')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-200 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 text-sm font-semibold">{formatCurrency(campaign.cpa)}</p>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> {t('Salvar Campanha')}</button>
                </div>
            </div>
        </div>
    );
};

export const PlanDetailsModal: React.FC<PlanDetailsModalProps> = ({ isOpen, onClose, onSave, planData, onRename, onDuplicate }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [details, setDetails] = useState<Partial<Omit<PlanData, 'id' | 'months'>>>(planData);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isOpen) {
            setDetails(planData)
        }
    }, [isOpen, planData])

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(details);
        onClose();
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setDetails(prev => ({...prev, logoUrl: reader.result as string}))
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Configurações do Plano')}</h2>
                     <div className="flex items-center gap-2">
                         <button onClick={() => onRename(planData)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" title={t('Rename')}><Edit size={18} /></button>
                         <button onClick={() => onDuplicate(planData)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" title={t('Duplicate Plan')}><CopyIcon size={18} /></button>
                         <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                     </div>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Logotipo')}</label>
                            <img src={details.logoUrl || 'https://placehold.co/400x300/e2e8f0/e2e8f0'} alt="Logo" className="mt-1 w-full aspect-square object-cover rounded-md bg-gray-200 dark:bg-gray-700"/>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <Upload size={16} /> {t('Upload')}
                            </button>
                            <input
                                type="text"
                                value={details.logoUrl || ''}
                                onChange={(e) => setDetails(prev => ({ ...prev, logoUrl: e.target.value }))}
                                placeholder={t('Cole a URL do logotipo aqui')}
                                className="mt-2 w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                         </div>
                         <div className="sm:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Nome da Campanha')}</label>
                                <input type="text" value={details.campaignName || ''} readOnly className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Objetivo Geral')}</label>
                                <textarea value={details.objective || ''} onChange={(e) => setDetails(prev => ({...prev, objective: e.target.value}))} rows={3} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Público-Alvo Principal')}</label>
                                <textarea value={details.targetAudience || ''} onChange={(e) => setDetails(prev => ({...prev, targetAudience: e.target.value}))} rows={3} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Praça')}</label>
                            <input type="text" value={details.location || ''} onChange={(e) => setDetails(prev => ({...prev, location: e.target.value}))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Período')}</label>
                             <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 h-[42px] flex items-center">
                                {Object.keys(planData.months || {}).length} {t('Meses')}
                            </p>
                        </div>
                     </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Investimento Total Planejado (R$)')}</label>
                        <input type="number" value={details.totalInvestment || 0} onChange={(e) => setDetails(prev => ({...prev, totalInvestment: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> {t('save')}</button>
                </div>
            </div>
        </div>
    );
};

export const RenamePlanModal: React.FC<RenamePlanModalProps> = ({ isOpen, onClose, plan, onSave }) => {
    const { t } = useLanguage();
    const [newName, setNewName] = useState(plan.campaignName);

    useEffect(() => {
        setNewName(plan.campaignName);
    }, [plan.campaignName]);
    
    if(!isOpen) return null;

    const handleSave = () => {
        if(newName.trim()){
            onSave(plan.id, newName.trim());
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Rename Plan')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Plan Name')}</label>
                    <input 
                        id="plan-name"
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> {t('save')}</button>
                </div>
            </div>
        </div>
    );
};

export const AISuggestionsModal: React.FC<AISuggestionsModalProps> = ({ isOpen, onClose, isLoading, suggestions, onApplySuggestion, onApplyAllSuggestions, title }) => {
    const { t } = useLanguage();
    const [applied, setApplied] = useState<Record<string, number[]>>({});

    useEffect(() => {
        if (isOpen) {
            setApplied({});
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    const handleApply = (type: string, text: string, index: number) => {
        onApplySuggestion(type, text);
        setApplied(prev => ({
            ...prev,
            [type]: [...(prev[type] || []), index]
        }));
    };
    
    const handleApplyAll = (type: string, texts: string[]) => {
        if(onApplyAllSuggestions) onApplyAllSuggestions(type, texts);
        // Mark all as applied
        setApplied(prev => ({
            ...prev,
            [type]: texts.map((_, i) => i)
        }));
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Sparkles className="text-blue-500"/>
                        {title || t('Sugestões de Criativos (IA)')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                            <LoaderIcon className="animate-spin text-blue-500" size={40}/>
                            <p className="mt-4">{t('Gerando sugestões...')}</p>
                        </div>
                    ) : (
                        suggestions && Object.keys(suggestions).length > 0 ? (
                             <div className="space-y-6">
                                {Object.entries(suggestions).map(([type, texts]) => (
                                    <div key={type}>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-gray-100">{t(type)}</h3>
                                            {onApplyAllSuggestions && (
                                                <button 
                                                    onClick={() => handleApplyAll(type, texts)} 
                                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {t('Aplicar Todos')}
                                                </button>
                                            )}
                                        </div>
                                        <ul className="space-y-2">
                                            {texts.map((text, index) => {
                                                const isApplied = applied[type]?.includes(index);
                                                return (
                                                    <li key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                                        <p className="text-gray-800 dark:text-gray-200">{text}</p>
                                                        <button 
                                                            onClick={() => handleApply(type, text, index)}
                                                            disabled={isApplied}
                                                            className="px-3 py-1 text-xs font-semibold rounded-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                            style={{
                                                                backgroundColor: isApplied ? '#10B981' : '#3B82F6', // green-500 or blue-500
                                                                color: 'white'
                                                            }}
                                                        >
                                                            {isApplied ? (
                                                                <>
                                                                    <Check size={14}/> {t('Aplicado')}
                                                                </>
                                                            ) : (
                                                                t('Aplicar')
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                                <AlertTriangle size={40} className="mb-4 text-yellow-500"/>
                                <p>{t('Nenhuma sugestão gerada ou erro ao buscar sugestões.')}</p>
                             </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Page-Specific Components ---
export const LoginPage: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full text-center shadow-2xl">
                <img 
                  src={LOGO_DARK} 
                  alt="MasterPlan Logo" 
                  className="mx-auto h-16 mb-4"
                />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('Plano de Mídia com Inteligência')}</h1>
                <p className="mt-2 mb-8 text-gray-600 dark:text-gray-400">{t('A única ferramenta que o profissional de mídia paga precisa.')}</p>
                <button 
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-all duration-300"
                >
                    <svg className="w-6 h-6" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.089,5.571l6.19,5.238C42.022,36.213,44,30.556,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    {t('Entrar com Google')}
                </button>
            </Card>
        </div>
    );
};

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onPlanCreated }) => {
    const { t } = useLanguage();

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="max-w-4xl w-full text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('welcome_to_masterplan')}</h1>
                <p className="mt-2 mb-8 text-lg text-gray-600 dark:text-gray-400">{t('create_first_plan')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => onPlanCreated('ai')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:border-blue-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100"><Sparkles className="text-blue-500"/> {t('create_with_ai')}</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('ai_description')}</p>
                    </button>
                    <button onClick={() => onPlanCreated('template')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:border-green-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100"><FileText className="text-green-500"/> {t('create_from_template')}</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('template_description')}</p>
                    </button>
                    <button onClick={() => onPlanCreated('blank')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:border-gray-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100"><FilePlus2 className="text-gray-500"/> {t('start_blank')}</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('blank_description')}</p>
                    </button>
                </div>
            </Card>
        </div>
    );
};

export const PlanCreationChoiceModal: React.FC<PlanCreationChoiceModalProps> = ({ isOpen, onClose, onPlanCreated }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg text-center animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('create_new_plan')}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <button onClick={() => { onPlanCreated('ai'); onClose(); }} className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('create_with_ai')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('ai_description')}</p>
                    </button>
                    <button onClick={() => { onPlanCreated('blank'); onClose(); }} className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('start_blank')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('blank_description')}</p>
                    </button>
                    <button onClick={() => { onPlanCreated('template'); onClose(); }} className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('create_from_template')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('template_description')}</p>
                    </button>
                </div>
                 <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

export const AddMonthModal: React.FC<AddMonthModalProps> = ({ isOpen, onClose, onAddMonth, existingMonths }) => {
    const { t } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState('');

    const availableMonths = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const allPossibleMonths = [
            ...MONTHS_LIST.map(m => `${currentYear}-${m}`),
            ...MONTHS_LIST.map(m => `${nextYear}-${m}`)
        ];
        return allPossibleMonths.filter(m => !existingMonths.includes(m));
    }, [existingMonths]);

    useEffect(() => {
        if (isOpen) {
            setSelectedMonth(''); // Reset on open
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (selectedMonth) {
            onAddMonth(selectedMonth);
            onClose();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Adicionar Mês ao Plano')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Mês')}</label>
                        {availableMonths.length > 0 ? (
                            <select 
                                id="month-select"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="" disabled>{t('Selecione um mês')}</option>
                                {availableMonths.map(monthKey => {
                                    const [year, monthName] = monthKey.split('-');
                                    return <option key={monthKey} value={monthKey}>{t(monthName)} {year}</option>;
                                })}
                            </select>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">{t('Todos os meses já foram adicionados.')}</p>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button onClick={handleAdd} disabled={!selectedMonth || availableMonths.length === 0} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        <PlusCircle size={18} /> {t('Adicionar Mês')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AIPlanCreationModal: React.FC<AIPlanCreationModalProps> = ({ isOpen, onClose, onGenerate, isLoading, initialPrompt, title, buttonText, loadingText }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(initialPrompt || '');

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Sparkles className="text-blue-500" />{title || t('Crie seu Plano com IA')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">{t('Descreva seu negócio, objetivos e público')}</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={5}
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('Ex: Uma cafeteria em São Paulo focada em jovens profissionais. Objetivo: aumentar o fluxo na loja.')}
                        disabled={isLoading}
                    />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <LoaderIcon size={20} className="animate-spin" />
                                {loadingText || t('Gerando seu plano...')}
                            </>
                        ) : (
                            <>
                                <Wand2 size={18} />
                                {buttonText || t('Gerar Plano')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ShareLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    link: string;
}
export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, link }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const isError = !link.startsWith('http');

    const copyToClipboard = () => {
        if (isError) return;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Link2 className="text-blue-500" />{t('share_plan_title')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">{t('share_plan_desc')}</p>
                    <div className="relative">
                        <input
                            type="text"
                            value={link}
                            readOnly
                            className={`w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 pr-24 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-200 ${isError ? 'text-red-500' : ''}`}
                        />
                         <button onClick={copyToClipboard} disabled={isError || copied} className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-green-600 disabled:opacity-70">
                             {copied ? <><Check size={16}/> {t('copied')}</> : <><CopyIcon size={16}/> {t('copy_link')}</>}
                         </button>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('close')}</button>
                </div>
            </div>
        </div>
    )
}

interface ShareablePlanViewerProps {
    userId: string;
    planId: string;
}

export const ShareablePlanViewer: React.FC<ShareablePlanViewerProps> = ({ userId, planId }) => {
    const { t } = useLanguage();
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const fetchedPlan = dbService.getPlanById(userId, planId);
            if (fetchedPlan) {
                setPlan(fetchedPlan);
            } else {
                setError(t('plan_not_found'));
            }
        } catch (e) {
            console.error(e);
            setError(t('plan_not_found'));
        } finally {
            setLoading(false);
        }
    }, [userId, planId, t]);

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                <LoaderIcon className="animate-spin text-blue-600 dark:text-blue-400" size={48} />
                <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading_plan')}</p>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                <AlertTriangle className="text-red-500" size={48} />
                <p className="mt-4 text-red-600 dark:text-red-400 font-semibold">{error || t('plan_not_found')}</p>
                 <a href="/" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('Voltar ao Dashboard')}</a>
            </div>
        );
    }
    
    // NOTE: This shareable view is simplified and doesn't support complex navigation.
    // It will render a simplified dashboard view.
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            {plan.logoUrl && <img src={plan.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded"/>}
                            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{plan.campaignName}</h1>
                        </div>
                        <div className="text-right">
                           <p className="text-xs text-gray-500 dark:text-gray-400">{t('shared_by')}</p>
                           <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">MasterPlan AI</p>
                        </div>
                    </div>
                </div>
            </header>
            <main className="p-4 sm:p-6 lg:p-8">
                <DashboardPage
                    planData={plan}
                    onNavigate={() => {}} // No-op
                    onAddMonthClick={() => {}} // No-op
                    onRegeneratePlan={async () => {}} // No-op
                    isRegenerating={false}
                    isReadOnly={true}
                />
            </main>
        </div>
    );
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onProfileClick }) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="flex justify-between items-center mb-6">
            <img 
                src={LOGO_DARK} 
                alt="MasterPlan Logo" 
                className="h-12"
            />
            <div className="flex items-center gap-4">
                <button onClick={onProfileClick}>
                    <img src={user?.photoURL || 'https://placehold.co/100x100'} alt="User Profile" className="w-10 h-10 rounded-full"/>
                </button>
            </div>
        </div>
    );
};

export const PlanSelectorPage: React.FC<PlanSelectorPageProps> = ({ plans, onSelectPlan, onPlanCreated, user, onProfileClick, onDeletePlan }) => {
    const { t } = useLanguage();
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, planId: string) => {
        e.stopPropagation(); // Prevent card click
        setPlanToDelete(planId);
    };

    const confirmDelete = () => {
        if(planToDelete) {
            onDeletePlan(planToDelete);
            setPlanToDelete(null);
        }
    }
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <DashboardHeader onProfileClick={onProfileClick} />
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">{t('my_plans')}</h1>
                    <button 
                        onClick={() => setIsChoiceModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        <PlusCircle size={20} />
                        {t('create_new_plan')}
                    </button>
                </div>
                {plans.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {plans.map(plan => (
                            <Card key={plan.id} className="flex flex-col justify-between !p-0 overflow-hidden" onClick={() => onSelectPlan(plan)}>
                                <div className="p-5">
                                    <img 
                                        src={plan.logoUrl || 'https://placehold.co/400x300/e2e8f0/e2e8f0?text=Plan'} 
                                        alt={`${plan.campaignName} logo`}
                                        className="w-full h-32 object-cover rounded-md mb-4 bg-gray-200 dark:bg-gray-700"
                                        onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src='https://placehold.co/400x300/e2e8f0/e2e8f0?text=Image+Error'; }}
                                    />
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate" title={plan.campaignName}>{plan.campaignName}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={plan.objective}>{plan.objective}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex justify-between items-center border-t dark:border-gray-700">
                                     <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatCurrency(plan.totalInvestment)}</span>
                                    <button onClick={(e) => handleDeleteClick(e, plan.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full"><Trash2 size={16} /></button>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('Nenhum plano encontrado')}</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Crie seu primeiro plano de mídia para começar.')}</p>
                    </div>
                )}
                 <footer className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} MasterPlan. {t('Todos os direitos reservados.')}
                </footer>
            </div>
            <PlanCreationChoiceModal
                isOpen={isChoiceModalOpen}
                onClose={() => setIsChoiceModalOpen(false)}
                onPlanCreated={onPlanCreated}
            />
             {planToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                        <div className="p-5">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('Delete Plan')}</h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('Confirm Delete This Plan')}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                            <button onClick={() => setPlanToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{t('delete')}</button>
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({ campaigns, title }) => {
    const { t } = useLanguage();

    const groupData = (key: keyof Campaign) => {
        return campaigns.reduce((acc, campaign) => {
            const groupKey = campaign[key] as string | undefined;
            if (groupKey) {
                acc[groupKey] = (acc[groupKey] || 0) + Number(campaign.budget || 0);
            }
            return acc;
        }, {} as Record<string, number>);
    };

    const channelData = Object.entries(groupData('canal')).map(([name, value]) => ({ name, value }));
    const campaignTypeData = Object.entries(groupData('tipoCampanha')).map(([name, value]) => ({ name, value }));
    const formatData = Object.entries(groupData('formato')).map(([name, value]) => ({ name, value }));
    const funnelStageData = Object.entries(groupData('etapaFunil')).map(([name, value]) => ({ name, value }));

    return (
        <Card>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <ChartCard title={t('Investimento por Canal')} data={channelData} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Tipo de Campanha')} data={campaignTypeData} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Formato')} data={formatData} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Etapa Funil')} data={funnelStageData} dataKey="value" nameKey="name" />
            </div>
        </Card>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ planData, onNavigate, onAddMonthClick, onRegeneratePlan, isRegenerating, isReadOnly = false }) => {
    const { t, language } = useLanguage();
    const [isAIAnalysisModalOpen, setAIAnalysisModalOpen] = useState(false);
    const [aiAnalysisContent, setAIAnalysisContent] = useState('');
    const [isAIAnalysisLoading, setIsAIAnalysisLoading] = useState(false);
    const [isAIPlanAdjustModalOpen, setIsAIPlanAdjustModalOpen] = useState(false);

    const allCampaigns: Campaign[] = useMemo(() => 
        Object.values(planData.months || {}).flat()
    , [planData.months]);

    const { summary, monthlySummary } = useMemo(() => calculatePlanSummary(planData), [planData]);

    const handleAnalyzePlan = async () => {
        setAIAnalysisModalOpen(true);
        setIsAIAnalysisLoading(true);
        try {
            const langInstruction = language === 'pt-BR' ? 'Responda em Português.' : 'Respond in English.';
            const prompt = `
                Analyze the following media plan summary. Provide a concise, strategic analysis in markdown format. 
                Focus on:
                1.  **Alignment**: Is the budget distribution aligned with the plan's main objective?
                2.  **Opportunities**: Identify potential optimizations, channels to explore, or funnel stages to reinforce.
                3.  **Risks**: Point out any potential risks like over-reliance on one channel or unrealistic KPIs.
                4.  **Actionable Recommendations**: Give 2-3 clear, actionable next steps.
                
                ${langInstruction}

                **Plan Data:**
                - Main Objective: ${planData.objective}
                - Target Audience: ${planData.targetAudience}
                - Total Investment: ${formatCurrency(summary.budget)}
                - Period: ${Object.keys(planData.months).join(', ')}
                - Investment distribution by channel: ${JSON.stringify(summary.channelBudgets)}
                - Key Metrics: Clicks: ${summary.cliques}, Conversions: ${summary.conversoes}, CTR: ${formatPercentage(summary.ctr)}, CPA: ${formatCurrency(summary.cpa)}
            `;
            const analysis = await callGeminiAPI(prompt);
            setAIAnalysisContent(analysis);
        } catch (error) {
            console.error(error);
            setAIAnalysisContent(`<p style="color: red;">${t('Erro ao analisar plano com IA.')}</p>`);
        } finally {
            setIsAIAnalysisLoading(false);
        }
    };

    const handleRegenerate = (prompt: string) => {
        onRegeneratePlan(prompt);
        setIsAIPlanAdjustModalOpen(false);
    }
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Card className="h-full">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Resumo do Plano')}</h2>
                                <dl className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex flex-col">
                                        <dt className="font-semibold text-gray-800 dark:text-gray-200">{t('Objetivo')}:</dt>
                                        <dd className="pl-2">{planData.objective}</dd>
                                    </div>
                                     <div className="flex flex-col">
                                        <dt className="font-semibold text-gray-800 dark:text-gray-200">{t('Público-Alvo')}:</dt>
                                        <dd className="pl-2">{planData.targetAudience}</dd>
                                    </div>
                                     <div className="flex flex-col">
                                        <dt className="font-semibold text-gray-800 dark:text-gray-200">{t('Investimento Planejado')}:</dt>
                                        <dd className="font-bold text-gray-800 dark:text-gray-200 pl-2">{formatCurrency(planData.totalInvestment)}</dd>
                                    </div>
                                     <div className="flex flex-col">
                                        <dt className="font-semibold text-gray-800 dark:text-gray-200">{t('Investimento Previsto')}:</dt>
                                        <dd className="font-bold text-gray-800 dark:text-gray-200 pl-2">{formatCurrency(summary.budget)}</dd>
                                    </div>
                                     <div className="flex flex-col">
                                        <dt className="font-semibold text-gray-800 dark:text-gray-200">{t('Período')}:</dt>
                                        <dd className="pl-2">{Object.keys(planData.months || {}).length} {t('Meses')}</dd>
                                    </div>
                                </dl>
                            </div>
                            {!isReadOnly && (
                                <div className="flex-shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto lg:w-auto">
                                    <button onClick={handleAnalyzePlan} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 justify-center">
                                        <Sparkles size={16}/> {t('Analisar Plano com IA')}
                                    </button>
                                    {planData.aiPrompt && (
                                         <button onClick={() => setIsAIPlanAdjustModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2 justify-center">
                                            <Wand2 size={16}/> {t('Ajustar Plano com IA')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4">
                    <MetricCard title={t('Investimento Total')} value={formatCurrency(summary.budget)} icon={DollarSign} />
                    <MetricCard title={t('Impressões')} value={formatNumber(summary.impressoes)} icon={EyeIcon} />
                    <MetricCard title={t('Cliques')} value={formatNumber(summary.cliques)} icon={MousePointerClick} />
                    <MetricCard title={t('Conversões')} value={formatNumber(summary.conversoes)} icon={CheckSquare} />
                    <MetricCard title={t('CTR (%)')} value={formatPercentage(summary.ctr)} icon={TrendingUp} />
                    <MetricCard title={t('CPA (R$)')} value={formatCurrency(summary.cpa)} icon={Target} />
                </div>
            </div>
            
            <Card>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('Performance por Mês')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('Mês')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Invest. Total')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('% Share')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Impressões')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Cliques')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Conversões')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Tx. Conversão')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(monthlySummary).sort(sortMonthKeys).map(month => {
                                const share = planData.totalInvestment > 0 ? (monthlySummary[month].budget / planData.totalInvestment) * 100 : 0;
                                return (
                                    <tr key={month} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(month); }} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                                {month.split('-').reverse().join(' ')}
                                            </a>
                                        </th>
                                        <td className="px-6 py-4 text-right">{formatCurrency(monthlySummary[month].budget)}</td>
                                        <td className="px-6 py-4 text-right">{formatPercentage(share)}</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(monthlySummary[month].impressoes)}</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(monthlySummary[month].cliques)}</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(monthlySummary[month].conversoes)}</td>
                                        <td className="px-6 py-4 text-right">{formatPercentage(monthlySummary[month].taxaConversao)}</td>
                                    </tr>
                                );
                            })}
                            <tr className="bg-gray-100 dark:bg-gray-700/50 font-bold text-gray-900 dark:text-white">
                                <td className="px-6 py-3">{t('Totais')}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(summary.budget)}</td>
                                <td className="px-6 py-3 text-right">{formatPercentage(planData.totalInvestment > 0 ? (summary.budget / planData.totalInvestment) * 100 : 0)}</td>
                                <td className="px-6 py-3 text-right">{formatNumber(summary.impressoes)}</td>
                                <td className="px-6 py-3 text-right">{formatNumber(summary.cliques)}</td>
                                <td className="px-6 py-3 text-right">{formatNumber(summary.conversoes)}</td>
                                <td className="px-6 py-3 text-right">{formatPercentage(summary.taxaConversao)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {!isReadOnly && Object.keys(planData.months || {}).length < 12 && (
                     <button onClick={onAddMonthClick} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                        <PlusCircle size={16} /> {t('Adicionar Mês')}
                    </button>
                )}
            </Card>

            <ChartsSection campaigns={allCampaigns} title={t('Distribuição de Investimento (Geral)')}/>

            <AIResponseModal 
                isOpen={isAIAnalysisModalOpen}
                onClose={() => setAIAnalysisModalOpen(false)}
                title={t('Análise Estratégica do Plano')}
                content={aiAnalysisContent}
                isLoading={isAIAnalysisLoading}
            />

            {!isReadOnly && planData.aiPrompt && (
                 <AIPlanCreationModal
                    isOpen={isAIPlanAdjustModalOpen}
                    onClose={() => setIsAIPlanAdjustModalOpen(false)}
                    onGenerate={handleRegenerate}
                    isLoading={isRegenerating}
                    initialPrompt={planData.aiPrompt}
                    title={t('Ajustar Prompt do Plano IA')}
                    buttonText={t('Regerar Plano')}
                    loadingText={t('Regerando plano...')}
                />
            )}
        </div>
    );
};

export const MonthlyPlanPage: React.FC<MonthlyPlanPageProps> = ({ month, campaigns, onSave, onDelete, planObjective, customFormats, onAddFormat, totalInvestment, isReadOnly = false }) => {
    const { t } = useLanguage();
    const [isCampaignModalOpen, setCampaignModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleEditCampaign = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setCampaignModalOpen(true);
    };

    const handleNewCampaign = () => {
        setSelectedCampaign(null);
        setCampaignModalOpen(true);
    };

    const monthTotals = useMemo(() => {
        return campaigns.reduce((acc, c) => {
            acc.budget += Number(c.budget) || 0;
            acc.impressoes += Number(c.impressoes) || 0;
            acc.cliques += Number(c.cliques) || 0;
            acc.conversoes += Number(c.conversoes) || 0;
            return acc;
        }, { budget: 0, impressoes: 0, cliques: 0, conversoes: 0 });
    }, [campaigns]);

    const aggregateCTR = monthTotals.impressoes > 0 ? (monthTotals.cliques / monthTotals.impressoes) * 100 : 0;
    const aggregateConvRate = monthTotals.cliques > 0 ? (monthTotals.conversoes / monthTotals.cliques) * 100 : 0;
    const aggregateCPA = monthTotals.conversoes > 0 ? (monthTotals.budget / monthTotals.conversoes) : 0;
    const totalOrcamentoDiario = monthTotals.budget / 30.4;
    const monthName = month.split('-').reverse().map(p => t(p)).join(' ');

    const getUnitValue = (c: Campaign) => {
        switch (c.unidadeCompra) {
            case 'CPC': return formatCurrency(c.cpc);
            case 'CPM': return formatCurrency(c.cpm);
            default: return 'N/A';
        }
    };

    const headers = [
        'Tipo', 'Funil', 'Canal', 'Formato', 'Budget', 'Orçamento Diário', 'Unidade de Compra', 'Valor da Unidade (R$)', '% Share', 'Impressões', 'Cliques', 'Conversões', 'CTR (%)', 'Tx. Conversão', 'CPA (R$)'
    ];

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('Plano de Mídia - {month}', { month: monthName })}</h2>
                    {!isReadOnly && (
                        <button onClick={handleNewCampaign} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                            <PlusCircle size={20} />
                            {campaigns.length > 0 ? t('Nova Campanha') : t('Adicionar Primeira Campanha')}
                        </button>
                    )}
                </div>
                {campaigns.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} scope="col" className="px-4 py-3">{t(header)}</th>
                                    ))}
                                    {!isReadOnly && <th scope="col" className="px-4 py-3">{t('actions')}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(c => {
                                    const share = monthTotals.budget > 0 ? (Number(c.budget || 0) / monthTotals.budget) * 100 : 0;
                                    return (
                                        <tr key={c.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                            <td className="px-4 py-4">{c.tipoCampanha}</td>
                                            <td className="px-4 py-4">{c.etapaFunil}</td>
                                            <td className="px-4 py-4">{c.canal}</td>
                                            <td className="px-4 py-4">{c.formato}</td>
                                            <td className="px-4 py-4">{formatCurrency(c.budget)}</td>
                                            <td className="px-4 py-4">{formatCurrency(c.orcamentoDiario)}</td>
                                            <td className="px-4 py-4">{c.unidadeCompra}</td>
                                            <td className="px-4 py-4">{getUnitValue(c)}</td>
                                            <td className="px-4 py-4">{formatPercentage(share)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.impressoes)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.cliques)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.conversoes)}</td>
                                            <td className="px-4 py-4">{formatPercentage(c.ctr)}</td>
                                            <td className="px-4 py-4">{formatPercentage(c.taxaConversao)}</td>
                                            <td className="px-4 py-4">{formatCurrency(c.cpa)}</td>
                                            {!isReadOnly && (
                                                <td className="px-4 py-4 flex items-center gap-2">
                                                    <button onClick={() => handleEditCampaign(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><Edit size={16}/></button>
                                                    <button onClick={() => onDelete(month, c.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"><Trash2 size={16}/></button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                             <tfoot>
                                <tr className="font-bold bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                                    <td colSpan={4} className="px-4 py-3">{t('Totais do Mês')}</td>
                                    <td className="px-4 py-3">{formatCurrency(monthTotals.budget)}</td>
                                    <td className="px-4 py-3">{formatCurrency(totalOrcamentoDiario)}</td>
                                    <td colSpan={2}></td>
                                    <td className="px-4 py-3">{formatPercentage(100)}</td>
                                    <td className="px-4 py-3">{formatNumber(monthTotals.impressoes)}</td>
                                    <td className="px-4 py-3">{formatNumber(monthTotals.cliques)}</td>
                                    <td className="px-4 py-3">{formatNumber(monthTotals.conversoes)}</td>
                                    <td className="px-4 py-3">{formatPercentage(aggregateCTR)}</td>
                                    <td className="px-4 py-3">{formatPercentage(aggregateConvRate)}</td>
                                    <td className="px-4 py-3">{formatCurrency(aggregateCPA)}</td>
                                    {!isReadOnly && <td className="px-4 py-3"></td>}
                                </tr>
                             </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('Nenhuma campanha adicionada para {month}.', {month: monthName})}</h3>
                    </div>
                )}
            </Card>

            {campaigns.length > 0 && <ChartsSection campaigns={campaigns} title={t('Distribuição de Investimento ({month})', { month: monthName })} />}

            <CampaignModal 
                isOpen={isCampaignModalOpen}
                onClose={() => setCampaignModalOpen(false)}
                onSave={onSave}
                campaignData={selectedCampaign}
                month={month}
                planObjective={planObjective}
                customFormats={customFormats}
                onAddFormat={onAddFormat}
            />
        </div>
    );
};

const MetricCard: React.FC<{title:string; value:string|number; icon: React.FC<LucideProps>}> = ({title, value, icon:Icon}) => (
    <Card className="!p-4 h-full">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
        </div>
    </Card>
);

const CustomPieLegend: React.FC<any> = (props) => {
  const { payload } = props;
  const { t } = useLanguage();
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-2">
          <ChannelDisplay channel={entry.value} />
          <span>{`${(entry.payload.percent * 100).toFixed(0)}%`}</span>
        </li>
      ))}
    </ul>
  );
};

export const ChartCard: React.FC<ChartCardProps> = ({ title, data, dataKey, nameKey, className, customLegend }) => {
    const { t } = useLanguage();
    const lineColor = '#4B5563'; // gray-600

    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        const radius = outerRadius + 15; // Position label outside the pie, slightly closer
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const labelColor = '#D1D5DB'; // gray-300

        if (percent < 0.05) { // Hide labels for very small slices to prevent clutter
            return null;
        }

        return (
            <text
                x={x}
                y={y}
                fill={labelColor}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={12}
                fontWeight="bold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    return (
        <Card className={className}>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    {data.length > 0 ? (
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey={dataKey}
                                nameKey={nameKey}
                                label={renderCustomizedLabel}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937', // gray-800
                                    borderColor: '#374151', // gray-700
                                    borderRadius: '0.5rem',
                                }}
                                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                            />
                             {customLegend || <Legend content={<CustomPieLegend />} />}
                        </PieChart>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">{t('Nenhuma campanha para este mês.')}</div>
                    )}
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

const CreativeGroup: React.FC<CreativeGroupProps> = ({ group, channel, onUpdate, onDelete, planData }) => {
    const { t } = useLanguage();
    const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Record<string, string[]> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const updateField = (field: keyof CreativeTextData, value: any) => {
        onUpdate({ ...group, [field]: value });
    };

    const updateArrayField = (field: 'headlines' | 'descriptions' | 'longHeadlines', index: number, value: string) => {
        const newArray = [...(group[field] || [])];
        newArray[index] = value;
        updateField(field, newArray);
    };

    const addArrayField = (field: 'headlines' | 'descriptions' | 'longHeadlines') => {
        const newArray = [...(group[field] || []), ''];
        updateField(field, newArray);
    };
    
    const removeArrayField = (field: 'headlines' | 'descriptions' | 'longHeadlines', index: number) => {
        const newArray = (group[field] || []).filter((_, i) => i !== index);
        updateField(field, newArray);
    };

    const handleGenerateSuggestions = async () => {
        setIsSuggestionsModalOpen(true);
        setIsGeneratingSuggestions(true);
        setError(null);
        setSuggestions(null);
        try {
            const prompt = `You are a creative copywriter for digital ads.
            Based on the provided context, generate a set of headlines, long headlines (if applicable for the channel), and descriptions for an ad campaign.
            The output MUST be a valid JSON object. Do not include any text, explanation, or markdown fences like \`\`\`json around the JSON output.

            Context:
            - Business/Product: ${planData.objective}
            - Target Audience: ${planData.targetAudience}
            - Channel: ${channel}
            - Specific context for this creative group: ${group.context}

            Generate 5 suggestions for each category.
            The JSON structure should be:
            {
              "Títulos (Headlines)": ["Suggestion 1", "Suggestion 2", ...],
              "Títulos Longos (Long Headlines)": ["Suggestion 1", "Suggestion 2", ...],
              "Descrições (Descriptions)": ["Suggestion 1", "Suggestion 2", ...]
            }

            If the channel is NOT Google Ads, the "Títulos Longos (Long Headlines)" array should be empty.
            `;
            const response = await callGeminiAPI(prompt, true);
            setSuggestions(response);
        } catch (err) {
            console.error(err);
            setError(t('Falha ao gerar sugestões.'));
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };
    
    const applySuggestion = (type: string, text: string) => {
        if (type === 'Títulos (Headlines)') {
            updateField('headlines', [...group.headlines, text]);
        } else if (type === 'Títulos Longos (Long Headlines)') {
            updateField('longHeadlines', [...(group.longHeadlines || []), text]);
        } else if (type === 'Descrições (Descriptions)') {
            updateField('descriptions', [...group.descriptions, text]);
        }
    };

    return (
        <Card className="space-y-6">
            <div className="flex justify-between items-start pb-4 border-b dark:border-gray-700">
                <input
                    type="text"
                    value={group.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-0 border-none p-0 w-full text-gray-900 dark:text-gray-100"
                    placeholder={t('Nome do Grupo de Criativos')}
                />
                <button onClick={() => onDelete(group.id)} className="text-gray-400 hover:text-red-500 ml-4">
                    <Trash2 size={20} />
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Contexto para a IA')}</label>
                <textarea
                    value={group.context}
                    onChange={(e) => updateField('context', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('Descreva o produto, público, oferta e palavras-chave para guiar a IA...')}
                />
                 <button onClick={handleGenerateSuggestions} className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    <Sparkles size={16} />
                    {t('Gerar Sugestões com IA')}
                </button>
            </div>

            <div className="space-y-4">
                {/* Headlines */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Títulos (Headlines)')}</h4>
                    {group.headlines.map((headline, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <CharacterCountInput
                                value={headline}
                                onChange={(e) => updateArrayField('headlines', index, e.target.value)}
                                maxLength={30}
                                placeholder={`${t('Títulos (Headlines)')} ${index + 1}`}
                            />
                            <button onClick={() => removeArrayField('headlines', index)} className="text-gray-400 hover:text-red-500 p-2 rounded-full"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <button onClick={() => addArrayField('headlines')}  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><PlusCircle size={14}/> {t('add')}</button>
                </div>

                {/* Long Headlines (Optional for Google Ads) */}
                {channel.includes("Google") && (
                    <div className="space-y-2">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Títulos Longos (Long Headlines)')}</h4>
                        {(group.longHeadlines || []).map((headline, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <CharacterCountInput
                                    value={headline}
                                    onChange={(e) => updateArrayField('longHeadlines', index, e.target.value)}
                                    maxLength={90}
                                    placeholder={`${t('Títulos Longos (Long Headlines)')} ${index + 1}`}
                                />
                                <button onClick={() => removeArrayField('longHeadlines', index)} className="text-gray-400 hover:text-red-500 p-2 rounded-full"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        <button onClick={() => addArrayField('longHeadlines')} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><PlusCircle size={14}/> {t('add')}</button>
                    </div>
                )}

                {/* Descriptions */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Descrições (Descriptions)')}</h4>
                    {group.descriptions.map((desc, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <CharacterCountInput
                                value={desc}
                                onChange={(e) => updateArrayField('descriptions', index, e.target.value)}
                                maxLength={90}
                                placeholder={`${t('Descrições (Descriptions)')} ${index + 1}`}
                            />
                            <button onClick={() => removeArrayField('descriptions', index)} className="text-gray-400 hover:text-red-500 p-2 rounded-full"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <button onClick={() => addArrayField('descriptions')} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><PlusCircle size={14}/> {t('add')}</button>
                </div>
            </div>
            
            <AISuggestionsModal
                isOpen={isSuggestionsModalOpen}
                onClose={() => setIsSuggestionsModalOpen(false)}
                isLoading={isGeneratingSuggestions}
                suggestions={suggestions}
                onApplySuggestion={applySuggestion}
                onApplyAllSuggestions={(type, texts) => {
                    if (type === 'Títulos (Headlines)') {
                        updateField('headlines', [...group.headlines, ...texts]);
                    } else if (type === 'Títulos Longos (Long Headlines)') {
                        updateField('longHeadlines', [...(group.longHeadlines || []), ...texts]);
                    } else if (type === 'Descrições (Descriptions)') {
                        updateField('descriptions', [...group.descriptions, ...texts]);
                    }
                }}
            />
        </Card>
    );
};

export const CopyBuilderPage: React.FC<CopyBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [activeChannel, setActiveChannel] = useState<string | null>(null);

    const channelsWithCampaigns = useMemo(() => {
        const allCampaigns = Object.values(planData.months || {}).flat();
        return [...new Set(allCampaigns.map(c => c.canal).filter(Boolean))] as string[];
    }, [planData.months]);

    useEffect(() => {
        if (channelsWithCampaigns.length > 0 && !activeChannel) {
            setActiveChannel(channelsWithCampaigns[0]);
        } else if (channelsWithCampaigns.length === 0) {
            setActiveChannel(null);
        }
    }, [channelsWithCampaigns, activeChannel]);

    const handleUpdateGroup = (updatedGroup: CreativeTextData) => {
        if (!activeChannel) return;
        setPlanData(prev => {
            if (!prev) return null;
            const newCreatives = { ...(prev.creatives || {}) };
            const channelCreatives = (newCreatives[activeChannel] || []);
            const groupIndex = channelCreatives.findIndex(g => g.id === updatedGroup.id);
            if (groupIndex > -1) {
                channelCreatives[groupIndex] = updatedGroup;
                const updatedPlan = { ...prev, creatives: { ...prev.creatives, [activeChannel]: channelCreatives }};
                if (user) dbService.savePlan(user.uid, updatedPlan);
                return updatedPlan;
            }
            return prev;
        });
    };
    
    const handleDeleteGroup = (groupId: number) => {
        if (!activeChannel) return;
        setPlanData(prev => {
            if (!prev) return null;
            const channelCreatives = (prev.creatives?.[activeChannel] || []).filter(g => g.id !== groupId);
            const updatedPlan = { ...prev, creatives: { ...prev.creatives, [activeChannel]: channelCreatives }};
            if (user) dbService.savePlan(user.uid, updatedPlan);
            return updatedPlan;
        });
    };

    const handleAddGroup = () => {
        if (!activeChannel) return;
        const newGroup: CreativeTextData = {
            id: Date.now(),
            name: t('Novo Grupo'),
            context: '',
            headlines: [''],
            descriptions: [''],
            longHeadlines: []
        };
        setPlanData(prev => {
            if (!prev) return null;
            const channelCreatives = [...(prev.creatives?.[activeChannel] || []), newGroup];
            const updatedPlan = { ...prev, creatives: { ...prev.creatives, [activeChannel]: channelCreatives }};
            if (user) dbService.savePlan(user.uid, updatedPlan);
            return updatedPlan;
        });
    };

    const activeGroups = planData.creatives?.[activeChannel || ''] || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('copy_builder')}</h2>
                 <div className="flex items-center gap-2">
                    <button onClick={() => exportCreativesAsCSV(planData, t)} className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"><Sheet size={16}/> CSV</button>
                    <button onClick={() => exportCreativesAsTXT(planData, t)} className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"><FileText size={16}/> TXT</button>
                 </div>
            </div>

            {channelsWithCampaigns.length > 0 ? (
                <div>
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                            {channelsWithCampaigns.map(channel => (
                                <button
                                    key={channel}
                                    onClick={() => setActiveChannel(channel)}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                        ${activeChannel === channel
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                        }`
                                    }
                                >
                                    {channel}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {activeChannel && (
                        <div>
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">{t('Criativos para')} {activeChannel}</h3>
                                <button onClick={handleAddGroup} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors text-sm">
                                    <PlusCircle size={18} />
                                    {t('Novo Grupo de Criativos')}
                                </button>
                             </div>
                            {activeGroups.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {activeGroups.map(group => (
                                        <CreativeGroup 
                                            key={group.id} 
                                            group={group} 
                                            channel={activeChannel}
                                            onUpdate={handleUpdateGroup}
                                            onDelete={handleDeleteGroup}
                                            planData={planData}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('Nenhum grupo de criativos para {channel}', {channel: activeChannel})}</h3>
                                    <p className="mt-1 text-gray-500 dark:text-gray-400">{t('Comece adicionando um novo grupo.')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <Card className="text-center">
                    <h3 className="text-lg font-semibold">{t('Nenhum canal ativo')}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{t('Para começar, adicione campanhas com canais definidos no seu plano de mídia.')}</p>
                </Card>
            )}
        </div>
    );
};

export const UTMBuilderPage: React.FC<UTMBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [utm, setUtm] = useState({ url: '', source: '', medium: '', campaign: '', term: '', content: '' });
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUtm(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        const { url, source, medium, campaign, term, content } = utm;
        if (url && source && medium && campaign) {
            const params = new URLSearchParams({
                utm_source: source,
                utm_medium: medium,
                utm_campaign: campaign,
            });
            if (term) params.set('utm_term', term);
            if (content) params.set('utm_content', content);
            
            try {
                const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
                urlObject.search = params.toString();
                setGeneratedUrl(urlObject.toString());
            } catch (error) {
                // Invalid URL, do nothing
                setGeneratedUrl('');
            }
        } else {
            setGeneratedUrl('');
        }
    }, [utm]);

    const handleSave = () => {
        if (!generatedUrl) {
            alert(t('Por favor, preencha todos os campos obrigatórios (*) e gere a URL.'));
            return;
        }
        const newLink: UTMLink = {
            id: Date.now(),
            createdAt: new Date(),
            fullUrl: generatedUrl,
            ...utm
        };
        setPlanData(prev => {
            if (!prev) return null;
            const updatedPlan = { ...prev, utmLinks: [...(prev.utmLinks || []), newLink] };
            if(user) dbService.savePlan(user.uid, updatedPlan);
            return updatedPlan;
        });
        handleClear();
    };

    const handleClear = () => {
        setUtm({ url: '', source: '', medium: '', campaign: '', term: '', content: '' });
        setGeneratedUrl('');
    };
    
    const copyUrl = () => {
        navigator.clipboard.writeText(generatedUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const handleDeleteLink = (id: number) => {
        setPlanData(prev => {
             if (!prev) return null;
            const updatedLinks = (prev.utmLinks || []).filter(link => link.id !== id);
            const updatedPlan = { ...prev, utmLinks: updatedLinks };
            if(user) dbService.savePlan(user.uid, updatedPlan);
            return updatedPlan;
        })
    };
    
    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('utm_builder')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 space-y-4">
                     <h3 className="text-lg font-semibold">{t('Gerador de UTM')}</h3>
                     <div>
                        <label className="block text-sm font-medium">{t('URL do Site *')}</label>
                        <input type="text" name="url" value={utm.url} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium">{t('Campaign Source *')}</label>
                        <input type="text" name="source" value={utm.source} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                      <div>
                        <label className="block text-sm font-medium">{t('Campaign Medium *')}</label>
                        <input type="text" name="medium" value={utm.medium} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium">{t('Campaign Name *')}</label>
                        <input type="text" name="campaign" value={utm.campaign} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium">{t('Campaign Term')}</label>
                        <input type="text" name="term" value={utm.term} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium">{t('Campaign Content')}</label>
                        <input type="text" name="content" value={utm.content} onChange={handleInputChange} className="mt-1 w-full input-style" />
                     </div>
                     <div className="pt-4 border-t dark:border-gray-700">
                        <label className="block text-sm font-medium">{t('URL Gerada')}</label>
                        <div className="relative mt-1">
                            <textarea
                                value={generatedUrl || t('Preencha os campos para gerar a URL.')}
                                readOnly
                                rows={4}
                                className="w-full input-style bg-gray-100 dark:bg-gray-700/50 pr-10"
                            />
                             {generatedUrl && (
                                <button onClick={copyUrl} className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">
                                    {copied ? <Check size={16} className="text-green-500"/> : <CopyIcon size={16} />}
                                </button>
                             )}
                        </div>
                     </div>
                     <div className="flex gap-2 justify-end">
                         <button onClick={handleClear} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">{t('Limpar')}</button>
                         <button onClick={handleSave} disabled={!generatedUrl} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50">{t('Salvar Link')}</button>
                     </div>
                </Card>
                <Card className="lg:col-span-2">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">{t('Links Salvos')}</h3>
                        <div className="flex items-center gap-2">
                             <button onClick={() => exportUTMLinksAsCSV(planData, t)} className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"><Sheet size={16}/> CSV</button>
                             <button onClick={() => exportUTMLinksAsTXT(planData, t)} className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"><FileText size={16}/> TXT</button>
                        </div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="text-left bg-gray-50 dark:bg-gray-700/50">
                             <tr>
                                 <th className="p-3 font-medium">{t('Data')}</th>
                                 <th className="p-3 font-medium">{t('Campanha')}</th>
                                 <th className="p-3 font-medium">{t('URL Completa')}</th>
                                 <th className="p-3 font-medium"></th>
                             </tr>
                           </thead>
                           <tbody>
                                {(planData.utmLinks || []).length > 0 ? (
                                    planData.utmLinks.map(link => (
                                        <tr key={link.id} className="border-b dark:border-gray-700">
                                            <td className="p-3 whitespace-nowrap">{new Date(link.createdAt).toLocaleDateString()}</td>
                                            <td className="p-3">{link.campaign}</td>
                                            <td className="p-3 truncate max-w-xs" title={link.fullUrl}>{link.fullUrl}</td>
                                            <td className="p-3 text-right">
                                                 <button onClick={() => handleDeleteLink(link.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-500">{t('Nenhum link salvo ainda.')}</td>
                                    </tr>
                                )}
                           </tbody>
                        </table>
                     </div>
                </Card>
            </div>
        </div>
    );
};

export const KeywordBuilderPage: React.FC<KeywordBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [mode, setMode] = useState<'seed' | 'prompt'>('prompt');
    const [input, setInput] = useState('');
    const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>('unassigned');

    useEffect(() => {
        const currentGroups = planData.adGroups || [];
        const unassigned = currentGroups.find(g => g.id === 'unassigned');
        const otherGroups = currentGroups.filter(g => g.id !== 'unassigned');
        const newGroups = [
            unassigned || { id: 'unassigned', name: t('unassigned_keywords'), keywords: [] },
            ...otherGroups
        ];
        setAdGroups(newGroups);
    }, [planData.adGroups, t]);

    const updatePlanData = (newAdGroups: AdGroup[]) => {
        setPlanData(prev => {
            if (!prev) return null;
            const updatedPlan = { ...prev, adGroups: newAdGroups };
            if (user) dbService.savePlan(user.uid, updatedPlan);
            return updatedPlan;
        });
    }

    const handleGenerateKeywords = async () => {
        if (!input.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const generated = await generateAIKeywords(planData, mode, input, language);
            setKeywords(generated);
        } catch (err) {
            console.error(err);
            setError(t('error_generating_keywords'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignKeywordFromResults = (keywordToAssign: KeywordSuggestion, groupId: string) => {
        if (!groupId) return;

        const updatedAdGroups = JSON.parse(JSON.stringify(adGroups));

        updatedAdGroups.forEach((g: AdGroup) => {
            g.keywords = g.keywords.filter((k: KeywordSuggestion) => k.keyword !== keywordToAssign.keyword);
        });

        const targetGroup = updatedAdGroups.find((g: AdGroup) => g.id === groupId);
        if (targetGroup) {
            targetGroup.keywords.push(keywordToAssign);
        }

        updatePlanData(updatedAdGroups);
        setKeywords(prevKeywords => prevKeywords.filter(k => k.keyword !== keywordToAssign.keyword));
    };

    const handleCreateAdGroup = () => {
        if (!newGroupName.trim()) return;
        const newGroup: AdGroup = {
            id: `group_${Date.now()}`,
            name: newGroupName.trim(),
            keywords: [],
        };
        const updatedGroups = [...adGroups, newGroup];
        updatePlanData(updatedGroups);
        setNewGroupName('');
    };

    const handleDeleteAdGroup = (groupId: string) => {
        if (groupId === 'unassigned' || !confirm(t('confirm_delete_group'))) return;

        const updatedGroups = JSON.parse(JSON.stringify(adGroups));
        const groupToDelete = updatedGroups.find((g: AdGroup) => g.id === groupId);
        const unassignedGroup = updatedGroups.find((g: AdGroup) => g.id === 'unassigned');

        if (groupToDelete && unassignedGroup) {
            unassignedGroup.keywords.push(...groupToDelete.keywords);
            unassignedGroup.keywords = unassignedGroup.keywords.filter((kw: KeywordSuggestion, index: number, self: KeywordSuggestion[]) =>
                index === self.findIndex((k) => k.keyword === kw.keyword)
            );
        }

        const finalGroups = updatedGroups.filter((g: AdGroup) => g.id !== groupId);
        updatePlanData(finalGroups);
    };

    const handleMoveKeyword = (keywordToMove: KeywordSuggestion, fromGroupId: string, toGroupId: string) => {
        if (fromGroupId === toGroupId || !toGroupId) return;

        const updatedAdGroups = JSON.parse(JSON.stringify(adGroups));

        const fromGroup = updatedAdGroups.find((g: AdGroup) => g.id === fromGroupId);
        if (fromGroup) {
            fromGroup.keywords = fromGroup.keywords.filter((k: KeywordSuggestion) => k.keyword !== keywordToMove.keyword);
        }

        const toGroup = updatedAdGroups.find((g: AdGroup) => g.id === toGroupId);
        if (toGroup) {
            if (!toGroup.keywords.some((k: KeywordSuggestion) => k.keyword === keywordToMove.keyword)) {
                toGroup.keywords.push(keywordToMove);
            }
        }
        updatePlanData(updatedAdGroups);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('keyword_builder')}</h2>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <button onClick={() => setMode('prompt')} className={`p-3 rounded-lg text-left ${mode === 'prompt' ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 border-2' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
                        <label className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Wand2 size={16}/> {t('ai_prompt_label')}</label>
                    </button>
                    <button onClick={() => setMode('seed')} className={`p-3 rounded-lg text-left ${mode === 'seed' ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 border-2' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
                        <label className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2"><KeyRound size={16}/> {t('seed_keywords_label')}</label>
                    </button>
                </div>
                 <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={3}
                    className="w-full input-style"
                    placeholder={t(mode === 'seed' ? 'seed_keywords_placeholder' : 'ai_prompt_placeholder')}
                />
                <div className="mt-4 flex justify-end">
                    <button onClick={handleGenerateKeywords} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 disabled:opacity-50">
                        {isLoading ? <LoaderIcon className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                        {isLoading ? t('generating_keywords') : t('generate_keywords')}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <h3 className="text-lg font-semibold mb-2">{t('ad_groups')}</h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder={t('ad_group_name_placeholder')}
                                className="w-full input-style"
                            />
                            <button onClick={handleCreateAdGroup} className="px-3 bg-blue-600 text-white rounded-md shrink-0"><PlusCircle size={18}/></button>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {adGroups.map(group => (
                                <div key={group.id} className="bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                    <div
                                        className="p-3 flex justify-between items-center cursor-pointer"
                                        onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <ChevronDown size={16} className={`transform transition-transform shrink-0 ${expandedGroupId === group.id ? 'rotate-180' : ''}`} />
                                            <span className="font-medium text-gray-800 dark:text-gray-200 truncate" title={group.name}>{group.name}</span>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-900 bg-gray-200 dark:bg-gray-500 px-1.5 py-0.5 rounded-full shrink-0">{group.keywords.length}</span>
                                        </div>
                                        {group.id !== 'unassigned' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAdGroup(group.id); }}
                                                className="text-gray-400 hover:text-red-500 shrink-0"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>

                                    {expandedGroupId === group.id && (
                                        <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                                            {group.keywords.length > 0 ? (
                                                <div className="space-y-2">
                                                    {group.keywords.map(kw => (
                                                        <div key={kw.keyword} className="flex justify-between items-center text-sm">
                                                            <span className="truncate pr-2">{kw.keyword}</span>
                                                            <select
                                                                value=""
                                                                onChange={(e) => handleMoveKeyword(kw, group.id, e.target.value)}
                                                                className="text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 rounded-md p-1 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                <option value="" disabled>{t('move_to')}</option>
                                                                {adGroups.filter(g => g.id !== group.id).map(targetGroup => (
                                                                    <option key={targetGroup.id} value={targetGroup.id}>{targetGroup.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">{t('no_keywords_in_group')}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                             {adGroups.filter(g => g.id !== 'unassigned').length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">{t('no_ad_groups')}</p>
                             )}
                        </div>
                    </Card>
                </div>

                 <div className="lg:col-span-2">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{t('Results')}</h3>
                            <div>
                                 <button onClick={() => exportGroupedKeywordsAsCSV(planData, t)} className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1.5"><Sheet size={16}/> {t('export_keywords')}</button>
                            </div>
                        </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                               <thead className="text-left bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="p-3 font-medium">{t('keyword')}</th>
                                        <th className="p-3 font-medium text-right">{t('search_volume')}</th>
                                        <th className="p-3 font-medium text-right">{t('estimated_clicks')}</th>
                                        <th className="p-3 font-medium text-right">{t('min_cpc')}</th>
                                        <th className="p-3 font-medium text-right">{t('max_cpc')}</th>
                                        <th className="p-3 font-medium">{t('assign_to_group')}</th>
                                    </tr>
                               </thead>
                               <tbody>
                                 {keywords.length > 0 ? (
                                    keywords.map(kw => (
                                        <tr key={kw.keyword} className="border-b dark:border-gray-700">
                                            <td className="p-3">{kw.keyword}</td>
                                            <td className="p-3 text-right">{formatNumber(kw.volume)}</td>
                                            <td className="p-3 text-right">{formatNumber(kw.clickPotential)}</td>
                                            <td className="p-3 text-right">{formatCurrency(kw.minCpc)}</td>
                                            <td className="p-3 text-right">{formatCurrency(kw.maxCpc)}</td>
                                            <td className="p-3">
                                                <select
                                                    value=""
                                                    onChange={(e) => handleAssignKeywordFromResults(kw, e.target.value)}
                                                    className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="">{t('Selecione')}</option>
                                                    {adGroups.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                 ) : (
                                     <tr><td colSpan={6} className="text-center p-8 text-gray-500">{t('no_keywords_generated')}</td></tr>
                                 )}
                               </tbody>
                            </table>
                        </div>
                    </Card>
                 </div>
            </div>
        </div>
    );
};

export const CreativeBuilderPage: React.FC<CreativeBuilderPageProps> = ({ planData }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(planData.aiImagePrompt || '');
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setImages([]);
        try {
            const result = await generateAIImages(prompt);
            setImages(result);
        } catch (err) {
            console.error(err);
            setError(t('error_generating_images'));
        } finally {
            setIsLoading(false);
        }
    };
    
     const downloadImage = (base64: string, filename: string) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('creative_builder')}</h2>

            <Card>
                 <label htmlFor="creative-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Prompt para Geração de Imagem')}</label>
                 <textarea
                    id="creative-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="mt-1 w-full input-style"
                    placeholder={t('creative_prompt_placeholder')}
                />
                 <div className="mt-4 flex justify-end">
                    <button onClick={handleGenerate} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 disabled:opacity-50">
                        {isLoading ? <LoaderIcon className="animate-spin" size={20}/> : <ImageIcon size={20}/>}
                        {isLoading ? t('generating_images') : t('generate_images')}
                    </button>
                </div>
            </Card>
            
            {error && <p className="text-red-500 text-center">{error}</p>}

            {images.length === 0 && !isLoading && (
                 <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <ImageIcon size={48} className="mx-auto text-gray-400" />
                    <p className="mt-4 text-gray-500 dark:text-gray-400">{t('creative_builder_initial_prompt')}</p>
                 </div>
            )}
            
            {isLoading && (
                 <div className="text-center py-16">
                     <LoaderIcon className="animate-spin text-blue-500 mx-auto" size={48}/>
                     <p className="mt-4 text-gray-500 dark:text-gray-400">{t('generating_images')}</p>
                 </div>
            )}

            {images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {images.map((img, index) => (
                        <Card key={index} className="!p-4 group">
                             <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                                <img
                                    src={`data:image/png;base64,${img.base64}`}
                                    alt={`Generated creative ${index + 1}`}
                                    className="w-full h-full object-cover object-center"
                                />
                             </div>
                             <div className="mt-3 flex justify-between items-center">
                                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{img.aspectRatio}</p>
                                 <button onClick={() => downloadImage(img.base64, `creative_${img.aspectRatio.replace(':', 'x')}.png`)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                     <FileDown size={14}/> {t('download')}
                                 </button>
                             </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export const VideoBuilderPage: React.FC<VideoBuilderPageProps> = ({ planData }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(planData.aiImagePrompt || '');
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [image, setImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    
     useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            const messages = [t('loading_message_1'), t('loading_message_2'), t('loading_message_3'), t('loading_message_4')];
            let msgIndex = 0;
            setLoadingMessage(messages[msgIndex]);
            interval = setInterval(() => {
                msgIndex = (msgIndex + 1) % messages.length;
                setLoadingMessage(messages[msgIndex]);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isLoading, t]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        setVideos([]);
        try {
            const aspectRatios = ['16:9', '9:16']; // Widescreen, Vertical
            const generationPromises = aspectRatios.map(ratio =>
                callGeminiAPI(prompt)
            );
    
            const results = await Promise.allSettled(generationPromises);
    
            let firstErrorReason: any = null;
            const successfulVideos: GeneratedVideo[] = [];
    
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    successfulVideos.push({ url: result.value, aspectRatio: aspectRatios[index] });
                } else if (result.status === 'rejected') {
                    if (!firstErrorReason) {
                        firstErrorReason = result.reason;
                    }
                    console.error(`Failed to generate video for aspect ratio ${aspectRatios[index]}:`, result.reason);
                }
            });
    
            if (successfulVideos.length === 0) {
                if (firstErrorReason) {
                    throw firstErrorReason; // Re-throw the actual error from the service
                }
                throw new Error(t('error_generating_videos'));
            }
    
            setVideos(successfulVideos);
    
        } catch (err: any) {
            console.error(err);
            let errorMessage = t('error_generating_videos');
            
            const status = err?.error?.status;
            const apiMessage = err?.error?.message;
            const genericMessage = err instanceof Error ? err.message : '';
            const fullErrorString = typeof apiMessage === 'string' ? apiMessage : genericMessage;

            if (status === 'FAILED_PRECONDITION' || fullErrorString.includes('billing enabled')) {
                errorMessage = t('video_billing_error');
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setImage({ base64: base64String, mimeType: file.type, name: file.name });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const getAspectRatioLabel = (ratio: string) => {
        switch (ratio) {
            case '16:9': return 'Widescreen';
            case '9:16': return 'Vertical (Stories)';
            default: return ratio;
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('video_builder')}</h2>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="video-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('video_prompt_label')}</label>
                         <textarea
                            id="video-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                            className="mt-1 w-full input-style"
                            placeholder={t('video_prompt_placeholder')}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('video_prompt_hint')}</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('upload_optional_image')}</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" />
                                    </label>
                                </div>
                                {image ? (
                                    <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                                        <span>{image.name}</span>
                                        <button onClick={() => setImage(null)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                )}
                            </div>
                        </div>
                     </div>
                </div>
                 <div className="mt-4 flex justify-end">
                    <button onClick={handleGenerate} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 disabled:opacity-50">
                        {isLoading ? <LoaderIcon className="animate-spin" size={20}/> : <Video size={20}/>}
                        {isLoading ? t('generating_videos') : t('generate_videos')}
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">{t('video_generation_disclaimer')}</p>
            </Card>

            {error && <p className="text-red-500 text-center">{error}</p>}

             {videos.length === 0 && !isLoading && (
                 <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <Video size={48} className="mx-auto text-gray-400" />
                    <p className="mt-4 text-gray-500 dark:text-gray-400">{t('video_builder_initial_prompt')}</p>
                 </div>
            )}

            {isLoading && (
                 <div className="text-center py-16">
                     <LoaderIcon className="animate-spin text-blue-500 mx-auto" size={48}/>
                     <p className="mt-4 text-gray-500 dark:text-gray-400">{loadingMessage}</p>
                 </div>
            )}

             {videos.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {videos.map((video, index) => (
                        <Card key={index} className="!p-4 group">
                             <h3 className="font-semibold mb-2">{getAspectRatioLabel(video.aspectRatio)} <span className="text-gray-400 font-normal">({video.aspectRatio})</span></h3>
                            <video controls src={video.url} className="w-full rounded-lg bg-black"/>
                            <div className="mt-3 flex justify-end">
                                 <a href={video.url} download={`video_${video.aspectRatio.replace(':','x')}.mp4`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                     <FileDown size={14}/> {t('download_video')}
                                 </a>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};