// Original editable starter designs; these are free catalog assets, not demo user activity.
const specs=[
 ['greeny','Greeny','Business','Professional Services',['Modern','Professional'],[],'Research done right, made effortlessly.','Make room for your next big idea. Thoughtful solutions for a brighter tomorrow.','#d7ecdf','#123d32','#e7f7b4','Explore our services'],
 ['homa','Homa','eCommerce','Retail',['Minimal','Modern'],['Online Store'],'Everyday objects. Exceptional living.','A considered collection of essentials, designed to make your space feel like home.','#ede5db','#24201b','#d3b190','Explore the collection'],
 ['creatix','Creatix','Agency','Creative Services',['Bold','Creative'],[],'Ideas beyond the ordinary.','We bring ambitious brands to life through strategy, design, and digital experiences.','#12111e','#f0edff','#b39af9','Let’s create together'],
 ['alex','Alex','Portfolio','Design',['Minimal','Creative'],[],'Independent designer. Endless curiosity.','I build thoughtful digital experiences for people and the places they call home.','#eff0ed','#172923','#c4dd75','View selected work'],
 ['flavoro','Flavoro','Restaurant','Food & Drink',['Bold','Fun'],['Booking'],'Good food. Great company.','Seasonal ingredients, generous plates, and a table waiting just for you.','#241510','#fff1df','#ef9a62','Reserve a table'],
 ['travely','Travely','Travel','Travel & Tourism',['Modern','Fun'],['Booking'],'Some journeys change everything.','Discover wide-open spaces and extraordinary experiences. Your next chapter starts here.','#e2edf2','#123047','#fac86b','Find your adventure'],
 ['educa','Educa','Education','Education',['Professional','Modern'],[],'Learn something that changes you.','Practical courses, inspiring mentors, and a community that helps you take the next step.','#f5eee3','#292b43','#aaa5ef','Explore our courses'],
 ['fitlab','FitLab','Health & Wellness','Health & Fitness',['Bold','Professional'],['Booking'],'Find your strength. Build your rhythm.','Training that meets you where you are. Coaching that helps you become who you want to be.','#142722','#e5efe9','#c7f06b','Book a session'],
];
export const templateSeeds=specs.map(([slug,name,category,industry,styles,features,title,description,bg,fg,accent,cta],index)=>({
 id:`ae97690f-1a81-4a75-8c4e-${String(index+1).padStart(12,'0')}`,slug,name,category,industry,styles,features,description,displayOrder:index,
 templateData:{elements:[{id:`${slug}-page`,type:'container',content:'',classes:[],layout:{layoutType:'flex',direction:'column',gap:32},styles:{backgroundColor:bg,color:fg,padding:'48px',minHeight:'850px',width:'100%',boxSizing:'border-box'},children:[
 {id:`${slug}-brand`,type:'heading',tag:'h2',content:name+'.',classes:[],styles:{fontSize:'25px',fontWeight:'700',letterSpacing:'-1px',color:fg}},
 {id:`${slug}-hero`,type:'container',content:'',classes:[],layout:{layoutType:'flex',direction:'column',gap:20},styles:{padding:'65px 0',maxWidth:'780px'},children:[
 {id:`${slug}-eyebrow`,type:'text',content:category.toUpperCase()+' / MADE FOR WHAT’S NEXT',classes:[],styles:{fontSize:'12px',letterSpacing:'2px',color:fg}},
 {id:`${slug}-title`,type:'heading',tag:'h1',content:title,classes:[],styles:{fontSize:'64px',lineHeight:'1.06',fontWeight:'700',letterSpacing:'-3px',color:fg}},
 {id:`${slug}-description`,type:'text',content:description,classes:[],styles:{fontSize:'18px',lineHeight:'1.7',maxWidth:'560px',color:fg}},
 {id:`${slug}-cta`,type:'button',content:cta,classes:[],styles:{backgroundColor:accent,color:'#18201c',padding:'14px 24px',borderRadius:'30px',fontSize:'14px',width:'fit-content'}},
 ]},
 {id:`${slug}-visual`,type:'container',content:'',classes:[],styles:{height:'260px',borderRadius:'24px',backgroundImage:`radial-gradient(circle at 75% 25%, ${accent} 0%, transparent 40%),linear-gradient(130deg,${fg},${bg})`}},
 {id:`${slug}-section`,type:'heading',tag:'h2',content:'Built around you.',classes:[],styles:{fontSize:'32px',color:fg}},
 {id:`${slug}-section-text`,type:'text',content:'Discover our story, explore what we do, and get in touch to start something meaningful.',classes:[],styles:{fontSize:'17px',lineHeight:'1.7',color:fg}},
 ]}],pageSettings:{title:name,description,backgroundColor:bg}}
}));
