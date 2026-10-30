import NotificationSettings from '../notifications/NotificationSettings';
import NotificationBell from '../notifications/NotificationBell';
import HelpView from '../help/HelpView';
import SecurityView from '../security/SecurityView';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Bell,Blocks,BookOpen,Copy,LayoutGrid,Plus,Puzzle,Redo2,Settings,Sparkles,Undo2} from 'lucide-react';
import {HeaderUserDropdown} from '../../components/HeaderUserDropdown';
import AccountView from './AccountView';
import CommunityView from '../community/CommunityView';
import type {SettingsPage} from './SettingsNavigation';
import './AccountShell.css';

// Account has its own compact settings shell, rather than nesting inside workspace navigation.
export default function AccountShell({onBack,onAdd,onTemplates,onSaved,onSettings,page,onNavigate,children}:{onBack:()=>void;onAdd:()=>void;onTemplates:()=>void;onSaved:()=>void;onSettings:(panel:string)=>void;page:SettingsPage;onNavigate:(page:SettingsPage)=>void;children?:ReactNode}){
 return <div className="studio-dashboard account-shell">
  <header className="studio-header account-shell-header"><button className="account-shell-back" aria-label="Back to dashboard" onClick={onBack}><ArrowLeft size={16}/></button><button className="studio-brand" onClick={onBack}>web studio</button><div className="header-divider"/>
   <div className="header-actions"><div className="account-history" aria-label="Editor history"><button disabled aria-label="Undo" title="Undo is available in the website editor"><Undo2 size={15}/></button><button disabled aria-label="Redo" title="Redo is available in the website editor"><Redo2 size={15}/></button></div><NotificationBell compact onSettings={onSettings}/><Link className="upgrade-button" to="/subscriptions">Upgrade <ArrowRight size={13}/></Link><HeaderUserDropdown onSettings={onSettings}/></div>
  </header>
  <div className="account-shell-body"><nav className="account-tool-rail" aria-label="Studio tools"><button className="account-tool-add" onClick={onAdd}><Plus size={19}/><span>Add</span></button><div className="account-tool-rule"/><button onClick={onBack} title="Choose a site to manage its pages"><Copy size={16}/><span>Pages</span></button><button disabled title="Open a site in the editor to work with blocks"><Blocks size={16}/><span>Blocks</span></button><button onClick={onTemplates}><BookOpen size={16}/><span>Templates</span></button><button disabled title="Open a site in the editor to work with elements"><LayoutGrid size={16}/><span>Elements</span></button><Link to="/dashboard/tools?tab=plugin-hub"><Puzzle size={16}/><span>Plugin</span></Link><button className="account-tool-ai" disabled title="Open a site in the editor to use AI tools"><Sparkles size={17}/><span>AI</span></button><div className="account-tool-current" aria-current="page"><Settings size={17}/><span>Settings</span></div></nav>
   {page==='notifications'?<NotificationSettings onNavigate={onNavigate}/>:page==='help'?<HelpView onNavigate={onNavigate}/>:page==='security'?<SecurityView onNavigate={onNavigate}/>:page==='community'?<CommunityView onNavigate={onNavigate}/>:<AccountView onSaved={onSaved} onNavigate={onNavigate}/>}
  </div>{children}
 </div>;
}
