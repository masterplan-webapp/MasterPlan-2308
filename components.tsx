
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy as CopyIcon, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, Sun, Moon, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, LucideProps, AlertTriangle, KeyRound, Tags, Tag, ImageIcon, ExternalLink, HelpCircle } from 'lucide-react';
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
    AspectRatio
} from './types';

// MasterPlan Logo URLs
export const LOGO_LIGHT = '/logo-light.png';
export const LOGO_DARK = '/logo-dark.png';
export const ICON_LOGO = '/icon-logo.png';

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
                        <div 
                            className="dark:text-gray-300 space-y-4 
                                       [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:dark:text-gray-100 [&_h3]:mb-4 [&_h3]:pb-2 [&_h3]:border-b [&_h3]:border-gray-200 [&_h3]:dark:border-gray-600
                                       [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:dark:text-gray-200 [&_h4]:mt-6 [&_h4]:mb-2
                                       [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
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

export const AIPlanCreationModal: React.FC<AIPlanCreationModalProps> = ({ isOpen, onClose, onGenerate, isLoading, initialPrompt = '', title, buttonText, loadingText }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(initialPrompt);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
        }
    }, [isOpen, initialPrompt]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if (prompt.trim()) {
            onGenerate(prompt.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Wand2 className="text-blue-500" />
                        {title || t('Crie seu Plano com IA')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" disabled={isLoading}><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('Descreva seu negócio, objetivos e público')}
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('Ex: Uma cafeteria em São Paulo focada em jovens profissionais. Objetivo: aumentar o fluxo na loja.')}
                        rows={5}
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                    />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <LoaderIcon size={18} className="animate-spin" />
                                {loadingText || t('Gerando seu plano...')}
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
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

    useEffect(() => {
        if (isOpen) {
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Link2 className="text-blue-500" />
                        {t('share_plan_title')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('share_plan_desc')}
                    </p>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={link}
                            readOnly
                            className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:outline-none"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                            {copied ? <Check size={18} /> : <CopyIcon size={18} />}
                            {copied ? t('copied') : t('copy_link')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ShareablePlanViewerProps {
    userId: string;
    planId: string;
}

export const ShareablePlanViewer: React.FC<ShareablePlanViewerProps> = ({ userId, planId }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
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
                <LoaderIcon className="animate-spin text-blue-600" size={48} />
                <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading_plan')}</p>
            </div>
        );
    }

    if (error || !plan) {
        return (
             <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                <AlertTriangle className="text-red-500" size={48} />
                <p className="mt-4 text-red-600 dark:text-red-400">{error || t('plan_not_found')}</p>
             </div>
        );
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                         <div className="flex items-center gap-4">
                            <img src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="MasterPlan Logo" className="h-8" />
                         </div>
                         <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('shared_by')}:</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{plan.campaignName}</p>
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


// --- Page-Specific Components ---
export const LoginPage: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const { t } = useLanguage();
    const { theme } = useTheme();

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="max-w-md w-full text-center shadow-2xl">
                <img 
                  src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} 
                  alt="MasterPlan Logo" 
                  className="mx-auto h-16 mb-4"
                />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('Planeamento de Mídia Inteligente')}</h1>
                <p className="mt-2 mb-8 text-gray-600 dark:text-gray-400">{t('Ferramenta de IA para Marketing.')}</p>
                <button 
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-all duration-300"
                >
                    <svg className="w-6 h-6" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    </svg>
                    {t('Entrar com Google')}
                </button>
            </Card>
        </div>
    );
};

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onPlanCreated }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4">
             <img src={LOGO_DARK} alt="MasterPlan Logo" className="h-12 mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-center">{t('welcome_to_masterplan')}</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center">{t('create_first_plan')}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <Card onClick={() => onPlanCreated('ai')} className="text-center group">
                     <Wand2 size={48} className="mx-auto text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                    <h2 className="text-xl font-semibold mb-2">{t('create_with_ai')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('ai_description')}</p>
                </Card>
                <Card onClick={() => onPlanCreated('blank')} className="text-center group">
                    <FilePlus2 size={48} className="mx-auto text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                    <h2 className="text-xl font-semibold mb-2">{t('start_blank')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('blank_description')}</p>
                </Card>
                <Card onClick={() => onPlanCreated('template')} className="text-center group">
                    <Sheet size={48} className="mx-auto text-blue-500 mb-4 transition-transform group-hover:scale-110" />
                    <h2 className="text-xl font-semibold mb-2">{t('create_from_template')}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{t('template_description')}</p>
                </Card>
            </div>
        </div>
    );
};

