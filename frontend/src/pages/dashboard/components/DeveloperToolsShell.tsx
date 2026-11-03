import type {ReactNode} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowLeft,ArrowRight,CodeXml,Home,Lock,Puzzle} from 'lucide-react';
import {HeaderUserDropdown} from '../../../components/HeaderUserDropdown';
import NotificationBell from '../../../features/notifications/NotificationBell';
import {NotificationProvider} from '../../../features/notifications/NotificationContext';
import './DeveloperApiSettings.css';
export default function DeveloperToolsShell({active,children}:{active:string;children:ReactNode}){const navigate=useNavigate();return <NotificationProvider><div className="dev-api-shell"><header className="dev-api-header"><Link to="/dashboard" aria-label="Back to dashboard" className="dev-api-back"><ArrowLeft size={17}/></Link><Link to="/dashboard" className="dev-api-brand">web studio</Link><span className="dev-api-divider"/><div className="dev-api-header-actions"><NotificationBell compact onSettings={()=>navigate("/dashboard?section=notifications")}/><Link className="dev-api-upgrade" to="/subscriptions">Upgrade <ArrowRight size={15}/></Link><HeaderUserDropdown onSettings={p=>navigate(`/dashboard?section=${p==='help-support'?'help':p}`)}/></div></header>
 <div className="dev-api-body"><nav className="dev-api-nav" aria-label="Developer tools">{[['developer-api','API',Home],['plugin-hub','Plugin Hub',Puzzle],['custom-code','Custom Code',CodeXml],['advanced-code','Code manager',Lock],['cpts','Custom post types',Lock],['composer-installation','Composer',Lock]].map(([id,label,Icon])=>{const Symbol=Icon as typeof Home;return <Link key={id as string} className={id===active?'active':''} to={`/dashboard/tools?tab=${id}`} aria-current={id===active?'page':undefined}><Symbol size={16}/>{label as string}</Link>;})}</nav>
 {children}</div></div></NotificationProvider>;}
