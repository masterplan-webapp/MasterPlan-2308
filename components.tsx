

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy as CopyIcon, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, LucideProps, AlertTriangle, KeyRound, Tags, Tag, ImageIcon, ExternalLink, HelpCircle } from 'lucide-react';
import { useLanguage, useTheme, useAuth } from './contexts';
import { callGeminiAPI, formatCurrency, formatPercentage, formatNumber, recalculateCampaignMetrics, calculateKPIs, dbService, sortMonthKeys, generateAIKeywords, generateAIImages, exportCreativesAsCSV, exportCreativesAsTXT, exportUTMLinksAsCSV, exportUTMLinksAsTXT, exportGroupedKeywordsAsCSV, exportGroupedKeywordsAsTXT, exportGroupedKeywordsToPDF, calculatePlanSummary } from './services';
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
    const baseClasses = "bg-gray-800 shadow-sm rounded-lg p-6";
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
        className: `w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 ${isError ? 'ring-red-500 border-red-500' : 'focus:ring-blue-500 focus:border-transparent'}`
    };

    return (
        <div className="w-full">
            {rows ? (
                <textarea {...commonProps} rows={rows}></textarea>
            ) : (
                <input type="text" {...commonProps} />
            )}
            <p className={`text-xs mt-1 text-right ${isError ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
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
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2"><Sparkles className="text-blue-500"/> {title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <LoaderIcon className="animate-spin text-blue-500" size={40}/>
                        </div>
                    ) : (
                        <div 
                            className="text-gray-300 space-y-4 
                                       [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-gray-100 [&_h3]:mb-4 [&_h3]:pb-2 [&_h3]:border-b [&_h3]:border-gray-600
                                       [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-gray-200 [&_h4]:mt-6 [&_h4]:mb-2
                                       [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end">
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
    
        let campaignWithUpdate = { ...campaign, [field]: value };
    
        if (field === 'tipoCampanha') {
            const defaults = DEFAULT_METRICS_BY_OBJECTIVE[value as string] || {};
            campaignWithUpdate = { ...defaults, ...campaignWithUpdate };
        }
        
        const recalculatedCampaign = recalculateCampaignMetrics(campaignWithUpdate);
        
        const finalCampaignState = { ...recalculatedCampaign, [field]: value };
        
        setCampaign(finalCampaignState);
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
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8 animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{campaignData ? t('Editar Campanha') : t('Nova Campanha')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    {/* Coluna 1: Planejamento */}
                    <div className="md:col-span-2 space-y-4">
                        <h3 className="text-lg font-medium text-gray-100 border-b pb-2 mb-2">Planejamento Estratégico</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Tipo Campanha')}</label>
                                <select value={campaign.tipoCampanha || ''} onChange={(e) => handleChange('tipoCampanha', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.tipoCampanha.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Etapa Funil')}</label>
                                <select value={campaign.etapaFunil || ''} onChange={(e) => handleChange('etapaFunil', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.etapaFunil.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                         </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Canal')}</label>
                                <select value={campaign.canal || ''} onChange={(e) => handleChange('canal', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                     <option value="">{t('Selecione')}</option>
                                     {OPTIONS.canal.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Formato')}</label>
                                {isAddingFormat ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={newFormat}
                                            onChange={(e) => setNewFormat(e.target.value)}
                                            className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200"
                                            placeholder="Nome do formato"
                                            autoFocus
                                        />
                                        <button onClick={handleAddFormat} className="mt-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm">{t('save')}</button>
                                        <button onClick={() => setIsAddingFormat(false)} className="mt-1 px-3 py-2 bg-gray-600 rounded-md text-sm"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select 
                                            value={campaign.formato || ''} 
                                            onChange={(e) => handleChange('formato', e.target.value)} 
                                            className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            disabled={!campaign.canal}
                                        >
                                            <option value="">{t(campaign.canal ? 'Selecione' : 'Selecione um canal')}</option>
                                            {availableFormats.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                        <button onClick={() => setIsAddingFormat(true)} className="mt-1 p-2 bg-gray-600 rounded-md hover:bg-gray-500"><PlusCircle size={20} /></button>
                                    </div>
                                )}
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300">{t('Objetivo')}</label>
                            <input type="text" value={campaign.objetivo || ''} onChange={(e) => handleChange('objetivo', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">{t('KPI')}</label>
                            <input type="text" value={campaign.kpi || ''} onChange={(e) => handleChange('kpi', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-gray-300">{t('Público-Alvo')}</label>
                           <textarea value={campaign.publicoAlvo || ''} onChange={(e) => handleChange('publicoAlvo', e.target.value)} rows={3} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                           <button onClick={handleSuggestAudience} disabled={isAISuggestionLoading} className="mt-2 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50">
                                {isAISuggestionLoading ? <LoaderIcon size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                {t('Sugerir Público com IA')}
                           </button>
                           {aiSuggestion && (
                               <div className="mt-2 p-3 bg-blue-900/20 border border-blue-800 rounded-md text-sm text-blue-200">
                                   <p>{aiSuggestion}</p>
                                   <button onClick={() => { handleChange('publicoAlvo', aiSuggestion); setAISuggestion(''); }} className="mt-2 text-xs font-bold hover:underline">{t('Aplicar')}</button>
                               </div>
                           )}
                        </div>
                        
                        <h3 className="text-lg font-medium text-gray-100 border-b pb-2 pt-4 mb-2">Orçamento e Compra</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Budget (R$)')}</label>
                                <input type="number" step="100" value={campaign.budget || ''} onChange={(e) => handleChange('budget', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Unidade de Compra')}</label>
                                <select value={campaign.unidadeCompra || ''} onChange={(e) => handleChange('unidadeCompra', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">{t('Selecione')}</option>
                                    {OPTIONS.unidadeCompra.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Coluna 2: Métricas */}
                    <div className="md:col-span-1 space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                         <h3 className="text-lg font-medium text-gray-100 border-b pb-2 mb-2">{t('Métricas Estimadas')}</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Impressões')}</label>
                                <input type="number" value={campaign.impressoes || ''} onChange={(e) => handleChange('impressoes', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Cliques')}</label>
                                <input type="number" value={campaign.cliques || ''} onChange={(e) => handleChange('cliques', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-400">{t('CTR (%)')}</label>
                                <input type="number" step="0.01" value={campaign.ctr || ''} onChange={(e) => handleChange('ctr', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-400">{t('CPC (R$)')}</label>
                                <input type="number" step="0.01" value={campaign.cpc || ''} onChange={(e) => handleChange('cpc', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-400">{t('CPM (R$)')}</label>
                                <input type="number" step="0.01" value={campaign.cpm || ''} onChange={(e) => handleChange('cpm', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                              </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Taxa de Conversão (%)')}</label>
                                <input type="number" step="0.01" value={campaign.taxaConversao || ''} onChange={(e) => handleChange('taxaConversao', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Connect Rate (%)')}</label>
                                <input type="number" step="1" value={campaign.connectRate || ''} onChange={(e) => handleChange('connectRate', e.target.value)} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 text-sm"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Conversões')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-700/50 text-gray-200 text-sm font-semibold">{formatNumber(campaign.conversoes)}</p>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-400">{t('Visitas')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-700/50 text-gray-200 text-sm font-semibold">{formatNumber(campaign.visitas)}</p>
                             </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-400">{t('CPA (R$)')}</label>
                                <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-700/50 text-gray-200 text-sm font-semibold">{formatCurrency(campaign.cpa)}</p>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('cancel')}</button>
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
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-xl animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('Configurações do Plano')}</h2>
                     <div className="flex items-center gap-2">
                         <button onClick={() => onRename(planData)} className="p-2 text-gray-400 hover:text-white" title={t('Rename')}><Edit size={18} /></button>
                         <button onClick={() => onDuplicate(planData)} className="p-2 text-gray-400 hover:text-white" title={t('Duplicate Plan')}><CopyIcon size={18} /></button>
                         <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button>
                     </div>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-300">{t('Logotipo')}</label>
                            <img src={details.logoUrl || 'https://placehold.co/400x300/e2e8f0/e2e8f0'} alt="Logo" className="mt-1 w-full aspect-square object-cover rounded-md bg-gray-700"/>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            <button onClick={() => fileInputRef.current?.click()} className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-200 bg-gray-800 hover:bg-gray-700">
                                <Upload size={16} /> {t('Upload')}
                            </button>
                            <input
                                type="text"
                                value={details.logoUrl || ''}
                                onChange={(e) => setDetails(prev => ({ ...prev, logoUrl: e.target.value }))}
                                placeholder={t('Cole a URL do logotipo aqui')}
                                className="mt-2 w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                         </div>
                         <div className="sm:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Nome da Campanha')}</label>
                                <input type="text" value={details.campaignName || ''} readOnly className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700/50 text-gray-200 cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Objetivo Geral')}</label>
                                <textarea value={details.objective || ''} onChange={(e) => setDetails(prev => ({...prev, objective: e.target.value}))} rows={3} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">{t('Público-Alvo Principal')}</label>
                                <textarea value={details.targetAudience || ''} onChange={(e) => setDetails(prev => ({...prev, targetAudience: e.target.value}))} rows={3} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            </div>
                         </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">{t('Praça')}</label>
                            <input type="text" value={details.location || ''} onChange={(e) => setDetails(prev => ({...prev, location: e.target.value}))} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">{t('Período')}</label>
                             <p className="mt-1 block w-full rounded-md py-2 px-3 bg-gray-700/50 text-gray-200 h-[42px] flex items-center">
                                {Object.keys(planData.months || {}).length} {t('Meses')}
                            </p>
                        </div>
                     </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">{t('Investimento Total Planejado (R$)')}</label>
                        <input type="number" value={details.totalInvestment || 0} onChange={(e) => setDetails(prev => ({...prev, totalInvestment: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('cancel')}</button>
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
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('Rename Plan')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-300">{t('Plan Name')}</label>
                    <input 
                        id="plan-name"
                        type="text" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)}
                        className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('cancel')}</button>
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
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                        <Sparkles className="text-blue-500"/>
                        {title || t('Sugestões de Criativos (IA)')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <LoaderIcon className="animate-spin text-blue-500" size={40}/>
                            <p className="mt-4">{t('Gerando sugestões...')}</p>
                        </div>
                    ) : (
                        suggestions && Object.keys(suggestions).length > 0 ? (
                             <div className="space-y-6">
                                {Object.entries(suggestions).map(([type, texts]) => (
                                    <div key={type}>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-semibold capitalize text-gray-100">{t(type)}</h3>
                                            {onApplyAllSuggestions && (
                                                <button 
                                                    onClick={() => handleApplyAll(type, texts)} 
                                                    className="text-sm font-medium text-blue-400 hover:underline"
                                                >
                                                    {t('Aplicar Todos')}
                                                </button>
                                            )}
                                        </div>
                                        <ul className="space-y-2">
                                            {texts.map((text, index) => {
                                                const isApplied = applied[type]?.includes(index);
                                                return (
                                                    <li key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md">
                                                        <p className="text-gray-200">{text}</p>
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
                             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
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
        <div className="h-screen w-full flex items-center justify-center bg-gray-900 p-4">
            <Card className="max-w-md w-full text-center shadow-2xl">
                <img 
                  src={LOGO_DARK} 
                  alt="MasterPlan Logo" 
                  className="mx-auto h-16 mb-4"
                />
                <h1 className="text-3xl font-bold text-gray-100">{t('Planeamento de Mídia Inteligente')}</h1>
                <p className="mt-2 mb-8 text-gray-400">{t('Ferramenta de IA para Marketing.')}</p>
                <button 
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-md transition-all duration-300"
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
        <div className="h-screen w-full flex items-center justify-center bg-gray-900 p-4">
            <Card className="max-w-4xl w-full text-center">
                <h1 className="text-3xl font-bold text-gray-100">{t('welcome_to_masterplan')}</h1>
                <p className="mt-2 mb-8 text-lg text-gray-400">{t('create_first_plan')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => onPlanCreated('ai')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-700/50 hover:border-blue-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><Sparkles className="text-blue-500"/> {t('create_with_ai')}</h2>
                        <p className="mt-2 text-gray-400">{t('ai_description')}</p>
                    </button>
                    <button onClick={() => onPlanCreated('template')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-700/50 hover:border-green-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><Sheet className="text-green-500"/> {t('create_from_template')}</h2>
                        <p className="mt-2 text-gray-400">{t('template_description')}</p>
                    </button>
                    <button onClick={() => onPlanCreated('blank')} className="text-left p-6 border-2 border-transparent rounded-lg bg-gray-700/50 hover:border-gray-500 hover:shadow-lg transition-all">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><FilePlus2 className="text-gray-500"/> {t('start_blank')}</h2>
                        <p className="mt-2 text-gray-400">{t('blank_description')}</p>
                    </button>
                </div>
            </Card>
        </div>
    );
};

export const PlanCreationChoiceModal: React.FC<PlanCreationChoiceModalProps> = ({ isOpen, onClose, onPlanCreated }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const handleChoice = (type: 'ai' | 'blank' | 'template') => {
        onPlanCreated(type);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('create_new_plan')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <button onClick={() => handleChoice('ai')} className="text-left p-6 border rounded-lg bg-gray-700/50 hover:border-blue-500 hover:shadow-lg transition-all border-gray-700">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><Sparkles className="text-blue-500"/> {t('create_with_ai')}</h2>
                            <p className="mt-2 text-gray-400">{t('ai_description')}</p>
                        </button>
                        <button onClick={() => handleChoice('template')} className="text-left p-6 border rounded-lg bg-gray-700/50 hover:border-green-500 hover:shadow-lg transition-all border-gray-700">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><Sheet className="text-green-500"/> {t('create_from_template')}</h2>
                            <p className="mt-2 text-gray-400">{t('template_description')}</p>
                        </button>
                        <button onClick={() => handleChoice('blank')} className="text-left p-6 border rounded-lg bg-gray-700/50 hover:border-gray-500 hover:shadow-lg transition-all border-gray-700">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-100"><FilePlus2 className="text-gray-500"/> {t('start_blank')}</h2>
                            <p className="mt-2 text-gray-400">{t('blank_description')}</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PlanSelectorPage: React.FC<PlanSelectorPageProps> = ({ plans, onSelectPlan, onPlanCreated, user, onProfileClick, onDeletePlan, onRenamePlan, onRenameRequest }) => {
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const [isChoiceModalOpen, setChoiceModalOpen] = useState(false);

    const handleDuplicate = (planToDuplicate: PlanData) => {
        const newPlan: PlanData = {
            ...JSON.parse(JSON.stringify(planToDuplicate)), // Deep copy
            id: `plan_${new Date().getTime()}`,
            campaignName: `${planToDuplicate.campaignName} ${t('Copy')}`,
        };
        onPlanCreated(newPlan);
    }

    const handleDelete = (planId: string) => {
        if (window.confirm(t('Confirm Delete This Plan'))) {
            onDeletePlan(planId);
        }
    }

    const PlanCard: React.FC<{ plan: PlanData }> = ({ plan }) => {
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        return (
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
                <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <img src={plan.logoUrl || 'https://placehold.co/100x100/e2e8f0/94a3b8?text=P'} alt="Logo" className="w-12 h-12 rounded-md object-cover bg-gray-200" />
                            <div>
                                <h3 className="font-bold text-lg text-gray-100">{plan.campaignName}</h3>
                                <p className="text-sm text-gray-400">{plan.objective}</p>
                            </div>
                        </div>
                        <div className="relative" ref={menuRef}>
                             <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1.5 text-gray-400 hover:bg-gray-700 rounded-full">
                                <MoreVertical size={20}/>
                             </button>
                             {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-10">
                                    <button onClick={() => { onRenameRequest(plan); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{t('Rename')}</button>
                                    <button onClick={() => { handleDuplicate(plan); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{t('duplicate')}</button>
                                    <div className="border-t border-gray-700 my-1"></div>
                                    <button onClick={() => { handleDelete(plan.id); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20">{t('delete')}</button>
                                </div>
                             )}
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 bg-gray-800/50">
                    <button onClick={() => onSelectPlan(plan)} className="w-full text-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">{t('Abrir Plano')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <header className="bg-gray-800 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <img src={LOGO_DARK} alt="MasterPlan Logo" className="h-8"/>
                         <div className="flex items-center gap-4">
                            <button onClick={onProfileClick} className="flex items-center gap-2">
                                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0D8ABC&color=fff`} alt="User avatar" className="w-8 h-8 rounded-full"/>
                                <span className="hidden sm:inline font-medium text-gray-200">{user.displayName}</span>
                            </button>
                            <button onClick={signOut} className="p-2 text-gray-400 hover:bg-gray-700 rounded-full" title={t('sign_out')}>
                                <LogOut size={20}/>
                            </button>
                         </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-100">{t('my_plans')}</h1>
                    <button onClick={() => setChoiceModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 transition-colors">
                        <PlusCircle size={20}/> {t('create_new_plan')}
                    </button>
                </div>

                {plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => <PlanCard key={plan.id} plan={plan}/>)}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <h2 className="text-2xl font-semibold text-gray-300">{t('Nenhum plano encontrado')}</h2>
                        <p className="mt-2 text-gray-400">{t('Crie seu primeiro plano de mídia para começar.')}</p>
                    </div>
                )}
            </main>
            <PlanCreationChoiceModal isOpen={isChoiceModalOpen} onClose={() => setChoiceModalOpen(false)} onPlanCreated={onPlanCreated} />
        </div>
    );
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ElementType, isCurrency?: boolean, isPercentage?: boolean, isReadOnly?: boolean }> = ({ title, value, icon: Icon, isReadOnly=false }) => {
    return (
        <Card className="flex items-start gap-4">
            <div className="p-3 bg-blue-900/30 rounded-lg shrink-0">
                <Icon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-400 truncate">{title}</p>
                <p className="truncate text-2xl lg:text-xl xl:text-lg font-bold text-gray-100">{value}</p>
            </div>
        </Card>
    );
};