export const PlanSelectorPage: React.FC<PlanSelectorPageProps> = ({ plans, onSelectPlan, onPlanCreated, user, onProfileClick, onDeletePlan }) => {
    const { t } = useLanguage();
    const [planCreationChoiceOpen, setPlanCreationChoiceOpen] = useState(false);
    const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);

    const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onProfileClick }) => {
        const { t } = useLanguage();
        const { theme, toggleTheme } = useTheme();
        const { user, signOut } = useAuth();
        const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
        const userMenuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                    setIsUserMenuOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);


        return (
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <img src={theme === 'dark' ? LOGO_DARK : LOGO_LIGHT} alt="MasterPlan" className="h-8" />
                            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('my_plans')}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                             <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
                            </button>
                            <div className="relative" ref={userMenuRef}>
                                <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="flex items-center gap-2">
                                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0D8ABC&color=fff&size=32`} alt="User avatar" className="w-8 h-8 rounded-full" />
                                </button>
                                {isUserMenuOpen && (
                                     <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                        <div className="py-1" role="menu" aria-orientation="vertical">
                                             <button onClick={() => {onProfileClick(); setIsUserMenuOpen(false);}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                                <UserIcon size={16}/> {t('my_profile')}
                                             </button>
                                             <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                                <LogOut size={16}/> {t('sign_out')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        );
    };

    const PlanCard: React.FC<{ plan: PlanData }> = ({ plan }) => {
        const { summary } = calculatePlanSummary(plan);
        const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
        const actionsMenuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                    setIsActionsMenuOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        return (
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden flex flex-col justify-between transition-transform transform hover:-translate-y-1">
                <div className="p-5">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                             <img src={plan.logoUrl || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} alt="Logo do Cliente" className="w-12 h-12 object-cover rounded-md bg-gray-200 dark:bg-gray-700"/>
                             <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.campaignName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{Object.keys(plan.months || {}).length} {t('Meses')}</p>
                             </div>
                        </div>
                         <div className="relative" ref={actionsMenuRef}>
                            <button onClick={() => setIsActionsMenuOpen(p => !p)} className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <MoreVertical size={20}/>
                            </button>
                             {isActionsMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                         <button onClick={() => setConfirmDeletePlanId(plan.id)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                                            <Trash2 size={16}/> {t('Delete Plan')}
                                        </button>
                                    </div>
                                </div>
                            )}
                         </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 h-10 overflow-hidden">{plan.objective}</p>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-gray-500 dark:text-gray-400">{t('Investimento Total')}</span>
                             <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(summary.budget)}</span>
                         </div>
                     </div>
                </div>
                <button onClick={() => onSelectPlan(plan)} className="w-full bg-blue-600 text-white font-bold py-3 hover:bg-blue-700 transition-colors">{t('Abrir Plano')}</button>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <DashboardHeader onProfileClick={onProfileClick} />
            <main className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {plans.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button onClick={() => setPlanCreationChoiceOpen(true)} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                            <PlusCircle size={40} className="mb-2"/>
                            <span className="font-semibold">{t('create_new_plan')}</span>
                        </button>
                        {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
                     </div>
                ) : (
                    <div className="text-center py-20">
                        <img src={ICON_LOGO} alt="MasterPlan Icon" className="mx-auto h-24 mb-6 opacity-50"/>
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('Nenhum plano encontrado')}</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Crie seu primeiro plano de mídia para começar.')}</p>
                        <button onClick={() => setPlanCreationChoiceOpen(true)} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                            <PlusCircle size={20}/> {t('create_new_plan')}
                        </button>
                    </div>
                )}
            </main>
            <footer className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} MasterPlan AI. {t('Todos os direitos reservados.')}
            </footer>
            {planCreationChoiceOpen && (
                <PlanCreationChoiceModal 
                    isOpen={planCreationChoiceOpen}
                    onClose={() => setPlanCreationChoiceOpen(false)}
                    onPlanCreated={(type) => { onPlanCreated(type); setPlanCreationChoiceOpen(false); }}
                />
            )}
             {confirmDeletePlanId && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('Delete Plan')}</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('Confirm Delete This Plan')}</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setConfirmDeletePlanId(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                            <button onClick={() => { onDeletePlan(confirmDeletePlanId); setConfirmDeletePlanId(null); }} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{t('delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const PlanCreationChoiceModal: React.FC<PlanCreationChoiceModalProps> = ({ isOpen, onClose, onPlanCreated }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                 <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('create_new_plan')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card onClick={() => onPlanCreated('ai')} className="text-center group !p-4">
                         <Wand2 size={36} className="mx-auto text-blue-500 mb-3 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold mb-1">{t('create_with_ai')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('ai_description')}</p>
                    </Card>
                    <Card onClick={() => onPlanCreated('blank')} className="text-center group !p-4">
                        <FilePlus2 size={36} className="mx-auto text-blue-500 mb-3 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold mb-1">{t('start_blank')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('blank_description')}</p>
                    </Card>
                    <Card onClick={() => onPlanCreated('template')} className="text-center group !p-4">
                        <Sheet size={36} className="mx-auto text-blue-500 mb-3 transition-transform group-hover:scale-110" />
                        <h3 className="font-semibold mb-1">{t('create_from_template')}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('template_description')}</p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ planData, onNavigate, onAddMonthClick, onRegeneratePlan, isRegenerating, isReadOnly = false }) => {
    const { t } = useLanguage();
    const { summary, monthlySummary } = useMemo(() => calculatePlanSummary(planData), [planData]);
    const [isAIAnalysisModalOpen, setAIAnalysisModalOpen] = useState(false);
    const [aiAnalysisContent, setAIAnalysisContent] = useState('');
    const [isAIAnalysisLoading, setIsAIAnalysisLoading] = useState(false);
    const [isAIPlanAdjustModalOpen, setIsAIPlanAdjustModalOpen] = useState(false);
    
    const handleAnalyzePlan = async () => {
        setAIAnalysisModalOpen(true);
        setIsAIAnalysisLoading(true);
        try {
            const planString = JSON.stringify({
                generalObjective: planData.objective,
                targetAudience: planData.targetAudience,
                totalInvestment: planData.totalInvestment,
                months: planData.months,
            }, null, 2);

            const prompt = `
                As a world-class media planning strategist, analyze the following media plan JSON.
                Provide a concise strategic analysis in HTML format.
                
                The HTML output MUST be well-structured and clean. Do not include \`<html>\`, \`<body>\` tags, or markdown fences like \`\`\`html.
                - The main title MUST be wrapped in an \`<h3>\` tag.
                - Each major section (e.g., Alignment, Strategy, Opportunities) MUST have its title wrapped in an \`<h4>\` tag.
                - All descriptive text MUST be wrapped in \`<p>\` tags. Ensure there is clear paragraph separation for readability.
                - Bold key terms or metrics using \`<strong>\` tags where appropriate.
                
                Example of desired HTML structure:
                <h3>Strategic Analysis: [Plan Name]</h3>
                <h4>1. Alignment</h4>
                <p>The budget and channel allocation are well-aligned with the objective of X. A modest initial investment is dedicated to building awareness...</p>
                <p>The majority of the budget is correctly concentrated on high-intent channels...</p>
                <h4>2. Opportunities for Improvement</h4>
                <p><strong>Diversify Top-Funnel:</strong> Consider reallocating a portion of the budget to TikTok to engage a younger demographic...</p>

                Media Plan Data:
                ${planString}

                Analyze the plan's alignment with its goals, the chosen strategy (funnel, channels), and provide 2-3 concrete opportunities for improvement. The analysis should be insightful and actionable. Respond in the user's language: ${TRANSLATIONS[useLanguage().language]['language']}.
            `;

            const analysis = await callGeminiAPI(prompt);
            setAIAnalysisContent(analysis);
        } catch (error) {
            console.error("Error analyzing plan with AI:", error);
            setAIAnalysisContent(`<p>${t('Erro ao analisar plano com IA.')}</p>`);
        } finally {
            setIsAIAnalysisLoading(false);
        }
    };
    
    const sortedMonths = Object.keys(monthlySummary).sort(sortMonthKeys);

    return (
        <div className="space-y-6">
            <Card>
                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                     <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Resumo do Plano')}</h2>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Objetivo')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1">{planData.objective}</dd></div>
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Público-Alvo')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1">{planData.targetAudience}</dd></div>
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Praça')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1">{planData.location}</dd></div>
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Investimento Planejado')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1 font-semibold">{formatCurrency(planData.totalInvestment)}</dd></div>
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Investimento Previsto')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1 font-semibold">{formatCurrency(summary.budget)}</dd></div>
                             <div><dt className="text-gray-500 dark:text-gray-400 font-medium">{t('Período')}:</dt><dd className="text-gray-800 dark:text-gray-200 mt-1">{sortedMonths.length} {t('Meses')}</dd></div>
                        </div>
                     </div>
                     {!isReadOnly && (
                         <div className="flex-shrink-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                             <button onClick={handleAnalyzePlan} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors">
                                 <Sparkles size={18}/> {t('Analisar Plano com IA')}
                             </button>
                             {planData.aiPrompt && (
                                 <button onClick={() => setIsAIPlanAdjustModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold transition-colors">
                                     <Wand2 size={18}/> {t('Ajustar Plano com IA')}
                                 </button>
                            )}
                         </div>
                     )}
                 </div>
            </Card>

             <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                 <MetricCard icon={DollarSign} title={t('Invest. Total')} value={formatCurrency(summary.budget)} />
                 <MetricCard icon={EyeIcon} title={t('Impressões')} value={formatNumber(summary.impressoes)} />
                 <MetricCard icon={MousePointerClick} title={t('Cliques')} value={formatNumber(summary.cliques)} />
                 <MetricCard icon={CheckSquare} title={t('Conversões')} value={formatNumber(summary.conversoes)} />
                 <MetricCard icon={TrendingUp} title={t('CTR (%)')} value={formatPercentage(summary.ctr)} />
                 <MetricCard icon={Target} title={t('CPA (R$)')} value={formatCurrency(summary.cpa)} />
                 <MetricCard icon={TrendingUp} title={t('Tx. Conversão')} value={formatPercentage(summary.taxaConversao)} />
                 {/* FIX: Explicitly cast connectRate to a number for arithmetic operation to satisfy TypeScript. */}
                 <MetricCard icon={VisitsIcon} title={t('Visitas')} value={formatNumber(summary.budget > 0 ? (summary.cliques * Number(DEFAULT_METRICS_BY_OBJECTIVE['Tráfego'].connectRate || 80) / 100) : 0)} />
            </div>

            <Card>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('Performance por Mês')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">{t('Mês')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Invest. Total')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('% Share')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Impressões')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Cliques')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Conversões')}</th>
                                <th scope="col" className="px-6 py-3 text-right">{t('Tx. Conversão')}</th>
                                {!isReadOnly && <th scope="col" className="px-6 py-3"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMonths.length > 0 ? (
                                <>
                                    {sortedMonths.map(month => {
                                        const monthData = monthlySummary[month];
                                        const share = summary.budget > 0 ? (monthData.budget / summary.budget) * 100 : 0;
                                        const monthName = month.split('-').reverse().map(p => t(p)).join(' ');
                                        return (
                                            <tr key={month} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{monthName}</td>
                                                <td className="px-6 py-4 text-right">{formatCurrency(monthData.budget)}</td>
                                                <td className="px-6 py-4 text-right">{formatPercentage(share)}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(monthData.impressoes)}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(monthData.cliques)}</td>
                                                <td className="px-6 py-4 text-right">{formatNumber(monthData.conversoes)}</td>
                                                <td className="px-6 py-4 text-right">{formatPercentage(monthData.taxaConversao)}</td>
                                                {!isReadOnly && (
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => onNavigate(month)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">{t('Ver Detalhes')}</button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-50 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-100">
                                        <td className="px-6 py-4">{t('Totais')}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(summary.budget)}</td>
                                        <td className="px-6 py-4 text-right">100%</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(summary.impressoes)}</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(summary.cliques)}</td>
                                        <td className="px-6 py-4 text-right">{formatNumber(summary.conversoes)}</td>
                                        <td className="px-6 py-4 text-right">{formatPercentage(summary.taxaConversao)}</td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </>
                             ) : (
                                 <tr>
                                     <td colSpan={isReadOnly ? 7 : 8} className="text-center py-10">
                                        <p>{t('Nenhuma campanha para este mês.')}</p>
                                        {!isReadOnly && (
                                            <button onClick={onAddMonthClick} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
                                                <PlusCircle size={18}/> {t('Adicionar Mês')}
                                            </button>
                                        )}
                                     </td>
                                 </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {sortedMonths.length > 0 && (
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ChartCard title={t('Investimento por Mês')} data={sortedMonths.map(m => ({ name: m.split('-')[1], [t('Budget')]: monthlySummary[m].budget }))} dataKey={t('Budget')} nameKey="name" />
                     <ChartsSection 
                        campaigns={Object.values(planData.months).flat()} 
                        title={t('Distribuição de Investimento (Geral)')} 
                     />
                 </div>
            )}
            
            <AIResponseModal 
                isOpen={isAIAnalysisModalOpen}
                onClose={() => setAIAnalysisModalOpen(false)}
                title={t('Análise Estratégica do Plano')}
                content={aiAnalysisContent}
                isLoading={isAIAnalysisLoading}
            />
            {planData.aiPrompt && (
                <AIPlanCreationModal
                    isOpen={isAIPlanAdjustModalOpen}
                    onClose={() => setIsAIPlanAdjustModalOpen(false)}
                    onGenerate={onRegeneratePlan}
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

const MetricCard: React.FC<{ icon: React.ElementType, title: string, value: string | number }> = ({ icon: Icon, title, value }) => (
    <Card className="flex items-center gap-4">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    </Card>
);

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

    const monthName = month.split('-').reverse().map(p => t(p)).join(' ');

    return (
        <div className="space-y-6">
            <Card>
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Plano de Mídia - {month}', { month: monthName })}</h2>
                    {!isReadOnly && (
                        <button onClick={handleNewCampaign} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors">
                            <PlusCircle size={18}/> {campaigns.length > 0 ? t('Nova Campanha') : t('Adicionar Primeira Campanha')}
                        </button>
                    )}
                 </div>

                <div className="mt-6 overflow-x-auto">
                    {campaigns && campaigns.length > 0 ? (
                        <table className="w-full min-w-[1200px] text-sm text-left text-gray-500 dark:text-gray-400">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">{t('Tipo')}</th>
                                    <th className="px-4 py-3">{t('Funil')}</th>
                                    <th className="px-4 py-3">{t('Canal')}</th>
                                    <th className="px-4 py-3">{t('Formato')}</th>
                                    <th className="px-4 py-3">{t('Budget')}</th>
                                    <th className="px-4 py-3">{t('% Share')}</th>
                                    <th className="px-4 py-3">{t('Impressões')}</th>
                                    <th className="px-4 py-3">{t('Cliques')}</th>
                                    <th className="px-4 py-3">{t('Conversões')}</th>
                                    <th className="px-4 py-3">{t('CTR (%)')}</th>
                                    <th className="px-4 py-3">{t('Taxa de Conversão (%)')}</th>
                                    <th className="px-4 py-3">{t('CPA (R$)')}</th>
                                    {!isReadOnly && <th className="px-4 py-3">{t('actions')}</th>}
                                </tr>
                             </thead>
                             <tbody>
                                {campaigns.map(c => {
                                    const share = totalInvestment > 0 ? (Number(c.budget || 0) / totalInvestment) * 100 : 0;
                                    return (
                                        <tr key={c.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                            <td className="px-4 py-4">{c.tipoCampanha}</td>
                                            <td className="px-4 py-4">{c.etapaFunil}</td>
                                            <td className="px-4 py-4">{c.canal}</td>
                                            <td className="px-4 py-4">{c.formato}</td>
                                            <td className="px-4 py-4 font-medium text-gray-800 dark:text-gray-200">{formatCurrency(c.budget)}</td>
                                            <td className="px-4 py-4">{formatPercentage(share)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.impressoes)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.cliques)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.conversoes)}</td>
                                            <td className="px-4 py-4">{formatPercentage(c.ctr)}</td>
                                            <td className="px-4 py-4">{formatPercentage(c.taxaConversao)}</td>
                                            <td className="px-4 py-4">{formatCurrency(c.cpa)}</td>
                                            {!isReadOnly && (
                                                <td className="px-4 py-4 flex items-center gap-2">
                                                    <button onClick={() => handleEditCampaign(c)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Edit size={16}/></button>
                                                    <button onClick={() => onDelete(month, c.id)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                             </tbody>
                             <tfoot>
                                <tr className="bg-gray-50 dark:bg-gray-700 font-bold text-gray-800 dark:text-gray-100">
                                    <td className="px-4 py-4" colSpan={4}>{t('Totais do Mês')}</td>
                                    <td className="px-4 py-4">{formatCurrency(monthTotals.budget)}</td>
                                    <td className="px-4 py-4">{formatPercentage(totalInvestment > 0 ? (monthTotals.budget / totalInvestment) * 100 : 0)}</td>
                                    <td className="px-4 py-4">{formatNumber(monthTotals.impressoes)}</td>
                                    <td className="px-4 py-4">{formatNumber(monthTotals.cliques)}</td>
                                    <td className="px-4 py-4">{formatNumber(monthTotals.conversoes)}</td>
                                    <td className="px-4 py-4" colSpan={3}></td>
                                </tr>
                             </tfoot>
                        </table>
                    ) : (
                         <div className="text-center py-16">
                            <p className="text-gray-500 dark:text-gray-400">{t('Nenhuma campanha adicionada para {month}.', { month: monthName })}</p>
                        </div>
                    )}
                </div>
            </Card>

            {campaigns && campaigns.length > 0 && (
                <ChartsSection 
                    campaigns={campaigns} 
                    title={t('Distribuição de Investimento ({month})', { month: monthName })}
                />
            )}
            
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

export const ChartsSection: React.FC<ChartsSectionProps> = ({ campaigns, title }) => {
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        const channelData = campaigns.reduce((acc, c) => {
            if (!c.canal) return acc;
            acc[c.canal] = (acc[c.canal] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);
        
        const campaignTypeData = campaigns.reduce((acc, c) => {
            if (!c.tipoCampanha) return acc;
            acc[c.tipoCampanha] = (acc[c.tipoCampanha] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);
        
        const formatData = campaigns.reduce((acc, c) => {
            if (!c.formato) return acc;
            acc[c.formato] = (acc[c.formato] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);

        const funnelData = campaigns.reduce((acc, c) => {
            if (!c.etapaFunil) return acc;
            acc[c.etapaFunil] = (acc[c.etapaFunil] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);

        return {
            channel: Object.entries(channelData).map(([name, value]) => ({ name, value })),
            campaignType: Object.entries(campaignTypeData).map(([name, value]) => ({ name, value })),
            format: Object.entries(formatData).map(([name, value]) => ({ name, value })),
            funnel: Object.entries(funnelData).map(([name, value]) => ({ name, value })),
        };
    }, [campaigns]);

    return (
        <Card>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title={t('Investimento por Canal')} data={chartData.channel} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Tipo de Campanha')} data={chartData.campaignType} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Formato')} data={chartData.format} dataKey="value" nameKey="name" />
                <ChartCard title={t('Investimento por Etapa Funil')} data={chartData.funnel} dataKey="value" nameKey="name" />
            </div>
        </Card>
    );
};

export const ChartCard: React.FC<ChartCardProps> = ({ title, data, dataKey, nameKey }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="h-80">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 text-center">{title}</h4>
            <ResponsiveContainer width="100%" height="100%">
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
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                            const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const AddMonthModal: React.FC<AddMonthModalProps> = ({ isOpen, onClose, onAddMonth, existingMonths }) => {
    const { t } = useLanguage();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('');

    const availableMonths = useMemo(() => {
        return MONTHS_LIST.filter(month => {
            const monthKey = `${selectedYear}-${month}`;
            return !existingMonths.includes(monthKey);
        });
    }, [selectedYear, existingMonths]);
    
    useEffect(() => {
        if(availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0]);
        } else {
            setSelectedMonth('');
        }
    }, [selectedYear, availableMonths]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if(selectedMonth) {
            onAddMonth(`${selectedYear}-${selectedMonth}`);
        }
    };
    
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Adicionar Mês ao Plano')}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {availableMonths.length > 0 ? (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ano</label>
                                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Mês')}</label>
                                 <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                                    <option value="">{t('Selecione um mês')}</option>
                                    {availableMonths.map(m => <option key={m} value={m}>{t(m)}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-600 dark:text-gray-400">{t('Todos os meses já foram adicionados.')}</p>
                    )}
                </div>
                 <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('cancel')}</button>
                    <button onClick={handleAdd} disabled={availableMonths.length === 0 || !selectedMonth} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{t('add')}</button>
                </div>
            </div>
        </div>
    );
};

export const CopyBuilderPage: React.FC<CopyBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const channels = useMemo(() => {
        const uniqueChannels = new Set<string>();
        Object.values(planData.months || {}).flat().forEach(campaign => {
            if (campaign.canal) uniqueChannels.add(campaign.canal);
        });
        return Array.from(uniqueChannels);
    }, [planData.months]);

    const [activeChannel, setActiveChannel] = useState(channels[0] || null);
    
    useEffect(() => {
        if (!activeChannel && channels.length > 0) {
            setActiveChannel(channels[0]);
        } else if (activeChannel && !channels.includes(activeChannel)) {
            setActiveChannel(channels[0] || null);
        }
    }, [channels, activeChannel]);

    const handleUpdateCreativeGroup = (updatedGroup: CreativeTextData) => {
        if (!activeChannel) return;
        const updatedCreatives = { ...(planData.creatives || {}) };
        const groupIndex = (updatedCreatives[activeChannel] || []).findIndex(g => g.id === updatedGroup.id);
        if (groupIndex > -1) {
            updatedCreatives[activeChannel][groupIndex] = updatedGroup;
            setPlanData({ ...planData, creatives: updatedCreatives });
        }
    };
    
    const handleDeleteCreativeGroup = (id: number) => {
        if(!activeChannel) return;
        const updatedCreatives = {...(planData.creatives || {})};
        updatedCreatives[activeChannel] = (updatedCreatives[activeChannel] || []).filter(g => g.id !== id);
        setPlanData({...planData, creatives: updatedCreatives});
    };

    const handleAddCreativeGroup = () => {
        if (!activeChannel) return;
        const newGroup: CreativeTextData = {
            id: new Date().getTime(),
            name: `${t('Novo Grupo')} ${((planData.creatives || {})[activeChannel]?.length || 0) + 1}`,
            context: '',
            headlines: [''],
            descriptions: [''],
        };
        const updatedCreatives = { ...(planData.creatives || {}) };
        if (!updatedCreatives[activeChannel]) {
            updatedCreatives[activeChannel] = [];
        }
        updatedCreatives[activeChannel].push(newGroup);
        setPlanData({ ...planData, creatives: updatedCreatives });
    };

    if (channels.length === 0) {
        return (
            <Card className="text-center">
                <h2 className="text-xl font-semibold mb-2">{t('Nenhum canal ativo')}</h2>
                <p className="text-gray-600 dark:text-gray-400">{t('Para começar, adicione campanhas com canais definidos no seu plano de mídia.')}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Criativos para')}: {activeChannel}</h2>
                     <div className="flex items-center gap-2">
                        <select
                            value={activeChannel || ''}
                            onChange={(e) => setActiveChannel(e.target.value)}
                            className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {channels.map(channel => (
                                <option key={channel} value={channel}>{channel}</option>
                            ))}
                        </select>
                        <button onClick={handleAddCreativeGroup} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors">
                            <PlusCircle size={18}/> {t('Novo Grupo')}
                        </button>
                    </div>
                </div>
            </Card>
            <div className="space-y-6">
                {activeChannel && planData.creatives && planData.creatives[activeChannel]?.length > 0 ? (
                    planData.creatives[activeChannel].map(group => (
                        <CreativeGroup 
                            key={group.id} 
                            group={group} 
                            channel={activeChannel}
                            onUpdate={handleUpdateCreativeGroup}
                            onDelete={handleDeleteCreativeGroup}
                            planData={planData}
                        />
                    ))
                ) : (
                    <Card className="text-center py-12">
                         <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('Nenhum grupo de criativos para {channel}', { channel: activeChannel || '' })}</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Comece adicionando um novo grupo.')}</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export const CreativeGroup: React.FC<CreativeGroupProps> = ({ group, channel, onUpdate, onDelete, planData }) => {
    const { t } = useLanguage();
    const [isSuggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
    const [isSuggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Record<string, string[]> | null>(null);

    const updateField = (field: keyof CreativeTextData, value: any, index?: number) => {
        const newGroup = { ...group };
        if (index !== undefined && Array.isArray(newGroup[field])) {
            (newGroup[field] as string[])[index] = value;
        } else {
            (newGroup[field] as any) = value;
        }
        onUpdate(newGroup);
    };

    const addField = (field: 'headlines' | 'descriptions' | 'longHeadlines') => {
        const newGroup = { ...group };
        newGroup[field] = [...(newGroup[field] || []), ''];
        onUpdate(newGroup);
    };

    const removeField = (field: 'headlines' | 'descriptions' | 'longHeadlines', index: number) => {
        const newGroup = { ...group };
        (newGroup[field] as string[]).splice(index, 1);
        onUpdate(newGroup);
    };

    const handleGenerateSuggestions = async () => {
        setSuggestionsModalOpen(true);
        setSuggestionsLoading(true);
        try {
            const prompt = `You are a creative copywriter for ${channel}. Generate creative copy suggestions for a media plan with the objective "${planData.objective}" and target audience "${planData.targetAudience}".
            The context for this specific creative group is: "${group.context}".
            
            The output MUST be a valid JSON object. Do not include any text or markdown fences.
            The JSON object should have these keys: "headlines", "longHeadlines", "descriptions".
            - "headlines": An array of 5 short, punchy headlines (max 30 characters).
            - "longHeadlines": An array of 3 longer headlines (max 90 characters). Only for channels like Google Ads.
            - "descriptions": An array of 5 compelling descriptions (max 90 characters).

            If the channel is not Google Ads, return an empty array for "longHeadlines".
            
            Respond in ${TRANSLATIONS[useLanguage().language]['language']}.`;
            
            const result = await callGeminiAPI(prompt, true);
            setSuggestions(result);
        } catch (error) {
            console.error(error);
            setSuggestions(null);
            alert(t('Falha ao gerar sugestões.'));
        } finally {
            setSuggestionsLoading(false);
        }
    };
    
    const applySuggestion = (type: string, text: string) => {
        const fieldMap = {
            'Títulos (Headlines)': 'headlines',
            'Headlines': 'headlines',
            'Títulos Longos (Long Headlines)': 'longHeadlines',
            'Long Headlines': 'longHeadlines',
            'Descrições (Descriptions)': 'descriptions',
            'Descriptions': 'descriptions',
        } as const;
        const fieldKey = fieldMap[type as keyof typeof fieldMap];

        if (fieldKey) {
            const currentValues = group[fieldKey] || [];
            // Find first empty field to replace, or add a new one
            const emptyIndex = currentValues.findIndex(v => v === '');
            if(emptyIndex > -1){
                updateField(fieldKey, text, emptyIndex);
            } else {
                updateField(fieldKey, [...currentValues, text]);
            }
        }
    };
    
    const applyAllSuggestions = (type: string, texts: string[]) => {
        const fieldMap = {
            'Títulos (Headlines)': 'headlines',
            'Headlines': 'headlines',
            'Títulos Longos (Long Headlines)': 'longHeadlines',
            'Long Headlines': 'longHeadlines',
            'Descrições (Descriptions)': 'descriptions',
            'Descriptions': 'descriptions',
        } as const;
        const fieldKey = fieldMap[type as keyof typeof fieldMap];

        if (fieldKey) {
            const currentValues = (group[fieldKey] || []).filter(v => v !== '');
            const newValues = [...currentValues, ...texts];
            onUpdate({...group, [fieldKey]: newValues});
        }
    };

    return (
        <Card>
             <div className="flex justify-between items-start mb-4">
                 <input 
                    type="text"
                    value={group.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none p-0 focus:ring-0 w-full"
                    placeholder={t('Nome do Grupo de Criativos')}
                />
                <button onClick={() => onDelete(group.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('Contexto para a IA')}</label>
                <textarea 
                    value={group.context} 
                    onChange={(e) => updateField('context', e.target.value)} 
                    rows={3} 
                    className="mt-1 w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('Descreva o produto, público, oferta e palavras-chave para guiar a IA...')}
                />
                <button onClick={handleGenerateSuggestions} className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    <Sparkles size={16}/> {t('Gerar Sugestões com IA')}
                </button>
             </div>
             
             <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Headlines */}
                 <div className="space-y-2">
                     <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Títulos (Headlines)')} (30)</h4>
                     {group.headlines.map((h, i) => (
                         <div key={i} className="flex items-center gap-2">
                             <CharacterCountInput value={h} onChange={(e) => updateField('headlines', e.target.value, i)} maxLength={30} placeholder={`Headline ${i + 1}`}/>
                             {group.headlines.length > 1 && <button onClick={() => removeField('headlines', i)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>}
                         </div>
                     ))}
                     <button onClick={() => addField('headlines')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t('add')}</button>
                 </div>
                 
                {/* Long Headlines */}
                 {['Google Ads', 'Meta Ads', 'Microsoft Ads'].includes(channel) && (
                     <div className="space-y-2">
                         <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Títulos Longos (Long Headlines)')} (90)</h4>
                         {(group.longHeadlines || []).map((h, i) => (
                             <div key={i} className="flex items-center gap-2">
                                 <CharacterCountInput value={h} onChange={(e) => updateField('longHeadlines', e.target.value, i)} maxLength={90} placeholder={`Long Headline ${i + 1}`}/>
                                 {(group.longHeadlines || []).length > 1 ? <button onClick={() => removeField('longHeadlines', i)} className="text-gray-400 hover:text-red-500"><X size={18}/></button> : <div className="w-[26px]"></div>}
                             </div>
                         ))}
                         <button onClick={() => addField('longHeadlines')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t('add')}</button>
                     </div>
                 )}
                 
                 {/* Descriptions */}
                 <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('Descrições (Descriptions)')} (90)</h4>
                     {group.descriptions.map((d, i) => (
                         <div key={i} className="flex items-center gap-2">
                             <CharacterCountInput value={d} onChange={(e) => updateField('descriptions', e.target.value, i)} maxLength={90} placeholder={`Description ${i + 1}`} rows={2}/>
                              {group.descriptions.length > 1 && <button onClick={() => removeField('descriptions', i)} className="text-gray-400 hover:text-red-500"><X size={18}/></button>}
                         </div>
                     ))}
                     <button onClick={() => addField('descriptions')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t('add')}</button>
                 </div>
             </div>
             <AISuggestionsModal 
                isOpen={isSuggestionsModalOpen}
                onClose={() => setSuggestionsModalOpen(false)}
                isLoading={isSuggestionsLoading}
                suggestions={suggestions}
                onApplySuggestion={applySuggestion}
                onApplyAllSuggestions={applyAllSuggestions}
             />
        </Card>
    );
};

export const UTMBuilderPage: React.FC<UTMBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const initialUTMState = { url: '', source: '', medium: '', campaign: '', term: '', content: '' };
    const [utm, setUtm] = useState(initialUTMState);
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUtm({ ...utm, [e.target.name]: e.target.value });
    };

    const generateUrl = () => {
        if (!utm.url || !utm.source || !utm.medium || !utm.campaign) {
            alert(t('Por favor, preencha todos os campos obrigatórios (*) e gere a URL.'));
            return;
        }
        let baseUrl = utm.url;
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = 'https://' + baseUrl;
        }
        const params = new URLSearchParams({
            utm_source: utm.source,
            utm_medium: utm.medium,
            utm_campaign: utm.campaign,
        });
        if (utm.term) params.append('utm_term', utm.term);
        if (utm.content) params.append('utm_content', utm.content);

        setGeneratedUrl(`${baseUrl}?${params.toString()}`);
    };
    
    useEffect(() => {
        generateUrl();
    }, [utm]);

    const saveLink = () => {
        if (!generatedUrl) return;
        const newLink: UTMLink = {
            id: new Date().getTime(),
            createdAt: new Date(),
            fullUrl: generatedUrl,
            ...utm,
        };
        const updatedPlan = {
            ...planData,
            utmLinks: [...(planData.utmLinks || []), newLink],
        };
        setPlanData(updatedPlan);
        clearForm();
    };

    const clearForm = () => {
        setUtm(initialUTMState);
        setGeneratedUrl('');
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const deleteLink = (id: number) => {
        const updatedPlan = {
            ...planData,
            utmLinks: (planData.utmLinks || []).filter(link => link.id !== id),
        };
        setPlanData(updatedPlan);
    };
    
    const [activeExportMenu, setActiveExportMenu] = useState<number | null>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setActiveExportMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const UTMInput: React.FC<{name: keyof typeof utm, label: string, required?: boolean, helperText: string}> = ({name, label, required=false, helperText}) => (
        <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                {label} {required && '*'}
                 <div className="relative group ml-2">
                    <HelpCircle size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {helperText}
                    </div>
                </div>
            </label>
            <input
                type="text"
                name={name}
                value={utm[name]}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <div className="space-y-4">
                        <UTMInput name="url" label={t('URL do Site *')} required helperText={t('utm_url_helper')} />
                        <UTMInput name="source" label={t('Campaign Source *')} required helperText={t('utm_source_helper')} />
                        <UTMInput name="medium" label={t('Campaign Medium *')} required helperText={t('utm_medium_helper')} />
                        <UTMInput name="campaign" label={t('Campaign Name *')} required helperText={t('utm_campaign_helper')} />
                        <UTMInput name="term" label={t('Campaign Term')} helperText={t('utm_term_helper')} />
                        <UTMInput name="content" label={t('Campaign Content')} helperText={t('utm_content_helper')} />
                    </div>
                    <div className="mt-6 border-t pt-4 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('URL Gerada')}</label>
                        <div className="mt-1 relative">
                            <textarea
                                readOnly
                                value={generatedUrl || t('Preencha os campos para gerar a URL.')}
                                rows={4}
                                className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200"
                            />
                            {generatedUrl && (
                                <button onClick={copyUrl} className="absolute top-2 right-2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                                    {copied ? <Check size={16} className="text-green-500"/> : <CopyIcon size={16} />}
                                </button>
                            )}
                        </div>
                    </div>
                     <div className="mt-4 flex gap-2">
                        <button onClick={saveLink} disabled={!generatedUrl} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{t('Salvar Link')}</button>
                        <button onClick={clearForm} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('Limpar')}</button>
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('Links Salvos')}</h3>
                         <div className="relative" ref={exportMenuRef}>
                             <button onClick={() => setActiveExportMenu(activeExportMenu === 99 ? null : 99)} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">{t('Exportar como:')}</button>
                             {activeExportMenu === 99 && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                    <button onClick={() => exportUTMLinksAsCSV(planData, t)} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">.csv</button>
                                    <button onClick={() => exportUTMLinksAsTXT(planData, t)} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">.txt</button>
                                </div>
                            )}
                         </div>
                    </div>
                    <div className="overflow-x-auto">
                        {planData.utmLinks && planData.utmLinks.length > 0 ? (
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3">{t('Data')}</th>
                                        <th className="px-4 py-3">{t('Campanha')}</th>
                                        <th className="px-4 py-3">{t('URL Completa')}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {planData.utmLinks.map(link => (
                                        <tr key={link.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                            <td className="px-4 py-4 whitespace-nowrap">{new Date(link.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-4">{link.campaign}</td>
                                            <td className="px-4 py-4 max-w-xs truncate">
                                                <a href={link.fullUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{link.fullUrl}</a>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button onClick={() => deleteLink(link.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t('Nenhum link salvo ainda.')}</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export const KeywordBuilderPage: React.FC<KeywordBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const [mode, setMode] = useState<'seed' | 'prompt'>('seed');
    const [input, setInput] = useState('');
    const [keywordCount, setKeywordCount] = useState('20');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedKeywords, setGeneratedKeywords] = useState<KeywordSuggestion[]>([]);
    const [adGroups, setAdGroups] = useState<AdGroup[]>(planData.adGroups || []);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    
    useEffect(() => {
        setPlanData({ ...planData, adGroups });
    }, [adGroups]);

    const handleGenerateKeywords = async () => {
        setIsLoading(true);
        try {
            const keywords = await generateAIKeywords(planData, mode, input, useLanguage().language, keywordCount);
            setGeneratedKeywords(keywords);
        } catch (error) {
            console.error(error);
            alert(t('error_generating_keywords'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateAdGroup = () => {
        if (newGroupName.trim()) {
            const newGroup: AdGroup = {
                id: `group_${new Date().getTime()}`,
                name: newGroupName.trim(),
                keywords: [],
            };
            setAdGroups([...adGroups, newGroup]);
            setNewGroupName('');
        }
    };

    const handleDeleteAdGroup = (groupId: string) => {
        if (!window.confirm(t('confirm_delete_group'))) return;
        setAdGroups(adGroups.filter(g => g.id !== groupId));
    };
    
    const handleAssignToGroup = (groupId: string) => {
        if (selectedKeywords.length === 0) return;

        const keywordsToMove = generatedKeywords.filter(k => selectedKeywords.includes(k.keyword));
        
        setAdGroups(adGroups.map(group => {
            if (group.id === groupId) {
                return { ...group, keywords: [...group.keywords, ...keywordsToMove] };
            }
            return group;
        }));

        setGeneratedKeywords(generatedKeywords.filter(k => !selectedKeywords.includes(k.keyword)));
        setSelectedKeywords([]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <div className="space-y-4">
                        {/* Tabs for Seed/Prompt */}
                         <div className="flex border-b dark:border-gray-700">
                             <button onClick={() => setMode('seed')} className={`px-4 py-2 text-sm font-medium ${mode === 'seed' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('seed_keywords_label')}</button>
                             <button onClick={() => setMode('prompt')} className={`px-4 py-2 text-sm font-medium ${mode === 'prompt' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{t('ai_prompt_label')}</button>
                         </div>
                         {mode === 'seed' ? (
                              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} placeholder={t('seed_keywords_placeholder')} className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                         ) : (
                              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} placeholder={t('ai_prompt_placeholder')} className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                         )}
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('number_of_suggestions')}</label>
                            <input type="number" value={keywordCount} onChange={(e) => setKeywordCount(e.target.value)} min="10" max="100" className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                         </div>
                         <button onClick={handleGenerateKeywords} disabled={isLoading || !input} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {isLoading ? <LoaderIcon className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                            {isLoading ? t('generating_keywords') : t('generate_keywords')}
                         </button>
                    </div>
                </Card>
                 <Card>
                     <h3 className="text-lg font-semibold mb-2">{t('ad_groups')}</h3>
                     <div className="flex gap-2 mb-4">
                         <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={t('ad_group_name_placeholder')} className="flex-grow border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                         <button onClick={handleCreateAdGroup} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">{t('add')}</button>
                     </div>
                     <div className="space-y-2 max-h-60 overflow-y-auto">
                        {adGroups.map(group => (
                            <div key={group.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700/50 rounded-md">
                                <span className="font-medium">{group.name}</span>
                                <button onClick={() => handleDeleteAdGroup(group.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                     </div>
                 </Card>
            </div>
             <div className="lg:col-span-2">
                 <Card>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('Results')}</h3>
                    {generatedKeywords.length > 0 && (
                        <div className="mb-4 flex items-center gap-2">
                             <select onChange={(e) => handleAssignToGroup(e.target.value)} disabled={selectedKeywords.length === 0} className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50">
                                <option>{t('assign_to_group')}</option>
                                {adGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                             </select>
                        </div>
                    )}
                    <div className="overflow-x-auto max-h-[70vh]">
                        {generatedKeywords.length > 0 ? (
                             <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3"><input type="checkbox" onChange={e => setSelectedKeywords(e.target.checked ? generatedKeywords.map(k => k.keyword) : [])} /></th>
                                        <th className="px-4 py-3">{t('keyword')}</th>
                                        <th className="px-4 py-3">{t('search_volume')}</th>
                                        <th className="px-4 py-3">{t('estimated_clicks')}</th>
                                        <th className="px-4 py-3">{t('min_cpc')}</th>
                                        <th className="px-4 py-3">{t('max_cpc')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generatedKeywords.map(kw => (
                                        <tr key={kw.keyword} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                            <td className="px-4 py-4"><input type="checkbox" checked={selectedKeywords.includes(kw.keyword)} onChange={e => setSelectedKeywords(e.target.checked ? [...selectedKeywords, kw.keyword] : selectedKeywords.filter(k => k !== kw.keyword))} /></td>
                                            <td className="px-4 py-4 font-medium">{kw.keyword}</td>
                                            <td className="px-4 py-4">{formatNumber(kw.volume)}</td>
                                            <td className="px-4 py-4">{formatNumber(kw.clickPotential)}</td>
                                            <td className="px-4 py-4">{formatCurrency(kw.minCpc)}</td>
                                            <td className="px-4 py-4">{formatCurrency(kw.maxCpc)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        ) : (
                             <p className="text-center py-8">{t('no_keywords_generated')}</p>
                        )}
                    </div>
                 </Card>
             </div>
        </div>
    );
};

export const CreativeBuilderPage: React.FC<CreativeBuilderPageProps> = ({ planData }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(planData.aiImagePrompt || '');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

    const handleGenerateImages = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setGeneratedImages([]);
        try {
            const images = await generateAIImages(prompt);
            setGeneratedImages(images);
        } catch (error) {
            console.error(error);
            alert(t('error_generating_images'));
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
    }

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('Prompt para Geração de Imagem')}</h2>
                <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={4}
                    placeholder={t('creative_prompt_placeholder')}
                    className="mt-4 w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                />
                <button 
                    onClick={handleGenerateImages} 
                    disabled={isLoading || !prompt}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? <LoaderIcon className="animate-spin" /> : <ImageIcon />}
                    {isLoading ? t('generating_images') : t('generate_images')}
                </button>
            </Card>
            <Card>
                {isLoading && (
                    <div className="text-center py-10">
                        <LoaderIcon size={40} className="animate-spin text-blue-500 mx-auto" />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('generating_images')}</p>
                    </div>
                )}
                {generatedImages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {generatedImages.map((image, index) => (
                             <div key={index} className="group relative">
                                <img src={`data:image/png;base64,${image.base64}`} alt={`Generated image ${index + 1}`} className="w-full h-auto object-cover rounded-lg aspect-square" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                    <button onClick={() => downloadImage(image.base64, `masterplan-creative-${index}.png`)} className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white/80 text-black rounded-md text-sm font-semibold flex items-center gap-2">
                                        <FileDown size={16} /> {t('download')}
                                    </button>
                                </div>
                                <p className="absolute bottom-1 right-2 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">{image.aspectRatio}</p>
                             </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('creative_builder_initial_prompt')}</p>
                )}
            </Card>
        </div>
    );
};