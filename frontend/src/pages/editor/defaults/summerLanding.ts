import type { EditorElement, ElementStyles } from '../types';

/** Editable reference content; uses the same element model as saved website pages. */
export function createSummerLanding(id: () => string): EditorElement[] {
  const expandSpacing = (styles: ElementStyles): ElementStyles => {
    const result = {marginTop:'0px',marginBottom:'0px',...styles};
    if (styles.padding) { const [a,b=a,c=a,d=b] = styles.padding.split(' '); Object.assign(result,{paddingTop:a,paddingRight:b,paddingBottom:c,paddingLeft:d}); }
    return result;
  };
  const node = (type: EditorElement['type'], content: string, styles: ElementStyles = {}, children?: EditorElement[]): EditorElement => ({id: id(), type, content, customClass:`pdf-reference-node pdf-reference-${type}`, styles: expandSpacing(styles), ...(children ? {children, layout: {direction: 'column', gap: 0}} : {})});
  const row = (content: string, children: EditorElement[], styles: ElementStyles = {}) => ({...node('container',content,styles,children), layout:{direction:'row' as const,alignItems:'center' as const,justifyContent:'space-between' as const,gap:14,flexWrap:'wrap' as const}});
  const text = (content: string, styles: ElementStyles = {}) => node('text',content,{fontSize:'13px',lineHeight:'1.6',padding:'0px',...styles});
  const button = (content: string, href: string, primary = false) => ({...node('button',content,{backgroundColor:primary ? '#df3bc2' : 'transparent',color:'#ffffff',padding:'12px 20px',borderRadius:'24px',borderWidth:'1px',borderStyle:'solid',borderColor:primary ? '#df3bc2' : '#625970',fontSize:'12px',fontWeight:'600'}),href,linkUrl:href,destinationType:'url' as const});
  const heading = node('heading','Gear up for\nbigger adventures.',{fontSize:'48px',fontWeight:'700',lineHeight:'1.1',color:'#ffffff',marginBottom:'16px',whiteSpace:'pre-line',letterSpacing:'-2px'});
  heading.headingLevel = "h1";
  heading.responsiveStyles={tablet:{fontSize:'46px'},mobile:{fontSize:'36px'}};
  return [
    row('Summer offer',[text('◆  Get 15% off everything this summer',{color:'#ffffff',fontSize:'12px'}),text('USE CODE: SUMMER15',{backgroundColor:'#ffffff',color:'#1d112a',borderRadius:'14px',padding:'3px 10px',fontSize:'10px',fontWeight:'700'})],{backgroundImage:'linear-gradient(100deg,#dc3ddf,#9d2bed)',padding:'10px 30px',justifyContent:'center'}),
    row('Top Navbar',[text('▣  FIKRISHOP',{fontWeight:'800',fontSize:'21px',color:'#08080a'}),...['Shop','Rentals','Collections','How It Works'].map(label => ({...text(label,{fontSize:'12px',color:'#24304a'}),href:'#collection'}))],{padding:'22px 32px',backgroundColor:'#ffffff'}),
    node('container','Hero Section',{backgroundColor:'#000000',backgroundImage:'url(/editor/summer-hero.png)',backgroundSize:'cover',backgroundPosition:'center',padding:'56px 44px 0',color:'#ffffff'},[
      text('Summer Collection',{fontSize:'12px',backgroundColor:'#30263d',borderRadius:'20px',padding:'5px 12px',width:'fit-content',marginBottom:'14px',color:'#eee6f8'}),
      heading,
      text('Premium outdoor gear, delivered to your door.\nRent or buy. Explore more.',{whiteSpace:'pre-line',color:'#c4bfce',marginBottom:'24px'}),
      row('Hero actions',[button('Shop All Gear  →','#collection',true),button('▷  Watch Video','#collection')],{justifyContent:'flex-start',marginBottom:'56px'}),
      row('Client Logo',[text('♧  Free Delivery\nOn orders over $50',{whiteSpace:'pre-line',fontSize:'11px',color:'#ffffff'}),text('◇  Trusted Quality\nFrom top brands',{whiteSpace:'pre-line',fontSize:'11px',color:'#ffffff'}),text('♧  Sustainable\nA cleaner tomorrow',{whiteSpace:'pre-line',fontSize:'11px',color:'#ffffff'})],{padding:'28px 10px',borderTopWidth:'1px',borderStyle:'solid',borderColor:'#28232b'})
    ]),
    node('container','Find your next adventure',{backgroundColor:'#f7f8fc',padding:'24px',color:'#24304a'},[
      row('Search heading',[text('⌕  Find your next adventure',{fontWeight:'700',fontSize:'14px'}),text('Rent high-quality gear from trusted brands.',{fontSize:'11px',color:'#96a5bd'})]),
      {...node('form','Search Gear',{marginTop:'20px'}),formTitle:'Find your next adventure',formSubtitle:'Rent high-quality gear from trusted brands.',formLayoutColumns:2,formActions:{saveToDb:true},formFields:[{id:id(),type:'select',label:'Gear type',required:true,options:['Snowboard','Skis','Hiking gear']},{id:id(),type:'date',label:'Delivery date',required:true},{id:id(),type:'date',label:'Return date',required:true},{id:id(),type:'text',label:'Location',placeholder:'Zermatt, CH',required:true}],formSubmitText:'Search Gear',formSubmitBtnBg:'#8b36ef'} as EditorElement,
    ]),
    {...node('container','Summer Collection',{padding:'24px',backgroundColor:'#ffffff'},[
      node('container','Exclusive summer offer',{backgroundImage:'linear-gradient(110deg,#171023,#2c194b)',color:'#ffffff',borderRadius:'18px',padding:'34px 32px'},[
        text('EXCLUSIVE SUMMER OFFER',{color:'#ff69bd',fontWeight:'700',fontSize:'12px'}),node('heading','15% OFF',{fontSize:'38px',fontWeight:'800',color:'#ffffff',marginTop:'8px',marginBottom:'5px'}),text('Premium gear for your next adventure.',{color:'#c4bacf',marginBottom:'18px'}),button('Shop the Collection  →','#collection')
      ])
    ]), customId:'collection'}
  ];
}
