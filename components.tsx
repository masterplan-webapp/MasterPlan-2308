

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy as CopyIcon, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, LucideProps, AlertTriangle, KeyRound, Tags, Tag, ImageIcon, ExternalLink, HelpCircle } from 'lucide-react';
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

export const PlanSelectorPage: React.FC<PlanSelectorPageProps> = ({ plans, onSelectPlan, onPlanCreated, user, onProfileClick, onDeletePlan }) => {
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const [isChoiceModalOpen, setChoiceModalOpen] = useState(false);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [planToRename, setPlanToRename] = useState<PlanData | null>(null);

    const handleRename = (planId: string, newName: string) => {
        // This is a bit of a workaround since this component doesn't own the state.
        // The parent App component will handle the actual renaming logic.
        // For now, we just close the modal. A more robust solution would involve lifting state up.
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            plan.campaignName = newName; // locally update for now
            dbService.savePlan(user.uid, plan); // Directly save
        }
        setRenameModalOpen(false);
    };

    const handleDuplicate = (planToDuplicate: PlanData) => {
        const newPlan: PlanData = {
            ...JSON.parse(JSON.stringify(planToDuplicate)), // Deep copy
            id: `plan_${new Date().getTime()}`,
            campaignName: t("{campaignName} {copy}", { campaignName: planToDuplicate.campaignName, copy: t("Copy") }),
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
                                    <button onClick={() => { setPlanToRename(plan); setRenameModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{t('edit')}</button>
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
            {isRenameModalOpen && planToRename && (
                <RenamePlanModal 
                    isOpen={isRenameModalOpen} 
                    onClose={() => setRenameModalOpen(false)}
                    plan={planToRename}
                    onSave={handleRename}
                />
            )}
        </div>
    );
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ElementType, isCurrency?: boolean, isPercentage?: boolean, isReadOnly?: boolean }> = ({ title, value, icon: Icon, isReadOnly=false }) => {
    return (
        <Card className="flex items-start gap-4">
            <div className="p-3 bg-blue-900/30 rounded-lg">
                <Icon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-100">{value}</p>
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

export const DashboardPage: React.FC<DashboardPageProps> = ({ planData, onNavigate, onAddMonthClick, onRegeneratePlan, isRegenerating }) => {
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
                        <button onClick={handleAnalyzePlan} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                           <Sparkles size={18} /> {t('Analisar Plano com IA')}
                        </button>
                        {planData.aiPrompt && (
                             <button onClick={() => setIsAIPlanAdjustModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md shadow-sm hover:bg-gray-700 transition-colors">
                               <Wand2 size={18} /> {t('Ajustar Plano com IA')}
                            </button>
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
                         <button onClick={onAddMonthClick} className="text-blue-400 hover:underline font-medium flex items-center gap-2 mx-auto">
                            <PlusCircle size={16}/> {t('Adicionar Mês')}
                         </button>
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

export const MonthlyPlanPage: React.FC<MonthlyPlanPageProps> = ({ month, campaigns, onSave, onDelete, planObjective, customFormats, onAddFormat, totalInvestment }) => {
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
        return campaigns.reduce((acc, c) => {
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
                    <button onClick={handleNew} className="w-full mt-4 sm:mt-0 sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                        <PlusCircle size={18}/> {t('Nova Campanha')}
                    </button>
                </div>
                 {campaigns.length === 0 ? (
                    <div className="text-center py-16">
                        <h3 className="text-xl font-semibold text-gray-300">{t('Nenhuma campanha para este mês.')}</h3>
                        <p className="mt-2 text-gray-400">{t('Adicione a primeira campanha para começar o planejamento.')}</p>
                        <button onClick={handleNew} className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 mx-auto bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors">
                            {t('Adicionar Primeira Campanha')}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto mt-6">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-gray-700 text-gray-400">
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
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(c => {
                                    const share = totals.budget > 0 ? (Number(c.budget || 0) / totals.budget) * 100 : 0;
                                    return (
                                        <tr key={c.id} className="border-b bg-gray-800 border-gray-700 hover:bg-gray-600">
                                            <td className="px-4 py-4">{c.tipoCampanha}</td>
                                            <td className="px-4 py-4">{c.etapaFunil}</td>
                                            <td className="px-4 py-4">{c.canal}</td>
                                            <td className="px-4 py-4">{c.formato}</td>
                                            <td className="px-4 py-4">{formatCurrency(c.budget)}</td>
                                            <td className="px-4 py-4">{formatPercentage(share)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.impressoes)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.cliques)}</td>
                                            <td className="px-4 py-4">{formatNumber(c.conversoes)}</td>
                                            <td className="px-4 py-4 text-right">
                                                 <button onClick={() => handleEdit(c)} className="p-2 text-gray-400 hover:text-blue-400"><Edit size={16}/></button>
                                                 <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                             <tfoot>
                                <tr className="font-semibold text-white bg-gray-700">
                                    <th colSpan={4} className="px-4 py-3 text-base">{t('Totais do Mês')}</th>
                                    <td className="px-4 py-3">{formatCurrency(totals.budget)}</td>
                                    <td className="px-4 py-3">{formatPercentage(totals.budget > 0 ? 100 : 0)}</td>
                                    <td className="px-4 py-3">{formatNumber(totals.impressoes)}</td>
                                    <td className="px-4 py-3">{formatNumber(totals.cliques)}</td>
                                    <td className="px-4 py-3">{formatNumber(totals.conversoes)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>

            <ChartsSection campaigns={campaigns} title={t("Distribuição de Investimento ({month})", { month: `${t(monthName)} ${year}` })}/>

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
        </div>
    );
};

export const CopyBuilderPage: React.FC<CopyBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [activeChannel, setActiveChannel] = useState<string | null>(null);
    const [context, setContext] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
    const [currentGroup, setCurrentGroup] = useState<CreativeTextData | null>(null);

    const activeChannels = useMemo(() => {
        const channels = new Set<string>();
        Object.values(planData.months || {}).flat().forEach(campaign => {
            if (campaign.canal) channels.add(campaign.canal);
        });
        return Array.from(channels);
    }, [planData.months]);

    useEffect(() => {
        if (!activeChannel && activeChannels.length > 0) {
            setActiveChannel(activeChannels[0]);
        } else if (activeChannels.length > 0 && activeChannel && !activeChannels.includes(activeChannel)) {
            // If the active channel was removed from the plan, switch to the first available one
            setActiveChannel(activeChannels[0]);
        } else if (activeChannels.length === 0) {
            setActiveChannel(null);
        }
    }, [activeChannels, activeChannel]);
    
    const handleAddGroup = () => {
        if(!activeChannel) return;
        
        const newGroup: CreativeTextData = {
            id: Date.now(),
            name: t('Novo Grupo de Criativos') + ' ' + ((planData.creatives?.[activeChannel]?.length || 0) + 1),
            context: '',
            headlines: [''],
            longHeadlines: [''],
            descriptions: ['']
        };

        setPlanData(prev => {
            if(!prev) return null;
            const newPlan = {...prev};
            if(!newPlan.creatives) newPlan.creatives = {};
            if(!newPlan.creatives[activeChannel]) newPlan.creatives[activeChannel] = [];
            newPlan.creatives[activeChannel].push(newGroup);
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
    }

    const handleUpdateGroup = (updatedGroup: CreativeTextData) => {
         if(!activeChannel) return;
         setPlanData(prev => {
            if(!prev) return null;
            const newPlan = {...prev};
            const groupIndex = newPlan.creatives?.[activeChannel]?.findIndex(g => g.id === updatedGroup.id);
            if(groupIndex !== undefined && groupIndex > -1) {
                newPlan.creatives[activeChannel][groupIndex] = updatedGroup;
                dbService.savePlan(user!.uid, newPlan);
            }
            return newPlan;
         });
    }
    
    const handleDeleteGroup = (id: number) => {
         if(!activeChannel) return;
         if(!window.confirm('Tem certeza que deseja apagar este grupo de criativos?')) return;
         setPlanData(prev => {
            if(!prev) return null;
            const newPlan = {...prev};
            newPlan.creatives[activeChannel] = newPlan.creatives[activeChannel].filter(g => g.id !== id);
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
         });
    }

    const generateSuggestions = async (group: CreativeTextData) => {
        setIsLoading(true);
        setSuggestionsModalOpen(true);
        setCurrentGroup(group);

        const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';

        try {
            const prompt = `
            You are an expert copywriter for paid media campaigns. Based on the provided context, generate creative suggestions for Google Ads or Meta Ads.
            The output MUST be a valid JSON object with three keys: "Títulos (Headlines)", "Títulos Longos (Long Headlines)", and "Descrições (Descriptions)". Each key should have an array of 5 unique string suggestions.
            Do not include any text, explanation, or markdown fences like \`\`\`json around the JSON output.

            Context:
            - Plan Objective: ${planData.objective}
            - Target Audience: ${planData.targetAudience}
            - Channel: ${activeChannel}
            - Creative Group Context: ${group.context}

            ${langInstruction}
            
            Example JSON output:
            {
              "Títulos (Headlines)": ["Suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4", "Suggestion 5"],
              "Títulos Longos (Long Headlines)": ["Long Suggestion 1", "Long Suggestion 2", "Long Suggestion 3", "Long Suggestion 4", "Long Suggestion 5"],
              "Descrições (Descriptions)": ["Description Suggestion 1", "Description Suggestion 2", "Description Suggestion 3", "Description Suggestion 4", "Description Suggestion 5"]
            }
            `;
            const result = await callGeminiAPI(prompt, true);
            setSuggestions(result);
        } catch (error) {
            console.error(error);
            setSuggestions({});
            alert(t('Falha ao gerar sugestões.'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApplySuggestion = (type: string, text: string) => {
        if (!currentGroup) return;

        let field: keyof CreativeTextData | null = null;
        if (type === 'Títulos (Headlines)') field = 'headlines';
        if (type === 'Títulos Longos (Long Headlines)') field = 'longHeadlines';
        if (type === 'Descrições (Descriptions)') field = 'descriptions';
        
        if (field) {
            const updatedGroup = { ...currentGroup };
            let values = [...(updatedGroup[field as keyof CreativeTextData] as string[] || [])];
            
            // Find the first empty string and replace it, otherwise add to the end
            const emptyIndex = values.indexOf('');
            if (emptyIndex !== -1) {
                values[emptyIndex] = text;
            } else {
                values.push(text);
            }

            (updatedGroup as any)[field] = values;
            handleUpdateGroup(updatedGroup);
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                 <h2 className="text-2xl font-bold text-gray-100">{t('copy_builder')}</h2>
                 <p className="mt-2 text-gray-400">Gere textos para seus anúncios com IA baseados no seu plano de mídia.</p>
            </Card>

            {activeChannels.length > 0 ? (
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/4">
                         <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('Canal')}</h3>
                        <div className="space-y-2">
                             {activeChannels.map(channel => (
                                <button
                                    key={channel}
                                    onClick={() => setActiveChannel(channel)}
                                    className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${activeChannel === channel ? 'bg-blue-600 text-white shadow' : 'bg-gray-800 hover:bg-gray-700'}`}
                                >
                                    {channel}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="lg:w-3/4">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-semibold text-gray-100">{t('Criativos para')} {activeChannel}</h3>
                             <button onClick={handleAddGroup} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                                <PlusCircle size={16}/> {t('Novo Grupo')}
                             </button>
                        </div>
                        
                        <div className="space-y-6">
                            {(planData.creatives?.[activeChannel!] || []).map(group => (
                                <CreativeGroup 
                                    key={group.id} 
                                    group={group} 
                                    channel={activeChannel!}
                                    onUpdate={handleUpdateGroup}
                                    onDelete={handleDeleteGroup}
                                    onGenerateSuggestions={() => generateSuggestions(group)}
                                    planData={planData}
                                />
                            ))}

                            {(!planData.creatives?.[activeChannel!] || planData.creatives?.[activeChannel!].length === 0) && (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-700">
                                    <h4 className="text-xl font-semibold text-gray-300">{t('Nenhum grupo de criativos para {channel}', {channel: activeChannel!})}</h4>
                                    <p className="mt-2 text-gray-400">{t('Comece adicionando um novo grupo.')}</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            ) : (
                <Card className="text-center py-16">
                    <h3 className="text-xl font-semibold text-gray-300">{t('Nenhum canal ativo')}</h3>
                    <p className="mt-2 text-gray-400">{t('Para começar, adicione campanhas com canais definidos no seu plano de mídia.')}</p>
                </Card>
            )}

            <AISuggestionsModal 
                isOpen={isSuggestionsModalOpen}
                onClose={() => setSuggestionsModalOpen(false)}
                isLoading={isLoading}
                suggestions={suggestions}
                onApplySuggestion={handleApplySuggestion}
            />
        </div>
    );
};

export const CreativeGroup: React.FC<CreativeGroupProps & { onGenerateSuggestions: () => void }> = ({ group, channel, onUpdate, onDelete, onGenerateSuggestions, planData }) => {
    const { t } = useLanguage();

    const handleFieldChange = (field: keyof CreativeTextData, value: string, index?: number) => {
        const newGroup = { ...group };
        if (index !== undefined && Array.isArray(newGroup[field])) {
            const newArray = [...(newGroup[field] as string[])];
            newArray[index] = value;
            (newGroup as any)[field] = newArray;
        } else {
            (newGroup as any)[field] = value;
        }
        onUpdate(newGroup);
    };

    const addField = (field: 'headlines' | 'longHeadlines' | 'descriptions') => {
        const newGroup = { ...group };
        const newArray = [...(newGroup[field] || []), ''];
        (newGroup as any)[field] = newArray;
        onUpdate(newGroup);
    };
    
    const removeField = (field: 'headlines' | 'longHeadlines' | 'descriptions', index: number) => {
        const newGroup = { ...group };
        const newArray = [...(newGroup[field] as string[])];
        newArray.splice(index, 1);
        (newGroup as any)[field] = newArray;
        onUpdate(newGroup);
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <input 
                    type="text" 
                    value={group.name} 
                    onChange={e => handleFieldChange('name', e.target.value)} 
                    className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 text-gray-100"
                />
                 <div className="flex items-center gap-2">
                     <button onClick={onGenerateSuggestions} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-900/40 text-blue-300 rounded-md hover:bg-blue-900/60">
                         <Sparkles size={16}/> {t('Gerar Ideias')}
                     </button>
                    <button onClick={() => onDelete(group.id)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={18}/></button>
                 </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">{t('Contexto para a IA')}</label>
                <textarea 
                    value={group.context} 
                    onChange={e => handleFieldChange('context', e.target.value)} 
                    placeholder={t('Descreva o produto, público, oferta e palavras-chave para guiar a IA...')}
                    rows={3}
                    className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {/* Headlines */}
                <div>
                    <h4 className="font-semibold mb-2 text-gray-200">{t('Títulos (Headlines)')} (30)</h4>
                    <div className="space-y-2">
                        {group.headlines.map((h, i) => (
                             <div key={i} className="flex items-center gap-2">
                                <CharacterCountInput 
                                    value={h} 
                                    onChange={e => handleFieldChange('headlines', e.target.value, i)} 
                                    maxLength={30} 
                                    placeholder={`${t('Título')} ${i + 1}`}
                                />
                                {group.headlines.length > 1 && <button onClick={() => removeField('headlines', i)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>}
                            </div>
                        ))}
                         <button onClick={() => addField('headlines')} className="text-sm text-blue-400 hover:underline">{t('add')}</button>
                    </div>
                </div>

                {/* Long Headlines */}
                 <div>
                    <h4 className="font-semibold mb-2 text-gray-200">{t('Títulos Longos (Long Headlines)')} (90)</h4>
                    <div className="space-y-2">
                        {(group.longHeadlines || []).map((h, i) => (
                             <div key={i} className="flex items-center gap-2">
                                <CharacterCountInput 
                                    value={h} 
                                    onChange={e => handleFieldChange('longHeadlines', e.target.value, i)} 
                                    maxLength={90} 
                                    placeholder={`${t('Título Longo')} ${i + 1}`}
                                />
                                 {(group.longHeadlines || []).length > 1 && <button onClick={() => removeField('longHeadlines', i)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>}
                            </div>
                        ))}
                         <button onClick={() => addField('longHeadlines')} className="text-sm text-blue-400 hover:underline">{t('add')}</button>
                    </div>
                </div>

                {/* Descriptions */}
                <div>
                    <h4 className="font-semibold mb-2 text-gray-200">{t('Descrições (Descriptions)')} (90)</h4>
                    <div className="space-y-2">
                        {group.descriptions.map((d, i) => (
                             <div key={i} className="flex items-center gap-2">
                                <CharacterCountInput 
                                    value={d} 
                                    onChange={e => handleFieldChange('descriptions', e.target.value, i)} 
                                    maxLength={90} 
                                    placeholder={`${t('Descrição')} ${i + 1}`}
                                />
                                {group.descriptions.length > 1 && <button onClick={() => removeField('descriptions', i)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>}
                            </div>
                        ))}
                         <button onClick={() => addField('descriptions')} className="text-sm text-blue-400 hover:underline">{t('add')}</button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TooltipIcon: React.FC<{ tooltip: string }> = ({ tooltip }) => {
    return (
        <div className="relative flex items-center group">
            <HelpCircle size={14} className="text-gray-500" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {tooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
        </div>
    );
};


export const UTMBuilderPage: React.FC<UTMBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [utm, setUtm] = useState<Partial<Omit<UTMLink, 'id'|'createdAt'|'fullUrl'>>>({ url: '', source: '', medium: '', campaign: '', term: '', content: '' });
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [copied, setCopied] = useState(false);
    
    const isFormValid = utm.url && utm.source && utm.medium && utm.campaign;

    const generateUrl = () => {
        if (!isFormValid) {
            alert(t('Por favor, preencha todos os campos obrigatórios (*) e gere a URL.'));
            return;
        }
        const baseUrl = utm.url!.includes('?') ? `${utm.url}&` : `${utm.url}?`;
        const params = new URLSearchParams({
            utm_source: utm.source!,
            utm_medium: utm.medium!,
            utm_campaign: utm.campaign!,
            ...(utm.term && { utm_term: utm.term }),
            ...(utm.content && { utm_content: utm.content }),
        });
        setGeneratedUrl(baseUrl + params.toString());
    };

    const handleSaveLink = () => {
        if (!generatedUrl) return;
        const newLink: UTMLink = {
            id: Date.now(),
            createdAt: new Date(),
            fullUrl: generatedUrl,
            url: utm.url!,
            source: utm.source!,
            medium: utm.medium!,
            campaign: utm.campaign!,
            term: utm.term,
            content: utm.content
        };
        setPlanData(prev => {
            if(!prev) return null;
            const newPlan = {...prev};
            if(!newPlan.utmLinks) newPlan.utmLinks = [];
            newPlan.utmLinks.unshift(newLink); // Add to the top
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
        clearForm();
    };
    
    const handleDeleteLink = (id: number) => {
        if (!window.confirm(t('Tem certeza que deseja apagar este link?'))) return;
        setPlanData(prev => {
            if (!prev) return null;
            const newPlan = { ...prev };
            newPlan.utmLinks = (newPlan.utmLinks || []).filter(link => link.id !== id);
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
    };

    const clearForm = () => {
        setUtm({ url: '', source: '', medium: '', campaign: '', term: '', content: '' });
        setGeneratedUrl('');
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const sortedLinks = useMemo(() => {
        return [...(planData.utmLinks || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [planData.utmLinks]);

    const inputStyle = "mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <Card>
                    <h2 className="text-2xl font-bold text-gray-100 mb-6">{t('utm_builder')}</h2>
                    <div className="space-y-4">
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('URL do Site *')} <TooltipIcon tooltip={t('utm_url_helper')} /></label>
                             <input type="url" value={utm.url} onChange={e => setUtm({...utm, url: e.target.value})} className={inputStyle} placeholder="https://www.seusite.com.br"/>
                        </div>
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('Campaign Source *')} <TooltipIcon tooltip={t('utm_source_helper')} /></label>
                             <input type="text" value={utm.source} onChange={e => setUtm({...utm, source: e.target.value})} className={inputStyle} placeholder="google"/>
                        </div>
                         <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('Campaign Medium *')} <TooltipIcon tooltip={t('utm_medium_helper')} /></label>
                             <input type="text" value={utm.medium} onChange={e => setUtm({...utm, medium: e.target.value})} className={inputStyle} placeholder="cpc"/>
                        </div>
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('Campaign Name *')} <TooltipIcon tooltip={t('utm_campaign_helper')} /></label>
                             <input type="text" value={utm.campaign} onChange={e => setUtm({...utm, campaign: e.target.value})} className={inputStyle} placeholder="promocao_verao"/>
                        </div>
                        <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('Campaign Term')} <TooltipIcon tooltip={t('utm_term_helper')} /></label>
                             <input type="text" value={utm.term} onChange={e => setUtm({...utm, term: e.target.value})} className={inputStyle} placeholder="tenis_corrida"/>
                        </div>
                         <div>
                             <label className="flex items-center gap-2 text-sm font-medium text-gray-300">{t('Campaign Content')} <TooltipIcon tooltip={t('utm_content_helper')} /></label>
                             <input type="text" value={utm.content} onChange={e => setUtm({...utm, content: e.target.value})} className={inputStyle} placeholder="banner_azul"/>
                        </div>
                    </div>
                    <button onClick={generateUrl} disabled={!isFormValid} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{t('Gerar URL')}</button>
                    {generatedUrl && (
                        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                            <label className="block text-sm font-medium text-gray-300 mb-2">{t('URL Gerada')}</label>
                            <div className="relative">
                                <textarea readOnly value={generatedUrl} className="w-full p-2 pr-10 border-gray-600 rounded-md bg-gray-800 text-sm" rows={4}></textarea>
                                 <button onClick={copyToClipboard} className="absolute top-2 right-2 p-1.5 text-gray-500 hover:bg-gray-600 rounded-md">
                                    {copied ? <Check size={16} className="text-green-500" /> : <CopyIcon size={16} />}
                                </button>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={handleSaveLink} className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm">{t('Salvar Link')}</button>
                                <button onClick={clearForm} className="flex-1 px-4 py-2 bg-gray-500 text-gray-200 font-semibold rounded-md hover:bg-gray-600 text-sm">{t('Limpar')}</button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-100">{t('Links Salvos')}</h2>
                        <div className="relative">
                             <button onClick={() => {}} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-sm rounded-md hover:bg-gray-600">
                                {t('export')} <ChevronDown size={16} />
                             </button>
                             {/* Export dropdown menu to be added here */}
                        </div>
                    </div>
                     {sortedLinks.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">{t('Data')}</th>
                                        <th className="px-4 py-3">{t('Campaign Name *')}</th>
                                        <th className="px-4 py-3">{t('URL Completa')}</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLinks.map(link => (
                                        <tr key={link.id} className="border-b border-gray-700 hover:bg-gray-600/30">
                                            <td className="px-4 py-4">{new Date(link.createdAt).toLocaleDateString()}</td>
                                            <td className="px-4 py-4">{link.campaign}</td>
                                            <td className="px-4 py-4 max-w-xs truncate">
                                                 <a href={link.fullUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.fullUrl}</a>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                 <button onClick={() => handleDeleteLink(link.id)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-700">
                            <h4 className="text-xl font-semibold text-gray-300">{t('Nenhum link salvo ainda.')}</h4>
                            <p className="mt-2 text-gray-400">Use o construtor ao lado para começar.</p>
                        </div>
                    )}
                 </Card>
            </div>
        </div>
    );
};

export const KeywordBuilderPage: React.FC<KeywordBuilderPageProps> = ({ planData, setPlanData }) => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    
    const [generationMode, setGenerationMode] = useState<'seed' | 'prompt'>('seed');
    const [seedKeywords, setSeedKeywords] = useState('');
    const [aiPrompt, setAIPrompt] = useState('');
    const [keywordCount, setKeywordCount] = useState('25-50');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');

    const [keywords, setKeywords] = useState<KeywordSuggestion[]>([]);
    const [adGroups, setAdGroups] = useState<AdGroup[]>(planData.adGroups || []);
    
    useEffect(() => {
        setAdGroups(planData.adGroups || []);
    }, [planData.adGroups]);

    const handleGenerateKeywords = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const input = generationMode === 'seed' ? seedKeywords : aiPrompt;
            if (!input) return;

            const result = await generateAIKeywords(planData, generationMode, input, language, keywordCount);
            setKeywords(result);
        } catch (err) {
            console.error(err);
            setError(t('error_generating_keywords'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateAdGroup = () => {
        if (!newGroupName.trim()) return;
        
        const newGroup: AdGroup = {
            id: `group_${Date.now()}`,
            name: newGroupName.trim(),
            keywords: []
        };
        
        const updatedAdGroups = [...adGroups, newGroup];
        
        setPlanData(prev => {
            if (!prev) return null;
            const newPlan = { ...prev, adGroups: updatedAdGroups };
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
        
        setNewGroupName('');
    };
    
     const handleDeleteAdGroup = (groupId: string) => {
        if (!window.confirm(t('confirm_delete_group'))) return;

        const groupToDelete = adGroups.find(g => g.id === groupId);
        if (!groupToDelete) return;
        
        // Move keywords from the deleted group back to the unassigned list
        setKeywords(prev => [...prev, ...groupToDelete.keywords]);
        
        const updatedAdGroups = adGroups.filter(g => g.id !== groupId);

        setPlanData(prev => {
            if (!prev) return null;
            const newPlan = { ...prev, adGroups: updatedAdGroups };
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
    };

    const handleAssignToGroup = (keyword: KeywordSuggestion, groupId: string) => {
        const group = adGroups.find(g => g.id === groupId);
        if (!group) return;

        group.keywords.push(keyword);
        setKeywords(prev => prev.filter(kw => kw.keyword !== keyword.keyword));
        
        setPlanData(prev => {
            if (!prev) return null;
            const newPlan = { ...prev, adGroups: [...adGroups] };
            dbService.savePlan(user!.uid, newPlan);
            return newPlan;
        });
    };
    
    const inputStyle = "w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="space-y-6">
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => setGenerationMode('seed')} className={`px-4 py-2 text-sm font-medium ${generationMode === 'seed' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>{t('seed_keywords_label')}</button>
                            <button onClick={() => setGenerationMode('prompt')} className={`px-4 py-2 text-sm font-medium ${generationMode === 'prompt' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>{t('ai_prompt_label')}</button>
                        </div>
                        {generationMode === 'seed' ? (
                            <textarea value={seedKeywords} onChange={e => setSeedKeywords(e.target.value)} placeholder={t('seed_keywords_placeholder')} rows={4} className={inputStyle}/>
                        ) : (
                            <textarea value={aiPrompt} onChange={e => setAIPrompt(e.target.value)} placeholder={t('ai_prompt_placeholder')} rows={4} className={inputStyle}/>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('number_of_suggestions')}</label>
                        <select value={keywordCount} onChange={e => setKeywordCount(e.target.value)} className={`${inputStyle} mb-4`}>
                            <option value="25-50">25 - 50</option>
                            <option value="50-100">50 - 100</option>
                            <option value="100-150">100 - 150</option>
                        </select>
                        <button onClick={handleGenerateKeywords} disabled={isLoading} className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2">
                            {isLoading ? <LoaderIcon size={20} className="animate-spin" /> : <KeyRound size={20} />}
                            {isLoading ? t('generating_keywords') : t('generate_keywords')}
                        </button>
                    </div>
                </div>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                         <h3 className="text-xl font-bold text-gray-100 mb-4">{t('Results')}</h3>
                         {keywords.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3">{t('keyword')}</th>
                                            <th className="px-4 py-3">{t('search_volume')}</th>
                                            <th className="px-4 py-3">{t('min_cpc')}</th>
                                            <th className="px-4 py-3">{t('max_cpc')}</th>
                                            <th className="px-4 py-3">{t('assign_to_group')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {keywords.map((kw, i) => (
                                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-600/30">
                                                <td className="px-4 py-2 font-medium">{kw.keyword}</td>
                                                <td className="px-4 py-2">{formatNumber(kw.volume)}</td>
                                                <td className="px-4 py-2">{formatCurrency(kw.minCpc)}</td>
                                                <td className="px-4 py-2">{formatCurrency(kw.maxCpc)}</td>
                                                <td className="px-4 py-2">
                                                    <select onChange={(e) => handleAssignToGroup(kw, e.target.value)} className="text-xs p-1 rounded border-gray-600 bg-gray-700">
                                                        <option value="">{t('move_to')}</option>
                                                        {adGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         ) : (
                            <p className="text-gray-400">{t('no_keywords_generated')}</p>
                         )}
                    </Card>
                </div>
                 <div className="lg:col-span-1">
                    <Card>
                        <h3 className="text-xl font-bold text-gray-100 mb-4">{t('ad_groups')}</h3>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={t('ad_group_name_placeholder')} className="flex-grow input-style text-sm" />
                            <button onClick={handleCreateAdGroup} className="px-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">{t('add')}</button>
                        </div>
                        <div className="space-y-4">
                            {adGroups.map(group => (
                                <div key={group.id} className="p-3 bg-gray-700/50 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">{group.name} ({group.keywords.length})</h4>
                                        <button onClick={() => handleDeleteAdGroup(group.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                    <ul className="text-sm mt-2 space-y-1">
                                        {group.keywords.slice(0, 5).map(kw => <li key={kw.keyword} className="truncate">- {kw.keyword}</li>)}
                                        {group.keywords.length > 5 && <li className="text-xs text-gray-500">... e mais {group.keywords.length - 5}</li>}
                                        {group.keywords.length === 0 && <li className="text-xs text-gray-500">{t('no_keywords_in_group')}</li>}
                                    </ul>
                                </div>
                            ))}
                            {adGroups.length === 0 && <p className="text-sm text-gray-400">{t('no_ad_groups')}</p>}
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
    const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputStyle = "w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        setImages([]);
        try {
            const result = await generateAIImages(prompt, uploadedImage ? { base64: uploadedImage.base64, mimeType: uploadedImage.mimeType } : undefined);
            setImages(result);
        } catch (err) {
            console.error(err);
            setError(t('error_generating_images'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setUploadedImage({
                    base64: base64String,
                    mimeType: file.type,
                    preview: URL.createObjectURL(file)
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const downloadImage = (base64: string, aspectRatio: AspectRatio) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${base64}`;
        link.download = `${prompt.slice(0, 30).replace(/\s/g, '_')}_${aspectRatio}.png`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold text-gray-100 mb-1">{t('creative_builder')}</h2>
                <p className="text-gray-400 mb-4">Gere imagens únicas para suas campanhas com IA.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-300 mb-1">{t('Prompt para Geração de Imagem')}</label>
                             <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className={inputStyle} placeholder={t('creative_prompt_placeholder')}></textarea>
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || !prompt} className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2">
                             {isLoading ? <LoaderIcon size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                             {isLoading ? t('generating_images') : t('generate_images')}
                        </button>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">{t('Imagem de Referência (Opcional)')}</label>
                         <div
                            className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-center p-4 min-h-[150px] cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                         >
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                            {uploadedImage ? (
                                <div className="relative group">
                                    <img src={uploadedImage.preview} alt="Uploaded preview" className="max-h-40 rounded-md object-contain" />
                                    <button onClick={(e) => { e.stopPropagation(); setUploadedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                </div>
                            ) : (
                                <div className="text-gray-400">
                                    <Upload size={32} className="mx-auto mb-2" />
                                    <p>{t('Clique para carregar uma imagem')}</p>
                                    <p className="text-xs">{t('ou')}</p>
                                    <p className="text-xs">{t('Arraste e solte')}</p>
                                </div>
                            )}
                         </div>
                    </div>
                </div>
                 {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading && Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-[1/1] bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                        <LoaderIcon className="text-gray-600 animate-spin" size={48} />
                    </div>
                ))}
                
                {images.length > 0 ? images.map((img, i) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden shadow-lg">
                        <img src={`data:image/png;base64,${img.base64}`} alt={`Generated image ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                            <button onClick={() => downloadImage(img.base64, img.aspectRatio)} className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2">
                                <FileDown size={18} /> {t('download')} ({img.aspectRatio})
                            </button>
                        </div>
                    </div>
                )) : !isLoading && (
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Card className="text-center py-20 border-2 border-dashed border-gray-700">
                            <ImageIcon size={48} className="mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-400">{t('creative_builder_initial_prompt')}</p>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AddMonthModal: React.FC<AddMonthModalProps> = ({ isOpen, onClose, onAddMonth, existingMonths }) => {
    const { t } = useLanguage();
    const [selectedMonth, setSelectedMonth] = useState('');

    if (!isOpen) return null;

    const currentYear = new Date().getFullYear();
    const availableMonths = MONTHS_LIST.map(monthName => `${currentYear}-${monthName}`)
                                      .concat(MONTHS_LIST.map(monthName => `${currentYear + 1}-${monthName}`))
                                      .filter(monthKey => !existingMonths.includes(monthKey));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('Adicionar Mês ao Plano')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    {availableMonths.length > 0 ? (
                        <>
                        <label className="block text-sm font-medium text-gray-300">{t('Mês')}</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="mt-1 block w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t('Selecione um mês')}</option>
                            {availableMonths.map(monthKey => {
                                const [year, monthName] = monthKey.split('-');
                                return <option key={monthKey} value={monthKey}>{`${t(monthName)} ${year}`}</option>
                            })}
                        </select>
                        </>
                    ) : (
                        <p className="text-center text-gray-400">{t('Todos os meses já foram adicionados.')}</p>
                    )}
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">{t('cancel')}</button>
                    <button onClick={() => onAddMonth(selectedMonth)} disabled={!selectedMonth} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{t('add')}</button>
                </div>
            </div>
        </div>
    );
};


export const AIPlanCreationModal: React.FC<AIPlanCreationModalProps> = ({ isOpen, onClose, onGenerate, isLoading, initialPrompt, title, buttonText, loadingText }) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState(initialPrompt || '');

    useEffect(() => {
        setPrompt(initialPrompt || '');
    }, [initialPrompt, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                        <Sparkles className="text-blue-500" /> {title || t('Crie seu Plano com IA')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <p className="text-gray-400 mb-4">{t('Descreva seu negócio, objetivos e público')}</p>
                    <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        rows={5}
                        className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('Ex: Uma cafeteria em São Paulo focada em jovens profissionais. Objetivo: aumentar o fluxo na loja.')}
                    />
                </div>
                <div className="p-4 bg-gray-700/50 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={() => onGenerate(prompt)} 
                        disabled={isLoading || !prompt}
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading && <LoaderIcon className="animate-spin" size={20} />}
                        {isLoading ? (loadingText || t('Gerando seu plano...')) : (buttonText || t('Gerar Plano'))}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ShareLinkModal: React.FC<{isOpen: boolean; onClose: () => void; link: string;}> = ({ isOpen, onClose, link }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        if (link !== t('link_generation_error')) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    useEffect(() => {
        if(isOpen) setCopied(false);
    }, [isOpen]);
    
    if(!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-modalFadeIn">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('share_plan_title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6">
                    <p className="text-gray-400 mb-4">{t('share_plan_desc')}</p>
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-700 border-gray-600">
                        <Link2 size={18} className="text-gray-400" />
                        <input 
                            type="text" 
                            readOnly 
                            value={link} 
                            className="w-full bg-transparent text-sm text-gray-200 focus:outline-none"
                        />
                        <button 
                            onClick={copyToClipboard}
                            className={`px-3 py-1 text-sm font-semibold rounded-md ${copied ? 'bg-green-500' : 'bg-blue-600'} text-white transition-colors`}
                        >
                            {copied ? t('copied') : t('copy_link')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ShareablePlanViewer: React.FC<{userId: string; planId: string}> = ({ userId, planId }) => {
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchPlan = () => {
            const planData = dbService.getPlanById(userId, planId);
            setPlan(planData);
            setIsLoading(false);
        };
        fetchPlan();
    }, [userId, planId]);
    
    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900"><LoaderIcon className="animate-spin text-blue-600" size={48} /> <span className="ml-4 text-lg text-gray-300">{t('loading_plan')}</span></div>;
    }

    if (!plan) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-xl text-red-500">{t('plan_not_found')}</div>;
    }
    
    // Create a mock user object for display purposes
    const presenterUser = { displayName: 'Apresentador', photoURL: plan.logoUrl };

    return (
        <div className="min-h-screen bg-gray-900">
             <header className="bg-gray-800 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <img src={LOGO_DARK} alt="MasterPlan Logo" className="h-8"/>
                         <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>{t('shared_by')}:</span>
                            <img src={plan.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.campaignName[0])}`} alt="Presenter avatar" className="w-8 h-8 rounded-full object-cover"/>
                            <span className="font-medium text-gray-200">{plan.campaignName}</span>
                         </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                 <DashboardPage planData={plan} onNavigate={() => {}} onAddMonthClick={() => {}} onRegeneratePlan={async () => {}} isRegenerating={false} isReadOnly={true} />
            </main>
        </div>
    );
};