const ChartCard: React.FC<ChartCardProps> = ({ title, data, dataKey, nameKey, className, customLegend }) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 p-2 border border-gray-700 rounded shadow-lg">
                    <p className="label text-gray-100">{`${payload[0].name} : ${formatCurrency(payload[0].value)}`}</p>
                </div>
            );
        }
        return null;
    };
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        // position label inside the slice
        const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Do not render label for very small slices to avoid clutter
        if (percent < 0.05) {
            return null;
        }

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="12px"
                fontWeight="bold"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }} // Add a subtle shadow for readability
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    return (
        <Card className={`flex flex-col ${className}`}>
            <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
            <div className="flex-grow w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey={dataKey}
                            nameKey={nameKey}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        {customLegend || <Legend />}
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onProfileClick }) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                 <h1 className="text-3xl font-bold text-gray-100">{t('my_plans')}</h1>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onProfileClick}
                    className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-700"
                >
                    <img 
                        src={user?.photoURL || ''} 
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full"
                    />
                    <span className="font-semibold hidden sm:inline text-gray-200">{user?.displayName}</span>
                </button>
            </div>
        </div>
    );
};

const ChartsSection: React.FC<ChartsSectionProps> = ({ campaigns, title }) => {
    const { t } = useLanguage();

    const chartData = useMemo(() => {
        const byChannel = campaigns.reduce((acc, c) => {
            const key = c.canal || 'N/A';
            acc[key] = (acc[key] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);

        const byCampaignType = campaigns.reduce((acc, c) => {
            const key = c.tipoCampanha || 'N/A';
            acc[key] = (acc[key] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);
        
         const byFunnelStage = campaigns.reduce((acc, c) => {
            const key = c.etapaFunil || 'N/A';
            acc[key] = (acc[key] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);

        const byFormat = campaigns.reduce((acc, c) => {
            const key = c.formato || 'N/A';
            acc[key] = (acc[key] || 0) + Number(c.budget || 0);
            return acc;
        }, {} as Record<string, number>);

        return {
            byChannel: Object.entries(byChannel).map(([name, value]) => ({ name, value })),
            byCampaignType: Object.entries(byCampaignType).map(([name, value]) => ({ name, value })),
            byFunnelStage: Object.entries(byFunnelStage).map(([name, value]) => ({ name, value })),
            byFormat: Object.entries(byFormat).map(([name, value]) => ({ name, value })),
        };
    }, [campaigns]);

    if (campaigns.length === 0) return null;

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-6">{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6">
                <ChartCard title={t("Investimento por Canal")} data={chartData.byChannel} dataKey="value" nameKey="name" />
                <ChartCard title={t("Investimento por Tipo de Campanha")} data={chartData.byCampaignType} dataKey="value" nameKey="name" />
                <ChartCard title={t("Investimento por Etapa Funil")} data={chartData.byFunnelStage} dataKey="value" nameKey="name" />
                <ChartCard title={t("Investimento por Formato")} data={chartData.byFormat} dataKey="value" nameKey="name" />
            </div>
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ planData, onNavigate, onAddMonthClick, onRegeneratePlan, isRegenerating, isReadOnly }) => {
    const { t } = useLanguage();
    const { summary, monthlySummary } = useMemo(() => calculatePlanSummary(planData), [planData]);
    const [isAIAnalysisModalOpen, setAIAnalysisModalOpen] = useState(false);
    const [isAIAnalysisLoading, setAIAnalysisLoading] = useState(false);
    const [aiAnalysisContent, setAIAnalysisContent] = useState('');
    const [isAIPlanAdjustModalOpen, setIsAIPlanAdjustModalOpen] = useState(false);
    const [currentAIPrompt, setCurrentAIPrompt] = useState(planData.aiPrompt || '');


    const allCampaigns = Object.values(planData.months || {}).flat();
    const sortedMonthKeys = Object.keys(planData.months || {}).sort(sortMonthKeys);

    const handleAnalyzePlan = async () => {
        setAIAnalysisModalOpen(true);
        setAIAnalysisLoading(true);
        try {
            const planJson = JSON.stringify({
                objective: planData.objective,
                targetAudience: planData.targetAudience,
                totalInvestment: summary.budget,
                months: planData.months,
            }, null, 2);

            const prompt = `You are a world-class media planning strategist. Analyze the following media plan JSON data. Provide a concise, actionable strategic analysis in valid, clean HTML format.

        The HTML output must strictly follow these rules:
        1.  The entire output must be valid HTML.
        2.  Use one, and only one, <h3> tag for the main title of the analysis.
        3.  Use <h4> tags for each sub-topic title (e.g., "1. Alinhamento", "2. Estratégia"). These titles should be bold and larger than the paragraph text.
        4.  Wrap every single paragraph in its own <p> tag. This is crucial for creating visual separation between blocks of text. Do not combine multiple paragraphs into one <p> tag.
        5.  Do NOT include \`\`\`html, \`\`\`, or any other markdown fences or explanatory text around the final HTML output.

        Here is a perfect example of the required output structure:
        \`\`\`html
        <h3>Análise Estratégica do Plano de Lançamento</h3>
        <h4>1. Alinhamento Estratégico</h4>
        <p>O plano demonstra um bom alinhamento com o objetivo de lançamento. O investimento inicial em Julho focado em Meta Ads para awareness é uma escolha acertada para construir a base do funil.</p>
        <p>A maior parte do orçamento está corretamente concentrada em canais de alta intenção como Google Search no mês seguinte, visando a conversão.</p>
        <h4>2. Estratégia de Funil</h4>
        <p>A abordagem de funil "Topo > Fundo" é clássica e eficaz. O primeiro mês constrói audiência, e o segundo capitaliza esse interesse com retargeting e busca, o que constitui uma base sólida.</p>
        <h4>3. Oportunidades de Melhoria</h4>
        <p>Considere diversificar os canais de topo de funil. Alocar uma parte do orçamento de Julho para o TikTok pode gerar entusiasmo e afinidade com a marca a um CPM potencialmente menor, dado o público-alvo.</p>
        <p>Adicionar uma campanha de "Branded Search" no Google Ads, mesmo com um orçamento pequeno, pode proteger a marca e capturar usuários com alta intenção de compra no final da jornada.</p>
        \`\`\`

        Your analysis must focus on:
        - **Alinhamento**: Is the budget and channel allocation aligned with the main objective?
        - **Estratégia**: What is the apparent strategy? Is it sound?
        - **Oportunidades**: What are 2-3 specific, actionable recommendations for improvement?
        - **Riscos**: What is one potential risk or blind spot in this plan?

        Responda em Português do Brasil.

        Media Plan Data:
        \`\`\`json
        ${planJson}
        \`\`\`
        `;

            const analysis = await callGeminiAPI(prompt);
            setAIAnalysisContent(analysis);
        } catch (error) {
            console.error(error);
            setAIAnalysisContent(`<p>${t('Erro ao analisar plano com IA.')}</p>`);
        } finally {
            setAIAnalysisLoading(false);
        }
    };
    
    const handleAdjustAndRegenerate = async () => {
        setIsAIPlanAdjustModalOpen(false);
        await onRegeneratePlan(currentAIPrompt);
    }

    return (
        <div className="space-y-8">
            {/* Resumo do Plano e Ações */}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100">{t('Resumo do Plano')}</h2>
                        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-400">
                            <div><dt className="font-semibold text-gray-200 inline">{t('Objetivo')}:</dt> {planData.objective}</div>
                            <div><dt className="font-semibold text-gray-200 inline">{t('Público-Alvo')}:</dt> {planData.targetAudience}</div>
                            <div><dt className="font-semibold text-gray-200 inline">{t('Investimento Previsto')}:</dt> {formatCurrency(planData.totalInvestment)}</div>
                            <div><dt className="font-semibold text-gray-200 inline">{t('Investimento Planejado')}:</dt> {formatCurrency(summary.budget)}</div>
                            <div><dt className="font-semibold text-gray-200 inline">{t('Período')}:</dt> {sortedMonthKeys.length} {t('Meses')}</div>
                        </dl>
                    </div>
                     <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {!isReadOnly && (
                            <>
                                <button onClick={handleAnalyzePlan} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                                <Sparkles size={18} /> {t('Analisar Plano com IA')}
                                </button>
                                {planData.aiPrompt && (
                                    <button onClick={() => setIsAIPlanAdjustModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-colors">
                                    <Wand2 size={18} /> {t('Ajustar Plano com IA')}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Card>

            {/* Métricas Gerais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <MetricCard title={t('Invest. Total')} value={formatCurrency(summary.budget)} icon={DollarSign} />
                <MetricCard title={t('Impressões')} value={formatNumber(summary.impressoes)} icon={EyeIcon} />
                <MetricCard title={t('Cliques')} value={formatNumber(summary.cliques)} icon={MousePointerClick} />
                <MetricCard title={t('Conversões')} value={formatNumber(summary.conversoes)} icon={CheckSquare} />
                <MetricCard title={t('CTR (%)')} value={formatPercentage(summary.ctr)} icon={TrendingUp} />
                <MetricCard title={t('CPA (R$)')} value={formatCurrency(summary.cpa)} icon={Target} />
            </div>

             {/* Performance por Mês */}
            <div>
                 <h2 className="text-2xl font-bold text-gray-100 mb-6">{t('Performance por Mês')}</h2>
                 <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('Mês')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Invest. Total')}</th>
                                    <th scope="col" className="px-6 py-3">{t('% Share')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Impressões')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Cliques')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Conversões')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Tx. Conversão')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMonthKeys.map(month => {
                                    const monthData = monthlySummary[month];
                                    const share = summary.budget > 0 ? (monthData.budget / summary.budget) * 100 : 0;
                                    const [year, monthName] = month.split('-');

                                    return (
                                        <tr key={month} className="border-b bg-gray-800 border-gray-700 hover:bg-gray-600">
                                            <th scope="row" className="px-6 py-4 font-medium whitespace-nowrap text-white">
                                                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(month); }} className="text-blue-500 hover:underline">
                                                    {`${t(monthName)} ${year}`}
                                                </a>
                                            </th>
                                            <td className="px-6 py-4">{formatCurrency(monthData.budget)}</td>
                                            <td className="px-6 py-4">{formatPercentage(share)}</td>
                                            <td className="px-6 py-4">{formatNumber(monthData.impressoes)}</td>
                                            <td className="px-6 py-4">{formatNumber(monthData.cliques)}</td>
                                            <td className="px-6 py-4">{formatNumber(monthData.conversoes)}</td>
                                            <td className="px-6 py-4">{formatPercentage(monthData.taxaConversao)}</td>
                                        </tr>
                                    );
                                })}
                                 <tr className="font-semibold text-white bg-gray-700">
                                    <th scope="row" className="px-6 py-3 text-base">{t('Totais')}</th>
                                    <td className="px-6 py-3">{formatCurrency(summary.budget)}</td>
                                    <td className="px-6 py-3">100%</td>
                                    <td className="px-6 py-3">{formatNumber(summary.impressoes)}</td>
                                    <td className="px-6 py-3">{formatNumber(summary.cliques)}</td>
                                    <td className="px-6 py-3">{formatNumber(summary.conversoes)}</td>
                                    <td className="px-6 py-3">{formatPercentage(summary.taxaConversao)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                     <div className="pt-4 text-center">
                         {!isReadOnly && (
                            <button onClick={onAddMonthClick} className="text-blue-400 hover:underline font-medium flex items-center gap-2 mx-auto">
                                <PlusCircle size={16}/> {t('Adicionar Mês')}
                            </button>
                         )}
                    </div>
                 </Card>
            </div>
            
             <ChartsSection campaigns={allCampaigns} title={t("Distribuição de Investimento (Geral)")} />

            <AIResponseModal 
                isOpen={isAIAnalysisModalOpen}
                onClose={() => setAIAnalysisModalOpen(false)}
                title={t('Análise Estratégica do Plano')}
                content={aiAnalysisContent}
                isLoading={isAIAnalysisLoading}
            />
            
            <AIPlanCreationModal 
                isOpen={isAIPlanAdjustModalOpen}
                onClose={() => setIsAIPlanAdjustModalOpen(false)}
                onGenerate={handleAdjustAndRegenerate}
                isLoading={isRegenerating}
                initialPrompt={currentAIPrompt}
                title={t('Ajustar Prompt do Plano IA')}
                buttonText={t('Regerar Plano')}
                loadingText={t('Regerando plano...')}
            />

        </div>
    );
};

export const MonthlyPlanPage: React.FC<MonthlyPlanPageProps> = ({ month, campaigns, onSave, onDelete, planObjective, customFormats, onAddFormat, totalInvestment, isReadOnly }) => {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleEdit = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setSelectedCampaign(null);
        setIsModalOpen(true);
    };
    
    const handleDelete = (id: string) => {
        if(window.confirm('Tem certeza que deseja apagar esta campanha?')) {
            onDelete(month, id);
        }
    }
    
    const totals = useMemo(() => {
        return (campaigns || []).filter(Boolean).reduce((acc, c) => {
            acc.budget += Number(c.budget) || 0;
            acc.impressoes += Number(c.impressoes) || 0;
            acc.cliques += Number(c.cliques) || 0;
            acc.conversoes += Number(c.conversoes) || 0;
            return acc;
        }, { budget: 0, impressoes: 0, cliques: 0, conversoes: 0 });
    }, [campaigns]);

    const [year, monthName] = month.split('-');

    return (
        <div className="space-y-8">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-100">{t('Plano de Mídia - {month}', { month: `${t(monthName)} ${year}` })}</h2>
                    {!isReadOnly && (
                        <button onClick={handleNew} className="w-full mt-4 sm:mt-0 sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                            <PlusCircle size={18}/> {t('Nova Campanha')}
                        </button>
                    )}
                </div>
                 {(campaigns || []).filter(Boolean).length === 0 ? (
                    <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-gray-300">{t('Nenhuma campanha para este mês.')}</h3>
                        <p className="mt-2 text-gray-400">{t('Adicione a primeira campanha para começar o planejamento.')}</p>
                        {!isReadOnly && (
                           <button onClick={handleNew} className="mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors mx-auto">
                                <PlusCircle size={18}/> {t('Adicionar Primeira Campanha')}
                           </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto mt-6">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-gray-700/50 text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">{t('Tipo')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Funil')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Canal')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Formato')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Budget')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Impressões')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Cliques')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Conversões')}</th>
                                    <th scope="col" className="px-6 py-3">{t('Orçamento Diário')}</th>
                                    {!isReadOnly && <th scope="col" className="px-6 py-3">{t('actions')}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(campaigns || []).filter(Boolean).map(campaign => (
                                    <tr key={campaign.id} className="border-b bg-gray-800 border-gray-700 hover:bg-gray-600/50">
                                        <td className="px-6 py-4 text-white">{campaign.tipoCampanha}</td>
                                        <td className="px-6 py-4">{campaign.etapaFunil}</td>
                                        <td className="px-6 py-4"><ChannelDisplay channel={campaign.canal || 'N/A'} /></td>
                                        <td className="px-6 py-4">{campaign.formato}</td>
                                        <td className="px-6 py-4">{formatCurrency(campaign.budget)}</td>
                                        <td className="px-6 py-4">{formatNumber(campaign.impressoes)}</td>
                                        <td className="px-6 py-4">{formatNumber(campaign.cliques)}</td>
                                        <td className="px-6 py-4">{formatNumber(campaign.conversoes)}</td>
                                        <td className="px-6 py-4">{formatCurrency(campaign.orcamentoDiario)}</td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleEdit(campaign)} className="p-1.5 text-blue-400 hover:bg-gray-700 rounded-md"><Edit size={16}/></button>
                                                    <button onClick={() => handleDelete(campaign.id)} className="p-1.5 text-red-400 hover:bg-gray-700 rounded-md"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="font-semibold text-white bg-gray-700/50">
                                <tr>
                                    <td colSpan={4} className="px-6 py-3 text-base">{t('Totais do Mês')}</td>
                                    <td className="px-6 py-3">{formatCurrency(totals.budget)}</td>
                                    <td className="px-6 py-3">{formatNumber(totals.impressoes)}</td>
                                    <td className="px-6 py-3">{formatNumber(totals.cliques)}</td>
                                    <td className="px-6 py-3">{formatNumber(totals.conversoes)}</td>
                                    <td colSpan={isReadOnly ? 1 : 2} className="px-6 py-3">{formatCurrency(totals.budget / 30.4)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>

            <ChartsSection campaigns={(campaigns || []).filter(Boolean)} title={t('Distribuição de Investimento ({month})', { month: `${t(monthName)} ${year}` })} />

            {isModalOpen && (
                <CampaignModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={onSave} 
                    campaignData={selectedCampaign}
                    month={month}
                    planObjective={planObjective}
                    customFormats={customFormats}
                    onAddFormat={onAddFormat}
                />
            )}
        </div>
    );
};

export const CreativeGroup: React.FC<CreativeGroupProps> = ({ group, channel, onUpdate, onDelete, planData }) => {
    const { t } = useLanguage();
    const [localGroup, setLocalGroup] = useState<CreativeTextData>(group);
    const [isAISuggestionsModalOpen, setIsAISuggestionsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<Record<string, string[]> | null>(null);
    const [suggestionType, setSuggestionType] = useState<'headlines' | 'descriptions' | 'longHeadlines' | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);

    useEffect(() => {
        setLocalGroup(group);
    }, [group]);

    const handleChange = (type: 'headlines' | 'longHeadlines' | 'descriptions', index: number, value: string) => {
        const updatedValues = [...(localGroup[type] || [])];
        updatedValues[index] = value;
        setLocalGroup(prev => ({ ...prev, [type]: updatedValues }));
    };

    const handleAddField = (type: 'headlines' | 'longHeadlines' | 'descriptions') => {
        setLocalGroup(prev => ({ ...prev, [type]: [...(prev[type] || []), ''] }));
    };

    const handleRemoveField = (type: 'headlines' | 'longHeadlines' | 'descriptions', index: number) => {
        const updatedValues = (localGroup[type] || []).filter((_, i) => i !== index);
        setLocalGroup(prev => ({ ...prev, [type]: updatedValues }));
    };
    
    const handleGenerateSuggestions = async (type: 'headlines' | 'descriptions' | 'longHeadlines' | null = null) => {
        setSuggestionType(type);
        setIsGenerating(true);
        setIsAISuggestionsModalOpen(true);
        setSuggestions(null);
        try {
            const contextPrompt = `
                **Contexto Geral do Plano:**
                - **Objetivo Principal:** ${planData.objective}
                - **Público-Alvo Principal:** ${planData.targetAudience}
                - **Canal de Mídia:** ${channel}

                **Contexto Específico do Grupo de Criativos:** ${localGroup.context}
            `;

            let generationPrompt;
            if (type) {
                const typeMap = {
                    headlines: { name: "títulos (headlines)", count: 5, constraint: "máximo de 30 caracteres" },
                    longHeadlines: { name: "títulos longos (long headlines)", count: 3, constraint: "máximo de 90 caracteres" },
                    descriptions: { name: "descrições (descriptions)", count: 3, constraint: "máximo de 90 caracteres" }
                };
                const currentType = typeMap[type];
                generationPrompt = `Gere uma lista de ${currentType.count} ${currentType.name} para um anúncio, seguindo a regra de ${currentType.constraint}.`;
            } else {
                 generationPrompt = `Gere sugestões de criativos para um anúncio, incluindo 5 títulos (máx 30 caracteres), 3 títulos longos (máx 90 caracteres) e 3 descrições (máx 90 caracteres).`;
            }

            const finalPrompt = `
                ${contextPrompt}
                
                **Tarefa:** ${generationPrompt}

                **Instruções de Saída:**
                - A saída DEVE ser um objeto JSON válido.
                - Não inclua NENHUM texto, explicação ou markdown fences (como \`\`\`json) antes ou depois do JSON.
                - As chaves do JSON devem ser "headlines", "longHeadlines", e "descriptions".
                - Cada chave deve conter um array de strings.
                
                Exemplo de saída:
                {
                  "headlines": ["Título 1", "Título 2"],
                  "longHeadlines": ["Título Longo 1"],
                  "descriptions": ["Descrição 1", "Descrição 2"]
                }
            `;
            const result = await callGeminiAPI(finalPrompt, true);
            setSuggestions(result);

        } catch (error) {
            console.error(error);
            alert(t('Falha ao gerar sugestões.'));
        } finally {
            setIsGenerating(false);
        }
    };
    
    const applySuggestion = (type: string, text: string) => {
        const T = type.toLowerCase() as 'headlines' | 'descriptions' | 'longHeadlines';
        if (T === 'headlines' || T === 'descriptions' || T === 'longHeadlines') {
            setLocalGroup(prev => ({...prev, [T]: [...(prev[T] || []), text]}));
        }
    };
    
    const applyAllSuggestions = (type: string, texts: string[]) => {
         const T = type.toLowerCase() as 'headlines' | 'descriptions' | 'longHeadlines';
        if (T === 'headlines' || T === 'descriptions' || T === 'longHeadlines') {
            setLocalGroup(prev => ({...prev, [T]: [...(prev[T] || []), ...texts]}));
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-start mb-4">
                {isEditingName ? (
                     <input 
                        type="text" 
                        value={localGroup.name}
                        onChange={(e) => setLocalGroup(prev => ({ ...prev, name: e.target.value }))}
                        onBlur={() => { onUpdate(localGroup); setIsEditingName(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(localGroup); setIsEditingName(false); }}}
                        className="text-xl font-semibold text-gray-100 bg-gray-700 p-1 -m-1 rounded"
                        autoFocus
                     />
                ) : (
                    <h3 onClick={() => setIsEditingName(true)} className="text-xl font-semibold text-gray-100 cursor-pointer">{localGroup.name}</h3>
                )}

                <div className="flex items-center gap-2">
                    <button onClick={() => onUpdate(localGroup)} className="p-2 text-gray-400 hover:text-white" title={t('save')}><Save size={18}/></button>
                    <button onClick={() => onDelete(group.id)} className="p-2 text-red-400 hover:text-red-300" title={t('delete')}><Trash2 size={18}/></button>
                </div>
            </div>
            
            <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{t('Contexto para a IA')}</label>
                    <textarea 
                        value={localGroup.context}
                        onChange={(e) => setLocalGroup(prev => ({...prev, context: e.target.value}))}
                        onBlur={() => onUpdate(localGroup)}
                        rows={3}
                        placeholder={t('Descreva o produto, público, oferta e palavras-chave para guiar a IA...')}
                        className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                     <button onClick={() => handleGenerateSuggestions()} disabled={isGenerating} className="mt-2 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50">
                        {isGenerating && !suggestionType ? <LoaderIcon size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {t('Gerar Sugestões com IA')}
                    </button>
                </div>
                
                {['headlines', 'longHeadlines', 'descriptions'].map(type => {
                    const T = type as 'headlines' | 'longHeadlines' | 'descriptions';
                    const titleMap = { headlines: 'Títulos (Headlines)', longHeadlines: 'Títulos Longos (Long Headlines)', descriptions: 'Descrições (Descriptions)'};
                    const charMap = { headlines: 30, longHeadlines: 90, descriptions: 90};

                    // Don't render Long Headlines section if channel is not Google Ads, for instance
                    if (T === 'longHeadlines' && !['Google Ads', 'Microsoft Ads'].includes(channel)) return null;
                    
                    return (
                        <div key={T}>
                             <div className="flex items-center justify-between mb-2">
                                 <label className="block text-sm font-medium text-gray-300">{t(titleMap[T])}</label>
                                 <button onClick={() => handleGenerateSuggestions(T)} className="flex items-center gap-1 text-xs text-blue-400 hover:underline" title={t('Gerar Sugestões com IA para este campo')}>
                                     <Sparkles size={14} /> {t('Gerar Ideias')}
                                 </button>
                             </div>
                             <div className="space-y-2">
                                {(localGroup[T] || []).map((value, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <CharacterCountInput 
                                            value={value}
                                            onChange={(e) => handleChange(T, index, e.target.value)}
                                            onBlur={() => onUpdate(localGroup)}
                                            maxLength={charMap[T]}
                                            placeholder="..."
                                        />
                                        <button onClick={() => handleRemoveField(T, index)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                             </div>
                             <button onClick={() => handleAddField(T)} className="mt-2 text-sm text-blue-400 hover:underline">{`+ ${t('add')}`}</button>
                        </div>
                    );
                })}

            </div>
             <AISuggestionsModal 
                isOpen={isAISuggestionsModalOpen}
                onClose={() => setIsAISuggestionsModalOpen(false)}
                isLoading={isGenerating}
                suggestions={suggestions}
                onApplySuggestion={applySuggestion}
                onApplyAllSuggestions={applyAllSuggestions}
             />
        </Card>
    )
}

export const CopyBuilderPage: React.FC<CopyBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    
    const channels = useMemo(() => {
        const allChannels = new Set<string>();
        Object.values(planData.months || {}).flat().filter(Boolean).forEach(campaign => {
            if (campaign?.canal) {
                allChannels.add(campaign.canal);
            }
        });
        return Array.from(allChannels);
    }, [planData.months]);
    
    const [activeChannel, setActiveChannel] = useState<string>(channels[0] || '');
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!activeChannel && channels.length > 0) {
            setActiveChannel(channels[0]);
        } else if (channels.length > 0 && !channels.includes(activeChannel)) {
            setActiveChannel(channels[0]);
        } else if (channels.length === 0) {
            setActiveChannel('');
        }
    }, [channels, activeChannel]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (channels.length === 0) {
        return (
            <Card className="text-center">
                <h2 className="text-xl font-semibold text-gray-200">{t('Nenhum canal ativo')}</h2>
                <p className="mt-2 text-gray-400">{t('Para começar, adicione campanhas com canais definidos no seu plano de mídia.')}</p>
            </Card>
        );
    }
    
    const creativeGroups = (planData.creatives?.[activeChannel] || []).filter(Boolean);

    const handleAddGroup = () => {
        const newGroup: CreativeTextData = {
            id: new Date().getTime(),
            name: `${t('Novo Grupo')} ${creativeGroups.length + 1}`,
            context: '',
            headlines: [''],
            descriptions: ['']
        };
        const updatedCreatives = {
            ...(planData.creatives || {}),
            [activeChannel]: [...creativeGroups, newGroup]
        };
        setPlanData({ ...planData, creatives: updatedCreatives });
    };

    const handleUpdateGroup = (updatedGroup: CreativeTextData) => {
        const updatedGroups = creativeGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
        const updatedCreatives = { ...planData.creatives, [activeChannel]: updatedGroups };
        setPlanData({ ...planData, creatives: updatedCreatives });
    };

    const handleDeleteGroup = (groupId: number) => {
        const updatedGroups = creativeGroups.filter(g => g.id !== groupId);
        const updatedCreatives = { ...planData.creatives, [activeChannel]: updatedGroups };
        setPlanData({ ...planData, creatives: updatedCreatives });
    };

    const cleanCreativeGroups = useMemo(() => (planData.creatives?.[activeChannel] || []).filter(Boolean), [planData.creatives, activeChannel]);


    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div>
                        <h2 className="text-2xl font-bold text-gray-100">{t('Criativos para')} {activeChannel}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {channels.map(channel => (
                                <button
                                    key={channel}
                                    onClick={() => setActiveChannel(channel)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${activeChannel === channel ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {channel}
                                </button>
                            ))}
                        </div>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={handleAddGroup} className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                            <PlusCircle size={18}/> {t('Novo Grupo de Criativos')}
                        </button>
                        <div className="relative" ref={exportMenuRef}>
                            <button onClick={() => setIsExportMenuOpen(prev => !prev)} className="p-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"><FileDown size={18}/></button>
                             {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1" role="menu">
                                        <button onClick={() => exportCreativesAsCSV(planData, t)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700" role="menuitem">
                                            {t('export_as_csv')}
                                        </button>
                                        <button onClick={() => exportCreativesAsTXT(planData, t)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700" role="menuitem">
                                            {t('export_as_txt')}
                                        </button>
                                    </div>
                                </div>
                             )}
                        </div>
                     </div>
                </div>
            </Card>

            {cleanCreativeGroups.length > 0 ? (
                <div className="space-y-6">
                    {cleanCreativeGroups.map(group => (
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
                <Card className="text-center py-16">
                    <h3 className="text-xl font-semibold text-gray-300">{t('Nenhum grupo de criativos para {channel}', {channel: activeChannel})}</h3>
                    <p className="mt-2 text-gray-400">{t('Comece adicionando um novo grupo.')}</p>
                </Card>
            )}
        </div>
    );
};

export const UTMBuilderPage: React.FC<UTMBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const [utm, setUtm] = useState<Omit<UTMLink, 'id' | 'createdAt' | 'fullUrl'>>({
        url: '',
        source: '',
        medium: '',
        campaign: '',
        term: '',
        content: '',
    });
    const [fullUrl, setFullUrl] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUtm(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const generateUrl = () => {
        if (!utm.url || !utm.source || !utm.medium || !utm.campaign) {
            setError(t('Por favor, preencha todos os campos obrigatórios (*) e gere a URL.'));
            return;
        }
        const params = new URLSearchParams();
        params.append('utm_source', utm.source);
        params.append('utm_medium', utm.medium);
        params.append('utm_campaign', utm.campaign);
        if (utm.term) params.append('utm_term', utm.term);
        if (utm.content) params.append('utm_content', utm.content);
        
        let baseUrl = utm.url;
        if (!baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`;
        }

        const finalUrl = `${baseUrl}?${params.toString()}`;
        setFullUrl(finalUrl);
        setError('');
    };

    const saveLink = () => {
        if (!fullUrl) {
            generateUrl();
            if (!utm.url || !utm.source || !utm.medium || !utm.campaign) return;
        }

        const newLink: UTMLink = {
            id: new Date().getTime(),
            createdAt: new Date(),
            fullUrl: fullUrl,
            ...utm,
        };
        const updatedLinks = [...(planData.utmLinks || []), newLink];
        setPlanData({ ...planData, utmLinks: updatedLinks });
    };

    const clearForm = () => {
        setUtm({ url: '', source: '', medium: '', campaign: '', term: '', content: '' });
        setFullUrl('');
        setError('');
    };
    
    const deleteLink = (id: number) => {
        const updatedLinks = (planData.utmLinks || []).filter(link => link.id !== id);
        setPlanData({...planData, utmLinks: updatedLinks});
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(fullUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const UTMInputField: React.FC<{name: keyof typeof utm, label: string, required?: boolean, helperText?: string}> = ({name, label, required, helperText}) => (
        <div>
            <label className="block text-sm font-medium text-gray-300">
                <div className="flex items-center gap-1.5">
                    <span>{label} {required && '*'}</span>
                    {helperText && (
                        <div className="group relative flex">
                            <HelpCircle size={14} className="text-gray-400 cursor-help" />
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-900 text-gray-200 text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                {helperText}
                            </span>
                        </div>
                    )}
                </div>
            </label>
            <input type="text" name={name} value={utm[name] || ''} onChange={handleChange} className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
    );


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="lg:col-span-2">
                    <div className="space-y-4">
                        <UTMInputField name="url" label={t('URL do Site *')} required helperText={t('utm_url_helper')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <UTMInputField name="source" label={t('Campaign Source *')} required helperText={t('utm_source_helper')} />
                            <UTMInputField name="medium" label={t('Campaign Medium *')} required helperText={t('utm_medium_helper')} />
                        </div>
                        <UTMInputField name="campaign" label={t('Campaign Name *')} required helperText={t('utm_campaign_helper')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <UTMInputField name="term" label={t('Campaign Term')} helperText={t('utm_term_helper')} />
                            <UTMInputField name="content" label={t('Campaign Content')} helperText={t('utm_content_helper')} />
                        </div>
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('URL Gerada')}</h3>
                    <div className="relative w-full h-40 p-3 bg-gray-700 rounded-md break-words text-gray-200 text-sm overflow-y-auto">
                        {fullUrl || <span className="text-gray-400">{t('Preencha os campos para gerar a URL.')}</span>}
                        {fullUrl && (
                             <button onClick={copyToClipboard} className="absolute top-2 right-2 p-1.5 bg-gray-600 rounded-md hover:bg-gray-500" title={t('Copiar URL')}>
                                 {copied ? <Check size={16} className="text-green-400"/> : <CopyIcon size={16}/>}
                             </button>
                        )}
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <div className="mt-4 flex flex-col gap-2">
                        <button onClick={generateUrl} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('Gerar Ideias')}</button>
                        <div className="flex gap-2">
                            <button onClick={saveLink} className="flex-1 px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('Salvar Link')}</button>
                            <button onClick={clearForm} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('Limpar')}</button>
                        </div>
                    </div>
                 </Card>
            </div>
             <Card>
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold text-gray-100">{t('Links Salvos')}</h3>
                    <div className="relative" ref={exportMenuRef}>
                        <button onClick={() => setIsExportMenuOpen(prev => !prev)} className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white">
                           {t('Exportar como:')} <ChevronDown size={16}/>
                        </button>
                        {isExportMenuOpen && (
                             <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu">
                                    <button onClick={() => exportUTMLinksAsCSV(planData, t)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700" role="menuitem">
                                        {t('export_as_csv')}
                                    </button>
                                    <button onClick={() => exportUTMLinksAsTXT(planData, t)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700" role="menuitem">
                                        {t('export_as_txt')}
                                    </button>
                                </div>
                            </div>
                         )}
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs uppercase bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-2">{t('Data')}</th>
                                <th className="px-4 py-2">{t('Campanha')}</th>
                                <th className="px-4 py-2">{t('URL Completa')}</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(planData.utmLinks || []).map(link => (
                                <tr key={link.id} className="border-b border-gray-700">
                                    <td className="px-4 py-2">{new Date(link.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-2">{link.campaign}</td>
                                    <td className="px-4 py-2"><span className="truncate block max-w-xs">{link.fullUrl}</span></td>
                                    <td className="px-4 py-2 text-right">
                                        <button onClick={() => deleteLink(link.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {(planData.utmLinks || []).length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500">{t('Nenhum link salvo ainda.')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );
};

// ... KeywordBuilderPage, CreativeBuilderPage, and other components follow ...

// Reusable Export Dropdown component
const ExportDropdown: React.FC<{
    onExport: (format: 'csv' | 'pdf') => void;
    label: string;
}> = ({ onExport, label }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 text-sm font-medium transition-colors">
                <FileDown size={16} />
                <span>{label}</span>
                <ChevronDown size={16} className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                        <button
                            onClick={() => { onExport('csv'); setIsOpen(false); }}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                           <Sheet size={16} /> {t('export_as_csv')}
                        </button>
                        <button
                            onClick={() => { onExport('pdf'); setIsOpen(false); }}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                            <FileText size={16} /> {t('export_to_pdf')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const AdGroupComponent: React.FC<{
    group: AdGroup;
    allGroups: AdGroup[];
    onRename: (groupId: string, newName: string) => void;
    onDelete: (groupId: string) => void;
    onMove: (keyword: KeywordSuggestion, toGroupId: string) => void;
}> = ({ group, allGroups, onRename, onDelete, onMove }) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(group.name);

    const handleRename = () => {
        if (name.trim()) {
            onRename(group.id, name.trim());
        }
        setIsEditing(false);
    };

    return (
        <Card className="flex-1">
            <div className="flex justify-between items-center mb-4">
                {isEditing ? (
                    <input 
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        className="text-lg font-semibold bg-gray-700 p-1 -m-1 rounded text-white"
                        autoFocus
                    />
                ) : (
                    <h3 onClick={() => setIsEditing(true)} className="text-lg font-semibold text-gray-100 cursor-pointer">{group.name}</h3>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white"><Edit size={16}/></button>
                    {group.id !== 'unassigned' && <button onClick={() => onDelete(group.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={16}/></button>}
                </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {group.keywords.length > 0 ? group.keywords.map(kw => (
                    <div key={kw.keyword} className="group flex items-center justify-between p-2 bg-gray-700/50 rounded-md text-sm">
                        <span className="text-gray-200">{kw.keyword}</span>
                        <div className="relative">
                            <select 
                                onChange={(e) => onMove(kw, e.target.value)}
                                className="bg-gray-600 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                value={group.id}
                            >
                                <option disabled>{t('move_to')}</option>
                                {allGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-sm">{t(group.id === 'unassigned' ? 'no_keywords_generated' : 'no_keywords_in_group')}</p>
                )}
            </div>
        </Card>
    );
};


export const KeywordBuilderPage: React.FC<KeywordBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t, language } = useLanguage();
    const [mode, setMode] = useState<'seed' | 'prompt'>('seed');
    const [seedKeywords, setSeedKeywords] = useState('');
    const [aiPrompt, setAIPrompt] = useState(planData.aiPrompt || '');
    const [keywordCount, setKeywordCount] = useState('20');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');

    const suggestions = useMemo(() => {
        const unassignedGroup = planData.adGroups?.find(g => g.id === 'unassigned');
        return unassignedGroup?.keywords || [];
    }, [planData.adGroups]);
    
    const adGroups = useMemo(() => planData.adGroups || [], [planData.adGroups]);
    
    const allKeywords = useMemo(() => adGroups.flatMap(g => g.keywords), [adGroups]);


    const handleGenerate = async () => {
        const input = mode === 'seed' ? seedKeywords : aiPrompt;
        if (!input) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const results = await generateAIKeywords(planData, mode, input, language, keywordCount);
            const newUnassignedGroup: AdGroup = {
                id: 'unassigned',
                name: t('unassigned_keywords'),
                keywords: results,
            };
            
            const existingGroups = (planData.adGroups || []).filter(g => g.id !== 'unassigned');
            setPlanData({ ...planData, adGroups: [newUnassignedGroup, ...existingGroups] });

        } catch (e) {
            setError(t('error_generating_keywords'));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateAdGroups = (newGroups: AdGroup[]) => {
        setPlanData({ ...planData, adGroups: newGroups });
    };

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) return;
        const newGroup: AdGroup = {
            id: `group_${new Date().getTime()}`,
            name: newGroupName.trim(),
            keywords: [],
        };
        updateAdGroups([...adGroups, newGroup]);
        setNewGroupName('');
    };
    
    const handleDeleteGroup = (groupId: string) => {
        if(window.confirm(t('confirm_delete_group'))){
            const groupToDelete = adGroups.find(g => g.id === groupId);
            if (!groupToDelete) return;
            
            const unassignedGroup = adGroups.find(g => g.id === 'unassigned') || { id: 'unassigned', name: t('unassigned_keywords'), keywords: [] };
            unassignedGroup.keywords = [...unassignedGroup.keywords, ...groupToDelete.keywords];
            
            const remainingGroups = adGroups.filter(g => g.id !== groupId && g.id !== 'unassigned');
            updateAdGroups([unassignedGroup, ...remainingGroups]);
        }
    };
    
    const handleRenameGroup = (groupId: string, newName: string) => {
        const newGroups = adGroups.map(g => g.id === groupId ? { ...g, name: newName } : g);
        updateAdGroups(newGroups);
    };

    const handleMoveKeywords = (keyword: KeywordSuggestion, toGroupId: string) => {
        const newGroups = JSON.parse(JSON.stringify(adGroups)) as AdGroup[];

        // Find and remove from all groups (should only be in one)
        newGroups.forEach(g => {
            g.keywords = g.keywords.filter(kw => kw.keyword !== keyword.keyword);
        });
        
        // Add to the new group
        const targetGroup = newGroups.find(g => g.id === toGroupId);
        if (targetGroup) {
            targetGroup.keywords.push(keyword);
        }
        
        updateAdGroups(newGroups);
    };
    
    const handleGroupedExport = (format: 'csv' | 'pdf') => {
        if (format === 'csv') {
            exportGroupedKeywordsAsCSV(planData, t);
        } else if (format === 'pdf') {
            exportGroupedKeywordsToPDF(planData, t);
        }
    };


    return (
        <div className="space-y-6">
             <Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                         <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => setMode('seed')} className={`px-4 py-2 text-sm font-medium ${mode === 'seed' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>{t('seed_keywords_label')}</button>
                            <button onClick={() => setMode('prompt')} className={`px-4 py-2 text-sm font-medium ${mode === 'prompt' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>{t('ai_prompt_label')}</button>
                        </div>
                        {mode === 'seed' ? (
                            <textarea value={seedKeywords} onChange={e => setSeedKeywords(e.target.value)} placeholder={t('seed_keywords_placeholder')} rows={4} className="w-full border-gray-600 rounded-md shadow-sm p-2 bg-gray-700 text-gray-200" />
                        ) : (
                            <textarea value={aiPrompt} onChange={e => setAIPrompt(e.target.value)} placeholder={t('ai_prompt_placeholder')} rows={4} className="w-full border-gray-600 rounded-md shadow-sm p-2 bg-gray-700 text-gray-200" />
                        )}
                    </div>
                    <div className="flex flex-col justify-between">
                         <div>
                            <label className="block text-sm font-medium text-gray-300">{t('number_of_suggestions')}</label>
                            <select value={keywordCount} onChange={e => setKeywordCount(e.target.value)} className="mt-1 w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200">
                                <option>10</option>
                                <option>20</option>
                                <option>50</option>
                                <option>100</option>
                            </select>
                         </div>
                        <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? <><LoaderIcon size={20} className="animate-spin" />{t('generating_keywords')}</> : t('generate_keywords')}
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
             </Card>
            
             <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">{t('unassigned_keywords')}</h3>
                        </div>
                         <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs uppercase bg-gray-700/50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">{t('keyword')}</th>
                                        <th className="px-4 py-2">{t('search_volume')}</th>
                                        <th className="px-4 py-2">{t('estimated_clicks')}</th>
                                        <th className="px-4 py-2">{t('min_cpc')}</th>
                                        <th className="px-4 py-2">{t('max_cpc')}</th>
                                        <th className="px-4 py-2">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suggestions.length > 0 ? suggestions.map(kw => (
                                        <tr key={kw.keyword} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="px-4 py-2 text-white">{kw.keyword}</td>
                                            <td className="px-4 py-2">{formatNumber(kw.volume)}</td>
                                            <td className="px-4 py-2">{formatNumber(kw.clickPotential)}</td>
                                            <td className="px-4 py-2">{formatCurrency(kw.minCpc)}</td>
                                            <td className="px-4 py-2">{formatCurrency(kw.maxCpc)}</td>
                                            <td className="px-4 py-2">
                                                 <select
                                                    onChange={(e) => handleMoveKeywords(kw, e.target.value)}
                                                    className="bg-gray-600 text-white text-xs rounded p-1"
                                                    value="unassigned"
                                                    disabled={adGroups.filter(g => g.id !== 'unassigned').length === 0}
                                                >
                                                    <option value="unassigned" disabled>{t('assign_to_group')}</option>
                                                     {adGroups.filter(g => g.id !== 'unassigned').map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">{t('no_keywords_generated')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                
                 <div className="lg:w-1/3 space-y-4">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-100">{t('ad_groups')}</h3>
                            {allKeywords.length > 0 && (
                                <ExportDropdown 
                                    label={t('export_keywords')}
                                    onExport={handleGroupedExport}
                                />
                            )}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={t('ad_group_name_placeholder')} className="flex-grow border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200"/>
                            <button onClick={handleCreateGroup} className="px-4 py-2 bg-blue-600 text-white rounded-md">{t('add')}</button>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                             {adGroups.filter(g => g.id !== 'unassigned').map(group => (
                                <AdGroupComponent 
                                    key={group.id}
                                    group={group}
                                    allGroups={adGroups}
                                    onRename={handleRenameGroup}
                                    onDelete={handleDeleteGroup}
                                    onMove={handleMoveKeywords}
                                />
                            ))}
                            {adGroups.filter(g => g.id !== 'unassigned').length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                    {t('no_ad_groups')}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const AD_FORMATS = [
    { name: 'Square', width: 1200, height: 1200 },
    { name: 'Stories / Reels', width: 1080, height: 1920 },
    { name: 'Landscape', width: 1200, height: 628 },
    { name: 'Portrait (4:5)', width: 1080, height: 1350 },
    { name: 'Portrait (3:4)', width: 960, height: 1200 },
];

const downloadAdaptedImage = (sourceImageSrc: string, targetWidth: number, targetHeight: number, format: 'png' | 'jpeg', fileName: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sourceImageSrc;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // "object-fit: cover" logic
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let sx, sy, sWidth, sHeight;

        if (imgRatio > canvasRatio) { // image is wider than canvas
            sHeight = img.height;
            sWidth = sHeight * canvasRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else { // image is taller than or same ratio as canvas
            sWidth = img.width;
            sHeight = sWidth / canvasRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        const link = document.createElement('a');
        link.download = `${fileName}.${format}`;
        link.href = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.9 : 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    img.onerror = (e) => {
        console.error("Failed to load image for canvas operation", e);
        alert('Failed to load image for download operation.');
    };
};

export const CreativeBuilderPage: React.FC<CreativeBuilderPageProps> = ({ planData }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(planData.aiImagePrompt || '');
    const [sourceImages, setSourceImages] = useState<GeneratedImage[]>([]);
    const [selectedSource, setSelectedSource] = useState<GeneratedImage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingImages, setEditingImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setPrompt(planData.aiImagePrompt || '');
    }, [planData.aiImagePrompt]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        setSourceImages([]);
        setSelectedSource(null);
        
        let imagesForApi: { base64: string; mimeType: string }[] | undefined = undefined;
        if (editingImages.length > 0) {
            try {
                imagesForApi = editingImages.map(dataUrl => {
                    const parts = dataUrl.split(',');
                    if (parts.length !== 2) throw new Error("Invalid data URL");
                    const mimePart = parts[0].split(';')[0];
                    const mimeType = mimePart.split(':')[1];
                    const base64 = parts[1];
                    return { base64, mimeType };
                });
            } catch (e) {
                setError("Uma das imagens enviadas é inválida.");
                setIsLoading(false);
                return;
            }
        }
        
        try {
            const results = await generateAIImages(prompt, imagesForApi);
            setSourceImages(results);
            if (results.length > 0) {
                setSelectedSource(results[0]);
                if (imagesForApi) { // if it was an editing operation, replace the inputs with the single output
                    setEditingImages([`data:image/png;base64,${results[0].base64}`]);
                }
            }
        } catch (e) {
            setError(t('error_generating_images'));
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const filePromises = Array.from(files).map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result);
                        } else {
                            reject('Failed to read file');
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises).then(newImages => {
                setEditingImages(prev => [...prev, ...newImages]);
            }).catch(err => console.error("Error reading files:", err));
        }
        if (event.target) {
            event.target.value = ''; // Allow re-uploading the same file
        }
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setEditingImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="space-y-6">
             <Card>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">{t('Prompt para Geração de Imagem')}</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow space-y-4">
                         <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t('creative_prompt_placeholder')}
                            rows={8}
                            className="w-full border-gray-600 rounded-md shadow-sm p-2 bg-gray-700 text-gray-200"
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? <><LoaderIcon size={20} className="animate-spin" />{t('generating_images')}</> : <><ImageIcon size={18}/> {t('generate_images')}</>}
                        </button>
                    </div>
                    <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            {editingImages.map((image, index) => (
                                <div key={index} className="relative aspect-square">
                                    <img src={image} alt={`Upload preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }} 
                                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <div 
                                className="aspect-square border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-700/20 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center text-gray-400">
                                    <Upload size={24}/>
                                    <p className="text-xs mt-1">{t('add')}</p>
                                </div>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload}/>
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
            </Card>

            {isLoading && (
                <div className="text-center py-10">
                    <LoaderIcon size={40} className="mx-auto animate-spin text-blue-500" />
                    <p className="mt-4 text-gray-400">{t('generating_images')}</p>
                </div>
            )}
            
            {sourceImages.length > 0 && !isLoading && (
                 <Card>
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">Selecione a Imagem Base</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {sourceImages.map((image, index) => (
                            <div 
                                key={index} 
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${selectedSource?.base64 === image.base64 ? 'border-blue-500 scale-105' : 'border-transparent hover:border-blue-400'}`}
                                onClick={() => setSelectedSource(image)}
                            >
                                <img src={`data:image/png;base64,${image.base64}`} alt={`Source image ${index + 1}`} className="w-32 h-32 object-cover" />
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {selectedSource && !isLoading ? (
                <div>
                    <h2 className="text-2xl font-bold text-gray-100 mb-4 mt-8">Formatos de Anúncio</h2>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {AD_FORMATS.map(format => (
                             <div key={format.name} className="bg-gray-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
                                <div 
                                    className="w-full bg-gray-700" 
                                    style={{ aspectRatio: `${format.width}/${format.height}`}}
                                >
                                    <img src={`data:image/png;base64,${selectedSource.base64}`} alt={`${format.name} preview`} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h4 className="font-semibold text-white">{format.name}</h4>
                                    <p className="text-sm text-gray-400 mb-4">{format.width}x{format.height}px</p>
                                    <div className="mt-auto flex flex-col gap-2">
                                        <button 
                                            onClick={() => downloadAdaptedImage(`data:image/png;base64,${selectedSource.base64}`, format.width, format.height, 'png', `creative-${format.width}x${format.height}`)}
                                            className="w-full text-center px-3 py-1.5 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
                                        >
                                            {t('download_as_png')}
                                        </button>
                                        <button
                                            onClick={() => downloadAdaptedImage(`data:image/png;base64,${selectedSource.base64}`, format.width, format.height, 'jpeg', `creative-${format.width}x${format.height}`)}
                                            className="w-full text-center px-3 py-1.5 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
                                        >
                                            {t('download_as_jpg')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : !isLoading && sourceImages.length === 0 && (
                 <Card className="text-center py-16">
                    <ImageIcon size={48} className="mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300">{t('creative_builder_initial_prompt')}</h3>
                 </Card>
            )}
        </div>
    );
};

export const AddMonthModal: React.FC<AddMonthModalProps> = ({ isOpen, onClose, onAddMonth, existingMonths }) => {
    const { t } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState('');

    const availableMonths = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const futureMonths = [];
        for (let y = currentYear; y < currentYear + 3; y++) {
            for (const monthName of MONTHS_LIST) {
                const monthKey = `${y}-${monthName}`;
                if (!existingMonths.includes(monthKey)) {
                    futureMonths.push({ key: monthKey, name: `${t(monthName)} ${y}`});
                }
            }
        }
        return futureMonths;
    }, [existingMonths, t]);
    
    useEffect(() => {
        if (isOpen && availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0].key);
        } else if (isOpen) {
            setSelectedMonth('');
        }
    }, [isOpen, availableMonths]);
    
    if (!isOpen) return null;

    const handleAdd = () => {
        if(selectedMonth) {
            onAddMonth(selectedMonth);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('Adicionar Mês ao Plano')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    {availableMonths.length > 0 ? (
                        <>
                            <label htmlFor="month-select" className="block text-sm font-medium text-gray-300">{t('Mês')}</label>
                            <select 
                                id="month-select"
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="" disabled>{t('Selecione um mês')}</option>
                                {availableMonths.map(month => (
                                    <option key={month.key} value={month.key}>{month.name}</option>
                                ))}
                            </select>
                        </>
                    ) : (
                        <p className="text-gray-400 text-center">{t('Todos os meses já foram adicionados.')}</p>
                    )}
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('cancel')}</button>
                    {availableMonths.length > 0 && (
                       <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{t('add')}</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AIPlanCreationModal: React.FC<AIPlanCreationModalProps> = ({ isOpen, onClose, onGenerate, isLoading, initialPrompt, title, buttonText, loadingText }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(initialPrompt || '');

    useEffect(() => {
        if(isOpen) {
            setPrompt(initialPrompt || '');
        }
    }, [isOpen, initialPrompt]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2"><Sparkles className="text-blue-500"/>{title || t('Crie seu Plano com IA')}</h2>
                    {!isLoading && <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>}
                </div>
                <div className="p-6">
                    <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-300 mb-2">{t('Descreva seu negócio, objetivos e público')}</label>
                    <textarea 
                        id="ai-prompt"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={6}
                        className="w-full border-gray-600 rounded-md shadow-sm p-2 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('Ex: Uma cafeteria em São Paulo focada em jovens profissionais. Objetivo: aumentar o fluxo na loja.')}
                        disabled={isLoading}
                    />
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end">
                    <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? (
                            <>
                                <LoaderIcon className="animate-spin" size={20} />
                                {loadingText || t('Gerando seu plano...')}
                            </>
                        ) : (
                            <>{buttonText || t('Gerar Plano')}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ShareLinkModal: React.FC<{ isOpen: boolean; onClose: () => void; link: string }> = ({ isOpen, onClose, link }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('share_plan_title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-4">{t('share_plan_desc')}</p>
                    <div className="flex gap-2">
                        <input type="text" readOnly value={link} className="flex-1 w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200" />
                        <button onClick={handleCopy} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                            {copied ? <><Check size={18}/> {t('copied')}</> : <><CopyIcon size={18}/> {t('copy_link')}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ShareablePlanViewer: React.FC<{ encodedPlanData: string }> = ({ encodedPlanData }) => {
    const { t } = useLanguage();
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        try {
            // URL-safe base64 needs padding and character replacement to be decoded.
            let base64 = encodedPlanData.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) {
                base64 += '=';
            }
            // Decode and parse the JSON
            const decodedJson = decodeURIComponent(escape(atob(base64)));
            const parsedPlan = JSON.parse(decodedJson);
            setPlan(parsedPlan);
        } catch (e) {
            console.error("Error decoding plan data:", e);
            setError(t('plan_not_found'));
        }
    }, [encodedPlanData, t]);

    if (error) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-red-400">{error}</div>;
    }

    if (!plan) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900"><LoaderIcon className="animate-spin text-blue-600" size={48} /> <span className="ml-4 text-white">{t('loading_plan')}</span></div>;
    }

    return (
        <div className="bg-gray-900 min-h-screen text-white font-sans">
            <header className="bg-gray-800 p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <img src={ICON_LOGO} alt="MasterPlan Icon" className="h-10 w-10"/>
                    <div>
                        <h1 className="text-xl font-bold">{plan.campaignName}</h1>
                        <p className="text-sm text-gray-400">{t('shared_by')} MasterPlan AI</p>
                    </div>
                </div>
                <a href={window.location.origin} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700">
                    {t('create_new_plan')}
                </a>
            </header>
            <main className="p-4 sm:p-6 lg:p-8">
                 <DashboardPage planData={plan} onNavigate={() => {}} onAddMonthClick={() => {}} onRegeneratePlan={async () => {}} isRegenerating={false} isReadOnly={true} />
            </main>
        </div>
    );
};