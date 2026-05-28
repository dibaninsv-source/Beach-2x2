import { useState, useMemo, useRef, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc
} from "firebase/firestore";

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const ADMIN_PASSWORD = "132333";

const AVATAR_COLORS = ["#FF6B35","#F7C948","#2EC4B6","#E94F7C","#6C63FF","#3DDC97","#FF9F1C","#00B4D8","#EF476F","#06D6A0"];
const avatarColor = name => AVATAR_COLORS[(name.charCodeAt(0)+name.length) % AVATAR_COLORS.length];

const T = {
  ru: {
    appSub: "матчей · игроков",
    addPlayer: "ДОБАВИТЬ ИГРОКА", playerPlaceholder: "Имя игрока",
    playing: "КТО ИГРАЕТ СЕГОДНЯ", viewOnly: "· просмотр",
    suggestions: "💡 ВАРИАНТЫ ПАР",
    recordMatch: "🏐 ЗАПИСАТЬ МАТЧ", date: "ДАТА",
    team1: "КОМАНДА 1", team2: "КОМАНДА 2",
    player1: "Игрок 1", player2: "Игрок 2",
    noTie: "⚠️ Ничья не допускается",
    saveMatch: "✓ Сохранить матч", sendReview: "⏳ Отправить на проверку",
    pending: "⏳ На проверке", pendingLabel: "⏳ Ждут проверки:",
    pendingDesc: "Игры добавленные игроками", approveAll: "✓ Все OK",
    approveOne: "✓ OK", edit: "✏️", noMatches: "Нет матчей. Запишите первый!",
    tabGame: "⚡ Игра", tabStats: "📊 Статы", tabHistory: "📋 История",
    allTime: "Всё время", totalMatches: "Всего матчей", matchesOf: "Матчей",
    wins: "ПОБЕДЫ", losses: "ПОРАЖ.", games: "ИГРЫ", scored: "ЗАБИЛ", conceded: "ПРОП.",
    winRate: "побед", game1: "игра", game24: "игры", game5: "игр",
    rankGames: t.rankGames, rankGamesHint: "Кто больше выиграл игр",
    rankKing: t.rankKing, rankKingHint: "Кто больше в ±очков",
    period: "ПЕРИОД", periodHint: "· ℹ️ для деталей дня",
    noPlayers: "Добавь игроков на вкладке «Игра»",
    roster: "👥 СОСТАВ КОМАНДЫ",
    trophyBoard: "🏆 Доска наград", gamesWinner: "= Games победитель", kingWinner: "= King победитель",
    noAwards: "нет наград", dayResults: "ИТОГИ ДНЯ",
    victory: "🏆 ПОБЕДА", adminMode: "🔑 Режим Админа", viewMode: "👁 Просмотр",
    adminBtn: "🔑 Админ", adminTitle: "Вход для администратора",
    adminPw: "Введите пароль", wrongPw: "Неверный пароль",
    cancel: "Отмена", enter: "Войти", logout: "выйти",
    deleteTitle: "Удалить игрока?", deleteDesc: "будет удалён из команды",
    deleteBtn: "Удалить", photoTitle: "Фото профиля",
    uploadPhoto: "📷 Загрузить фото", deletePhoto: "🗑 Удалить фото",
    editMatch: "✏️ Редактировать матч", videoLink: "+ видео", loading: "Загрузка данных...",
    matches: "матчей", players: "игроков",
  },
  lv: {
    appSub: "spēles · spēlētāji",
    addPlayer: "PIEVIENOT SPĒLĒTĀJU", playerPlaceholder: "Spēlētāja vārds",
    playing: "KAS SPĒLĒ ŠODIEN", viewOnly: "· skatīties",
    suggestions: "💡 KOMANDU VARIANTI",
    recordMatch: "🏐 IERAKSTĪT SPĒLI", date: "DATUMS",
    team1: "KOMANDA 1", team2: "KOMANDA 2",
    player1: "Spēlētājs 1", player2: "Spēlētājs 2",
    noTie: "⚠️ Neizšķirts nav atļauts",
    saveMatch: "✓ Saglabāt spēli", sendReview: "⏳ Nosūtīt pārbaudei",
    pending: "⏳ Pārbaude", pendingLabel: "⏳ Gaida pārbaudi:",
    pendingDesc: "Spēles pievienotas spēlētājiem", approveAll: "✓ Viss OK",
    approveOne: "✓ OK", edit: "✏️", noMatches: "Nav spēļu. Ierakstiet pirmo!",
    tabGame: "⚡ Spēle", tabStats: "📊 Statistika", tabHistory: "📋 Vēsture",
    allTime: "Viss laiks", totalMatches: "Kopā spēles", matchesOf: "Spēles",
    wins: "UZVARAS", losses: "ZAUD.", games: "SPĒLES", scored: "IEMESTI", conceded: "IELAISTI",
    winRate: "uzvaras", game1: "spēle", game24: "spēles", game5: "spēles",
    rankGames: t.rankGames, rankGamesHint: "Kurš uzvarēja vairāk spēļu",
    rankKing: t.rankKing, rankKingHint: "Kurš ir vairāk ±punktos",
    period: "PERIODS", periodHint: "· ℹ️ dienas detaļām",
    noPlayers: "Pievieno spēlētājus cilnē «Spēle»",
    roster: "👥 KOMANDAS SASTĀVS",
    trophyBoard: "🏆 Apbalvojumu dēlis", gamesWinner: "= Games uzvarētājs", kingWinner: "= King uzvarētājs",
    noAwards: "nav apbalvojumu", dayResults: "DIENAS REZULTĀTI",
    victory: "🏆 UZVARA", adminMode: "🔑 Admin režīms", viewMode: "👁 Skatīties",
    adminBtn: "🔑 Admin", adminTitle: "Administratora ieeja",
    adminPw: "Ievadiet paroli", wrongPw: "Nepareiza parole",
    cancel: "Atcelt", enter: "Ienākt", logout: "iziet",
    deleteTitle: "Dzēst spēlētāju?", deleteDesc: "tiks dzēsts no komandas",
    deleteBtn: "Dzēst", photoTitle: "Profila foto",
    uploadPhoto: "📷 Augšupielādēt foto", deletePhoto: "🗑 Dzēst foto",
    editMatch: "✏️ Rediģēt spēli", videoLink: "+ video", loading: "Datu ielāde...",
    matches: "spēles", players: "spēlētāji",
  },
  en: {
    appSub: "matches · players",
    addPlayer: "ADD PLAYER", playerPlaceholder: "Player name",
    playing: "WHO PLAYS TODAY", viewOnly: "· view only",
    suggestions: "💡 PAIR OPTIONS",
    recordMatch: "🏐 RECORD MATCH", date: "DATE",
    team1: "TEAM 1", team2: "TEAM 2",
    player1: "Player 1", player2: "Player 2",
    noTie: "⚠️ Tie not allowed",
    saveMatch: "✓ Save match", sendReview: "⏳ Send for review",
    pending: "⏳ Pending", pendingLabel: "⏳ Awaiting review:",
    pendingDesc: "Matches added by players", approveAll: "✓ All OK",
    approveOne: "✓ OK", edit: "✏️", noMatches: "No matches. Record the first!",
    tabGame: "⚡ Game", tabStats: "📊 Stats", tabHistory: "📋 History",
    allTime: "All time", totalMatches: "Total matches", matchesOf: "Matches",
    wins: "WINS", losses: "LOSSES", games: "GAMES", scored: "SCORED", conceded: "CONCEDED",
    winRate: "wins", game1: "game", game24: "games", game5: "games",
    rankGames: t.rankGames, rankGamesHint: "Who won most games",
    rankKing: t.rankKing, rankKingHint: "Who has best ±points",
    period: "PERIOD", periodHint: "· ℹ️ for day details",
    noPlayers: "Add players in the «Game» tab",
    roster: "👥 TEAM ROSTER",
    trophyBoard: "🏆 Trophy Board", gamesWinner: "= Games winner", kingWinner: "= King winner",
    noAwards: "no awards", dayResults: "DAY RESULTS",
    victory: "🏆 WIN", adminMode: "🔑 Admin Mode", viewMode: "👁 View",
    adminBtn: "🔑 Admin", adminTitle: "Administrator login",
    adminPw: "Enter password", wrongPw: "Wrong password",
    cancel: "Cancel", enter: "Login", logout: "logout",
    deleteTitle: "Delete player?", deleteDesc: "will be removed from team",
    deleteBtn: "Delete", photoTitle: "Profile photo",
    uploadPhoto: "📷 Upload photo", deletePhoto: "🗑 Remove photo",
    editMatch: "✏️ Edit match", videoLink: "+ video", loading: "Loading...",
    matches: "matches", players: "players",
  }
};

const C = {
  bg:"#0D0D1A", card:"#161626", cardHi:"#1E1E35", border:"#2A2A45",
  sand:"#F7C948", sky:"#2EC4B6", red:"#FF6B6B", green:"#3DDC97",
  text:"#E8E8F0", sub:"#7070A0", accent:"#6C63FF", king:"#FFB347", pending:"#FF8C42"
};

function Avatar({ player, size=38, onClick }) {
  const name = typeof player==="string" ? player : player?.name ?? "?";
  const photo = typeof player==="object" ? player?.photo : null;
  return (
    <div onClick={onClick} style={{ width:size, height:size, borderRadius:"50%",
      background: photo?"transparent":avatarColor(name),
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:900, fontSize:size*0.38, color:"#fff", flexShrink:0,
      boxShadow:"0 0 0 2px #1a1a2e", overflow:"hidden",
      cursor:onClick?"pointer":"default" }}>
      {photo ? <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={name}/> : name.slice(0,2).toUpperCase()}
    </div>
  );
}

function computeStats(players, matches) {
  const st = {};
  players.forEach(p => { st[p.id]={games:0,wins:0,losses:0,scored:0,conceded:0}; });
  matches.forEach(m => {
    [{pair:[m.t1p1,m.t1p2],sc:m.score1,cn:m.score2},{pair:[m.t2p1,m.t2p2],sc:m.score2,cn:m.score1}]
      .forEach(({pair,sc,cn}) => pair.forEach(pid => {
        if(!st[pid]) return;
        st[pid].games++; st[pid].scored+=sc; st[pid].conceded+=cn;
        if(sc>cn) st[pid].wins++; else st[pid].losses++;
      }));
  });
  return st;
}

function computeTrophies(players, matches) {
  const trophies = {};
  players.forEach(p => { trophies[p.id]={cups:0,crowns:0}; });
  const days = [...new Set(matches.map(m=>m.date))];
  days.forEach(day => {
    const dm = matches.filter(m=>m.date===day);
    if(!dm.length) return;
    const st = computeStats(players, dm);
    const byWins = [...players].sort((a,b) => {
      const sa=st[a.id],sb=st[b.id];
      if(sb.wins!==sa.wins) return sb.wins-sa.wins;
      return (sb.games?sb.wins/sb.games:0)-(sa.games?sa.wins/sa.games:0);
    });
    if(byWins[0]&&st[byWins[0].id].wins>0) trophies[byWins[0].id].cups++;
    const byDiff=[...players].sort((a,b)=>{
      const da=st[a.id].scored-st[a.id].conceded,db=st[b.id].scored-st[b.id].conceded;
      return db!==da?db-da:st[b.id].scored-st[a.id].scored;
    });
    if(byDiff[0]&&st[byDiff[0].id].games>0) trophies[byDiff[0].id].crowns++;
  });
  return trophies;
}

function generatePairings(players) {
  const n=players.length; if(n<4) return [];
  const seen=new Set(),pairs=[];
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++)
    for(let k=0;k<n;k++) for(let l=k+1;l<n;l++)
      if(i!==k&&i!==l&&j!==k&&j!==l){
        const key=[[players[i].id,players[j].id].sort().join("-"),[players[k].id,players[l].id].sort().join("-")].sort().join("|");
        if(!seen.has(key)){seen.add(key);pairs.push([players[i],players[j],players[k],players[l]]);}
      }
  return pairs;
}

function fmtDate(d) {
  if(!d) return "";
  const [y,m,day]=d.split("-");
  return `${parseInt(day)} ${["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][parseInt(m)-1]} ${y}`;
}

const inp = { background:C.cardHi, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 12px",
  color:C.text, fontFamily:"'Outfit',sans-serif", fontSize:14, outline:"none",
  width:"100%", boxSizing:"border-box" };
const btn = (bg,sm) => ({ background:bg, border:"none", borderRadius:9,
  padding:sm?"7px 14px":"10px 18px", color:"#fff", fontWeight:700,
  fontFamily:"'Outfit',sans-serif", fontSize:sm?13:14, cursor:"pointer" });
const lbl = { fontSize:11, color:C.sub, fontWeight:700, letterSpacing:1.2, marginBottom:6 };
const card = { background:C.card, borderRadius:14, padding:14, border:`1px solid ${C.border}`, marginBottom:10 };

function ScoreInput({ val, setVal, color, label }) {
  const num=val===""?0:parseInt(val)||0;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{fontSize:10,color:C.sub,fontWeight:700,letterSpacing:0.8}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button onClick={()=>setVal(Math.max(0,num-1))}
          style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:8,
            width:32,height:32,color:C.sub,fontSize:18,cursor:"pointer",fontWeight:900,
            display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        <input type="number" min="0" value={val}
          onChange={e=>{const v=e.target.value;setVal(v===""?"":parseInt(v)||0);}}
          style={{width:52,height:44,background:C.cardHi,border:`2px solid ${color}44`,
            borderRadius:10,color,fontWeight:900,fontSize:26,textAlign:"center",
            fontFamily:"'Outfit',sans-serif",outline:"none",fontVariantNumeric:"tabular-nums"}}/>
        <button onClick={()=>setVal(num+1)}
          style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:8,
            width:32,height:32,color:C.text,fontSize:18,cursor:"pointer",fontWeight:900,
            display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>
    </div>
  );
}

function AdminPopup({ onSuccess, onClose }) {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  const try_=()=>{if(pw===ADMIN_PASSWORD){onSuccess();}else{setErr(true);setTimeout(()=>setErr(false),1500);}};
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
      <div style={{background:"#161626",borderRadius:18,padding:24,width:"100%",maxWidth:300,
        border:"1px solid "+C.border,boxShadow:"0 24px 60px #000"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:28,textAlign:"center",marginBottom:6}}>🔑</div>
        <div style={{fontSize:15,fontWeight:800,textAlign:"center",color:C.text,marginBottom:18}}>Вход для администратора</div>
        <input autoFocus type="password" placeholder="Введите пароль" value={pw}
          onChange={e=>{setPw(e.target.value);setErr(false);}}
          onKeyDown={e=>{if(e.key==="Enter")try_();if(e.key==="Escape")onClose();}}
          style={{...inp,border:`1.5px solid ${err?"#FF6B6B":C.border}`,marginBottom:6}}/>
        {err&&<div style={{fontSize:12,color:"#FF6B6B",marginBottom:6}}>Неверный пароль</div>}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={onClose} style={{...btn(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>Отмена</button>
          <button onClick={try_} style={{...btn(C.sand),flex:2,color:"#0D0D1A"}}>Войти</button>
        </div>
      </div>
    </div>
  );
}

function EditMatchPopup({ match, players, onSave, onClose }) {
  const [s1,setS1]=useState(match.score1); const [s2,setS2]=useState(match.score2);
  const [t1p1,setT1p1]=useState(match.t1p1); const [t1p2,setT1p2]=useState(match.t1p2);
  const [t2p1,setT2p1]=useState(match.t2p1); const [t2p2,setT2p2]=useState(match.t2p2);
  const valid=t1p1&&t1p2&&t2p1&&t2p2&&new Set([t1p1,t1p2,t2p1,t2p2]).size===4
    &&s1!==""&&s2!==""&&parseInt(s1)!==parseInt(s2);
  const ss={...inp,appearance:"none",padding:"8px 10px",fontSize:13};
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#161626",borderRadius:16,padding:18,width:"100%",maxWidth:360,
        border:"1px solid "+C.border,boxShadow:"0 24px 60px #000",maxHeight:"90vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:13,fontWeight:800,color:C.sand,marginBottom:14}}>✏️ Редактировать матч</div>
        <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:8,borderLeft:"3px solid "+C.sky}}>
          <div style={{...lbl,color:C.sky,marginBottom:6}}>{t.team1}</div>
          <div style={{display:"flex",gap:6}}>
            <select style={{...ss,flex:1}} value={t1p1} onChange={e=>setT1p1(e.target.value)}>
              {players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select style={{...ss,flex:1}} value={t1p2} onChange={e=>setT1p2(e.target.value)}>
              {players.filter(p=>p.id!==t1p1).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:12,borderLeft:"3px solid "+C.red}}>
          <div style={{...lbl,color:C.red,marginBottom:6}}>{t.team2}</div>
          <div style={{display:"flex",gap:6}}>
            <select style={{...ss,flex:1}} value={t2p1} onChange={e=>setT2p1(e.target.value)}>
              {players.filter(p=>![t1p1,t1p2].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select style={{...ss,flex:1}} value={t2p2} onChange={e=>setT2p2(e.target.value)}>
              {players.filter(p=>![t1p1,t1p2,t2p1].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
          <ScoreInput val={s1} setVal={setS1} color={C.sky} label="КОМ. 1"/>
          <div style={{fontSize:20,fontWeight:900,color:C.sub,paddingTop:18}}>:</div>
          <ScoreInput val={s2} setVal={setS2} color={C.red} label="КОМ. 2"/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose} style={{...btn(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>Отмена</button>
          <button onClick={()=>valid&&onSave({...match,t1p1,t1p2,t2p1,t2p2,score1:parseInt(s1),score2:parseInt(s2)})}
            style={{...btn(valid?C.sand:C.border),flex:2,color:valid?"#0D0D1A":C.sub,opacity:valid?1:0.6}}>✓ Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function DayDetailPopup({ day, matches, players, onClose }) {
  const dm=matches.filter(m=>m.date===day);
  const pObj=id=>players.find(p=>p.id===id)||{name:"?"};
  const st=computeStats(players,dm);
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#161626",borderRadius:"16px 16px 0 0",padding:"18px 16px 30px",
        width:"100%",maxWidth:430,border:"1px solid "+C.border,
        boxShadow:"0 -8px 40px #000",maxHeight:"80vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
        <div style={{fontSize:13,fontWeight:800,color:C.sand,marginBottom:12}}>
          📅 {fmtDate(day)} · {dm.length} матч{dm.length===1?"":"ей"}
        </div>
        {dm.map(m=>{
          const w1=m.score1>m.score2;
          return (
            <div key={m.id} style={{background:C.cardHi,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:3,marginBottom:3}}>
                    <Avatar player={pObj(m.t1p1)} size={20}/><Avatar player={pObj(m.t1p2)} size={20}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:w1?C.green:C.sub}}>
                    {pObj(m.t1p1).name} & {pObj(m.t1p2).name}{w1?" 🏆":""}
                  </div>
                </div>
                <div style={{fontSize:20,fontWeight:900,letterSpacing:-1,flexShrink:0}}>
                  <span style={{color:w1?C.green:C.red}}>{m.score1}</span>
                  <span style={{color:C.sub}}> : </span>
                  <span style={{color:!w1?C.green:C.red}}>{m.score2}</span>
                </div>
                <div style={{flex:1,textAlign:"right"}}>
                  <div style={{display:"flex",gap:3,marginBottom:3,justifyContent:"flex-end"}}>
                    <Avatar player={pObj(m.t2p1)} size={20}/><Avatar player={pObj(m.t2p2)} size={20}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:!w1?C.green:C.sub}}>
                    {!w1?"🏆 ":""}{pObj(m.t2p1).name} & {pObj(m.t2p2).name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div style={{fontSize:11,color:C.sub,fontWeight:700,letterSpacing:1,marginTop:14,marginBottom:8}}>ИТОГИ ДНЯ</div>
        {players.filter(p=>st[p.id]?.games>0).sort((a,b)=>{
          const da=st[a.id].scored-st[a.id].conceded,db=st[b.id].scored-st[b.id].conceded; return db-da;
        }).map(p=>{
          const s=st[p.id]; const diff=s.scored-s.conceded;
          return (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,
              background:C.bg,borderRadius:8,padding:"7px 10px",marginBottom:6}}>
              <Avatar player={p} size={28}/>
              <div style={{flex:1,fontSize:12,fontWeight:700}}>{p.name}</div>
              <div style={{display:"flex",gap:10,fontSize:12}}>
                <span style={{color:C.green}}>{s.wins}В</span>
                <span style={{color:C.red}}>{s.losses}П</span>
                <span style={{color:C.sky}}>{s.scored}↑</span>
                <span style={{color:diff>=0?C.green:C.red,fontWeight:800}}>{diff>=0?"+":""}{diff}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrophyBoard({ players, trophies, onClose }) {
  const sorted=[...players].sort((a,b)=>{
    const ta=trophies[a.id]||{cups:0,crowns:0},tb=trophies[b.id]||{cups:0,crowns:0};
    return (tb.cups+tb.crowns)-(ta.cups+ta.crowns);
  });
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#161626",borderRadius:"16px 16px 0 0",padding:"18px 16px 30px",
        width:"100%",maxWidth:430,border:"1px solid "+C.border,
        boxShadow:"0 -8px 40px #000",maxHeight:"70vh",overflowY:"auto"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:10,textAlign:"center"}}>🏆 Доска наград</div>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:14,fontSize:11,color:C.sub}}>
          <span>🏆 = Games победитель</span><span>👑 = King победитель</span>
        </div>
        {sorted.map((p,i)=>{
          const t=trophies[p.id]||{cups:0,crowns:0}; const has=t.cups>0||t.crowns>0;
          return (
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,
              background:has?avatarColor(p.name)+"11":C.cardHi,
              borderRadius:10,padding:"10px 12px",marginBottom:7,
              border:`1px solid ${has?avatarColor(p.name)+"44":C.border}`}}>
              <div style={{fontWeight:800,fontSize:13,color:C.sub,minWidth:18}}>#{i+1}</div>
              <Avatar player={p} size={34}/>
              <div style={{flex:1,fontWeight:700,fontSize:14}}>{p.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
                {t.cups>0&&<div>{"🏆".repeat(Math.min(t.cups,5))}{t.cups>5&&<span style={{fontSize:11,color:C.sand}}>×{t.cups}</span>}</div>}
                {t.crowns>0&&<div>{"👑".repeat(Math.min(t.crowns,5))}{t.crowns>5&&<span style={{fontSize:11,color:C.king}}>×{t.crowns}</span>}</div>}
                {!has&&<span style={{fontSize:11,color:C.sub}}>нет наград</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoPickerPopup({ player, onSave, onClose }) {
  const fileRef=useRef();
  const handleFile=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{onSave(ev.target.result);onClose();};
    reader.readAsDataURL(file);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:400,
      display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
      <div style={{background:"#161626",borderRadius:18,padding:24,width:"100%",maxWidth:300,
        border:"1px solid "+C.border,boxShadow:"0 24px 60px #000",textAlign:"center"}}
        onClick={e=>e.stopPropagation()}>
        <div style={{marginBottom:14}}><Avatar player={player} size={72}/></div>
        <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:4}}>{player.name}</div>
        <div style={{fontSize:12,color:C.sub,marginBottom:20}}>Фото профиля</div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
        <button onClick={()=>fileRef.current.click()} style={{...btn(C.accent),width:"100%",marginBottom:10}}>📷 Загрузить фото</button>
        {player.photo&&(
          <button onClick={()=>{onSave(null);onClose();}}
            style={{...btn(C.cardHi),width:"100%",color:C.red,border:"1px solid "+C.border,marginBottom:10}}>
            🗑 Удалить фото
          </button>
        )}
        <button onClick={onClose} style={{...btn(C.cardHi),width:"100%",color:C.sub,border:"1px solid "+C.border}}>Отмена</button>
      </div>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
      <div style={{fontSize:56,marginBottom:16}}>🏖️</div>
      <div style={{fontSize:20,fontWeight:900,color:C.text,marginBottom:8}}>
        Beach <span style={{color:C.sand}}>2×2</span>
      </div>
      <div style={{fontSize:13,color:C.sub}}>Loading...</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("ru");
  const t = T[lang];




  // Firebase state
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [dayLinks, setDayLinks] = useState({});

  const [tab, setTab] = useState("game");
  const [newName, setNewName] = useState("");
  const [sessionIds, setSessionIds] = useState([]);
  const [matchDate, setMatchDate] = useState(today());
  const [t1p1,setT1p1]=useState(""); const [t1p2,setT1p2]=useState("");
  const [t2p1,setT2p1]=useState(""); const [t2p2,setT2p2]=useState("");
  const [score1,setScore1]=useState(""); const [score2,setScore2]=useState("");
  const [rankMode, setRankMode] = useState("games");
  const [dayFilter, setDayFilter] = useState("all");
  const [dayDetailDay, setDayDetailDay] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [showTrophies, setShowTrophies] = useState(false);
  const [photoPickerPlayer, setPhotoPickerPlayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingLinkDay, setEditingLinkDay] = useState(null);
  const [linkInput, setLinkInput] = useState("");

  // ── Firebase listeners ────────────────────────────────────────────────────
  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => { loadedCount++; if(loadedCount>=2) setLoading(false); };

    const unsubPlayers = onSnapshot(collection(db,"players"), snap => {
      setPlayers(snap.docs.map(d=>({id:d.id,...d.data()})));
      checkLoaded();
    });
    const unsubMatches = onSnapshot(collection(db,"matches"), snap => {
      const ms = snap.docs.map(d=>({id:d.id,...d.data()}));
      ms.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
      setMatches(ms);
      // extract dayLinks
      const links = {};
      ms.forEach(m=>{ if(m.dayLink) links[m.date]=m.dayLink; });
      checkLoaded();
    });
    const unsubLinks = onSnapshot(collection(db,"dayLinks"), snap => {
      const links = {};
      snap.docs.forEach(d=>{ links[d.id]=d.data().url; });
      setDayLinks(links);
    });
    return () => { unsubPlayers(); unsubMatches(); unsubLinks(); };
  }, []);

  // ── Firebase write helpers ────────────────────────────────────────────────
  const fbAddPlayer = async (name) => {
    const id = uid();
    await setDoc(doc(db,"players",id), {name, photo:null, createdAt:Date.now()});
  };
  const fbUpdatePlayer = async (id, data) => {
    await updateDoc(doc(db,"players",id), data);
  };
  const fbDeletePlayer = async (id) => {
    await deleteDoc(doc(db,"players",id));
  };
  const fbAddMatch = async (matchData) => {
    const id = uid();
    await setDoc(doc(db,"matches",id), {...matchData, id, createdAt:Date.now()});
  };
  const fbUpdateMatch = async (id, data) => {
    await updateDoc(doc(db,"matches",id), data);
  };
  const fbDeleteMatch = async (id) => {
    await deleteDoc(doc(db,"matches",id));
  };
  const fbSetDayLink = async (date, url) => {
    await setDoc(doc(db,"dayLinks",date), {url});
  };

  const pendingCount = matches.filter(m=>m.pending).length;

  const addPlayer = async () => {
    const n=newName.trim();
    if(!n||players.find(p=>p.name.toLowerCase()===n.toLowerCase())) return;
    await fbAddPlayer(n); setNewName("");
  };

  const sessionPlayers = players.filter(p=>sessionIds.includes(p.id));
  const toggleSession = id => setSessionIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);

  const matchValid = t1p1&&t1p2&&t2p1&&t2p2&&new Set([t1p1,t1p2,t2p1,t2p2]).size===4
    &&score1!==""&&score2!==""&&parseInt(score1)!==parseInt(score2);

  const saveMatch = async () => {
    if(!matchValid) return;
    await fbAddMatch({date:matchDate,t1p1,t1p2,t2p1,t2p2,
      score1:parseInt(score1),score2:parseInt(score2),pending:!isAdmin});
    setScore1("");setScore2("");setT1p1("");setT1p2("");setT2p1("");setT2p2("");
  };

  const approveMatch = async id => await fbUpdateMatch(id,{pending:false});
  const approveAll = async () => {
    for(const m of matches.filter(m=>m.pending)) await fbUpdateMatch(m.id,{pending:false});
  };

  const gameDays = useMemo(()=>[...new Set(matches.map(m=>m.date))].sort((a,b)=>b.localeCompare(a)),[matches]);
  const filteredMatches = useMemo(()=>dayFilter==="all"?matches:matches.filter(m=>m.date===dayFilter),[matches,dayFilter]);
  const stats = useMemo(()=>computeStats(players,filteredMatches),[players,filteredMatches]);
  const trophies = useMemo(()=>computeTrophies(players,matches),[players,matches]);

  const sortedPlayers = useMemo(()=>[...players].sort((a,b)=>{
    const sa=stats[a.id]||{wins:0,games:0,scored:0,conceded:0};
    const sb=stats[b.id]||{wins:0,games:0,scored:0,conceded:0};
    if(rankMode==="games"){
      if(sb.wins!==sa.wins) return sb.wins-sa.wins;
      return (sb.games?sb.wins/sb.games:0)-(sa.games?sa.wins/sa.games:0);
    } else {
      const da=sa.scored-sa.conceded,db=sb.scored-sb.conceded;
      return db!==da?db-da:sb.scored-sa.scored;
    }
  }),[players,stats,rankMode]);

  const suggestions = useMemo(()=>generatePairings(sessionPlayers).slice(0,6),[sessionPlayers]);
  const pObj = id=>players.find(p=>p.id===id)||{name:"?",photo:null};
  const medal = i=>i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
  const tabStyle = on=>({flex:1,padding:"11px 0",border:"none",
    background:on?C.card:"transparent",color:on?C.sand:C.sub,
    borderTop:on?`2px solid ${C.sand}`:"2px solid transparent",
    fontFamily:"'Outfit',sans-serif",fontWeight:on?700:500,fontSize:12,cursor:"pointer"});
  const sel={...inp,appearance:"none"};

  if(loading) return <LoadingScreen/>;

  return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>

      {showAdminPopup&&<AdminPopup onSuccess={()=>{setIsAdmin(true);setShowAdminPopup(false);}} onClose={()=>setShowAdminPopup(false)}/>}
      {editingMatch&&<EditMatchPopup match={editingMatch} players={players}
        onSave={async u=>{await fbUpdateMatch(u.id,u);setEditingMatch(null);}}
        onClose={()=>setEditingMatch(null)}/>}
      {dayDetailDay&&<DayDetailPopup day={dayDetailDay} matches={matches} players={players} onClose={()=>setDayDetailDay(null)}/>}
      {showTrophies&&<TrophyBoard players={players} trophies={trophies} onClose={()=>setShowTrophies(false)}/>}
      {photoPickerPlayer&&<PhotoPickerPopup player={photoPickerPlayer}
        onSave={async photo=>{await fbUpdatePlayer(photoPickerPlayer.id,{photo});setPhotoPickerPlayer(null);}}
        onClose={()=>setPhotoPickerPlayer(null)}/>}

      {deleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:400,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setDeleteConfirm(null)}>
          <div style={{background:"#161626",borderRadius:16,padding:22,width:"100%",maxWidth:300,
            border:"1px solid "+C.border,boxShadow:"0 24px 60px #000"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:22,textAlign:"center",marginBottom:8}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:800,textAlign:"center",marginBottom:8}}>{t.deleteTitle}</div>
            <div style={{fontSize:12,color:C.sub,textAlign:"center",marginBottom:18}}>
              {players.find(p=>p.id===deleteConfirm)?.name} {t.deleteDesc}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{...btn(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
              <button onClick={async()=>{await fbDeletePlayer(deleteConfirm);setSessionIds(ids=>ids.filter(id=>id!==deleteConfirm));setDeleteConfirm(null);}}
                style={{...btn(C.red),flex:1}}>{t.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0D0D1A,#1a1a35)",
        padding:"10px 16px 8px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/icon.jpg" alt="Beach 2x2"
              style={{width:38,height:38,borderRadius:10,objectFit:"cover",flexShrink:0}}/>
            <div>
              <div style={{fontSize:17,fontWeight:900,letterSpacing:-0.5}}>
                Beach <span style={{color:C.sand}}>2×2</span>
              </div>
              <div style={{fontSize:10,color:C.sub}}>{matches.length} {t.matches} · {players.length} {t.players}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setShowTrophies(true)}
              style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:20,
                padding:"5px 8px",color:C.sand,fontSize:12,cursor:"pointer",fontWeight:700}}>🏆</button>
            {isAdmin?(
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                {pendingCount>0&&(
                  <div style={{fontSize:10,fontWeight:800,color:C.pending,background:C.pending+"22",
                    border:"1px solid "+C.pending+"55",borderRadius:20,padding:"3px 7px",cursor:"pointer"}}
                    onClick={()=>setTab("history")}>⏳{pendingCount}</div>
                )}
                <div style={{fontSize:10,fontWeight:700,color:C.sand,background:C.sand+"22",
                  border:"1px solid "+C.sand+"55",borderRadius:20,padding:"3px 8px"}}>🔑 ADMIN</div>
                <button onClick={()=>setIsAdmin(false)}
                  style={{background:"none",border:"none",color:C.sub,fontSize:10,cursor:"pointer"}}>{t.logout}</button>
              </div>
            ):(
              <button onClick={()=>setShowAdminPopup(true)}
                style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:20,
                  padding:"5px 10px",color:C.sub,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t.adminBtn}</button>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["ru","🇷🇺 RU"],["lv","🇱🇻 LV"],["en","🇬🇧 EN"]].map(([code,label])=>(
            <button key={code} onClick={()=>setLang(code)}
              style={{background:lang===code?C.sand+"22":C.cardHi,
                border:"1.5px solid "+(lang===code?C.sand:C.border),
                borderRadius:20,padding:"3px 10px",
                color:lang===code?C.sand:C.sub,fontSize:11,fontWeight:700,
                cursor:"pointer"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",background:"#0D0D1A",borderBottom:"1px solid "+C.border}}>
        {[["game",t.tabGame],["stats",t.tabStats],["history",t.tabHistory]].map(([k,l])=>(
          <button key={k} style={tabStyle(tab===k)} onClick={()=>setTab(k)}>
            {l}{k==="history"&&pendingCount>0&&(
              <span style={{marginLeft:5,background:C.pending,color:"#fff",borderRadius:10,
                fontSize:10,fontWeight:800,padding:"1px 5px"}}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{flex:1,padding:"12px 12px 80px",overflowY:"auto"}}>

        {/* ══ GAME ══ */}
        {tab==="game"&&(<>
          <div style={card}>
            <div style={lbl}>{t.addPlayer}</div>
            <div style={{display:"flex",gap:8}}>
              <input style={{...inp,flex:1}} placeholder={t.playerPlaceholder} value={newName}
                onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPlayer()}/>
              <button style={btn(C.accent)} onClick={addPlayer}>+</button>
            </div>
          </div>

          {players.length>0&&(
            <div style={card}>
              <div style={lbl}>{t.playing} ({sessionIds.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {players.map(p=>{
                  const on=sessionIds.includes(p.id);
                  return (
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,
                      background:on?avatarColor(p.name)+"33":C.cardHi,
                      border:`1.5px solid ${on?avatarColor(p.name):C.border}`,
                      borderRadius:20,padding:"5px 12px 5px 6px",cursor:"pointer"}}
                      onClick={()=>toggleSession(p.id)}>
                      <div onClick={e=>{if(isAdmin){e.stopPropagation();setPhotoPickerPlayer(p);}}}>
                        <Avatar player={p} size={22}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:on?C.text:C.sub}}>{p.name}</span>
                      {isAdmin&&(
                        <span onClick={e=>{e.stopPropagation();setDeleteConfirm(p.id);}}
                          style={{marginLeft:4,fontSize:11,color:C.sub,cursor:"pointer",opacity:0.6}}>×</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestions.length>0&&(
            <div style={card}>
              <div style={lbl}>{t.suggestions}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {suggestions.map(([a,b,c,d],i)=>(
                  <div key={i} onClick={()=>(setT1p1(a.id),setT1p2(b.id),setT2p1(c.id),setT2p2(d.id))}
                    style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",
                      background:C.cardHi,borderRadius:9,padding:"8px 10px",fontSize:13,
                      cursor:"pointer",border:"1px solid "+C.border}}>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <Avatar player={a} size={22}/><Avatar player={b} size={22}/>
                      <span style={{fontWeight:700,marginLeft:3}}>{a.name} & {b.name}</span>
                    </div>
                    <span style={{color:C.sub,fontWeight:900}}>vs</span>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <Avatar player={c} size={22}/><Avatar player={d} size={22}/>
                      <span style={{fontWeight:700,marginLeft:3}}>{c.name} & {d.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{...card,border:"1px solid "+(isAdmin?C.sand+"30":C.pending+"30")}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={lbl}>{t.recordMatch}</div>
              {!isAdmin&&<div style={{fontSize:10,color:C.pending,fontWeight:700,
                background:C.pending+"22",borderRadius:10,padding:"2px 8px"}}>{t.pending}</div>}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{...lbl,marginBottom:4}}>{t.date}</div>
              <input type="date" style={inp} value={matchDate} onChange={e=>setMatchDate(e.target.value)}/>
            </div>
            <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:8,borderLeft:"3px solid "+C.sky}}>
              <div style={{...lbl,color:C.sky}}>{t.team1}</div>
              <div style={{display:"flex",gap:6}}>
                <select style={{...sel,flex:1}} value={t1p1} onChange={e=>setT1p1(e.target.value)}>
                  <option value="">{t.player1}</option>
                  {sessionPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select style={{...sel,flex:1}} value={t1p2} onChange={e=>setT1p2(e.target.value)}>
                  <option value="">{t.player2}</option>
                  {sessionPlayers.filter(p=>p.id!==t1p1).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:14,borderLeft:"3px solid "+C.red}}>
              <div style={{...lbl,color:C.red}}>{t.team2}</div>
              <div style={{display:"flex",gap:6}}>
                <select style={{...sel,flex:1}} value={t2p1} onChange={e=>setT2p1(e.target.value)}>
                  <option value="">{t.player1}</option>
                  {sessionPlayers.filter(p=>![t1p1,t1p2].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select style={{...sel,flex:1}} value={t2p2} onChange={e=>setT2p2(e.target.value)}>
                  <option value="">{t.player2}</option>
                  {sessionPlayers.filter(p=>![t1p1,t1p2,t2p1].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:14}}>
              <ScoreInput val={score1} setVal={setScore1} color={C.sky} label="КОМ. 1"/>
              <div style={{fontSize:22,fontWeight:900,color:C.sub,paddingTop:18}}>:</div>
              <ScoreInput val={score2} setVal={setScore2} color={C.red} label="КОМ. 2"/>
            </div>
            {score1!==""&&score2!==""&&parseInt(score1)===parseInt(score2)&&(
              <div style={{textAlign:"center",color:C.sand,fontSize:12,marginBottom:8}}>{t.noTie}</div>
            )}
            <button style={{...btn(matchValid?(isAdmin?C.sand:C.pending):C.border),width:"100%",
              color:matchValid?"#0D0D1A":C.sub,opacity:matchValid?1:0.6}} onClick={saveMatch}>
              {isAdmin?t.saveMatch:t.sendReview}
            </button>
          </div>

          {players.length>0&&(
            <div style={card}>
              <div style={{...lbl,marginBottom:10}}>{t.roster}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                {players.map(p=>(
                  <div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:56}}>
                    <div style={{position:"relative"}}>
                      <Avatar player={p} size={46} onClick={isAdmin?()=>setPhotoPickerPlayer(p):undefined}/>
                      {isAdmin&&<div style={{position:"absolute",bottom:-2,right:-2,
                        background:C.accent,borderRadius:"50%",width:16,height:16,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:9,cursor:"pointer"}} onClick={()=>setPhotoPickerPlayer(p)}>📷</div>}
                    </div>
                    <div style={{fontSize:10,fontWeight:700,textAlign:"center",color:C.text,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:56}}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* ══ STATS ══ */}
        {tab==="stats"&&(<>
          <div style={{...card,padding:"10px 12px"}}>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[["games",t.rankGames,t.rankGamesHint,C.green],
                ["king",t.rankKing,t.rankKingHint,C.king]].map(([mode,label,hint,ac])=>{
                const on=rankMode===mode;
                return (
                  <div key={mode} onClick={()=>setRankMode(mode)} style={{
                    flex:1,textAlign:"center",borderRadius:10,padding:"9px 6px",
                    background:on?ac+"22":C.cardHi,border:`1.5px solid ${on?ac:C.border}`,cursor:"pointer"}}>
                    <div style={{fontSize:15,fontWeight:900,color:on?ac:C.sub}}>{label}</div>
                    <div style={{fontSize:10,color:on?ac+"cc":C.sub,marginTop:2}}>{hint}</div>
                  </div>
                );
              })}
            </div>
            <div style={lbl}>ПЕРИОД <span style={{fontWeight:400,fontSize:10,color:C.sub}}>· ℹ️ для деталей дня</span></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["all",...gameDays].map(d=>{
                const on=dayFilter===d;
                return (
                  <div key={d} style={{display:"flex",alignItems:"center"}}>
                    <div onClick={()=>setDayFilter(d)} style={{
                      borderRadius:d==="all"?20:"20px 0 0 20px",padding:"5px 10px",
                      background:on?C.sky+"33":C.cardHi,border:`1.5px solid ${on?C.sky:C.border}`,
                      fontSize:12,fontWeight:700,color:on?C.sky:C.sub,cursor:"pointer",whiteSpace:"nowrap",
                      borderRight:d!=="all"?"none":undefined}}>
                      {d==="all"?t.allTime:fmtDate(d)}
                    </div>
                    {d!=="all"&&(
                      <div onClick={()=>setDayDetailDay(d)} style={{
                        borderRadius:"0 20px 20px 0",padding:"5px 8px",
                        background:C.cardHi,border:`1.5px solid ${C.border}`,
                        fontSize:11,color:C.sub,cursor:"pointer",borderLeft:"none"}}>ℹ️</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {filteredMatches.length>0&&(
            <div style={{...card,background:C.cardHi,padding:"10px 16px",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.sub,fontWeight:600}}>
                {dayFilter==="all"?t.totalMatches:`${t.matchesOf} ${fmtDate(dayFilter)}`}
              </div>
              <div style={{fontSize:22,fontWeight:900,color:C.sand}}>{filteredMatches.length}</div>
            </div>
          )}

          {sortedPlayers.length===0&&(
            <div style={{textAlign:"center",color:C.sub,marginTop:60}}>
              <div style={{fontSize:48}}>🏖️</div>
              <div style={{marginTop:8}}>{t.noPlayers}</div>
            </div>
          )}

          {sortedPlayers.map((p,i)=>{
            const st=stats[p.id]||{wins:0,losses:0,games:0,scored:0,conceded:0};
            const diff=st.scored-st.conceded;
            const wr=st.games?Math.round(st.wins/st.games*100):0;
            const isKing=rankMode==="king";
            const bigVal=isKing?(diff>=0?`+${diff}`:diff):st.wins;
            const bigColor=isKing?(diff>0?C.king:diff<0?C.red:C.sub):C.green;
            const bigLabel=isKing?"±ОЧКИ":"ПОБЕДЫ";
            const barPct=isKing?Math.min(100,Math.max(0,50+diff*3)):wr;
            const barColor=isKing?(diff>0?C.king:diff<0?C.red:C.sub):(wr>=60?C.green:wr>=40?C.sand:C.red);
            const tr=trophies[p.id]||{cups:0,crowns:0};
            return (
              <div key={p.id} style={{...card,border:i===0?`1px solid ${isKing?C.king:C.green}55`:"1px solid "+C.border}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{position:"relative"}}>
                    <Avatar player={p} size={46}/>
                    <div style={{position:"absolute",bottom:-3,right:-3,fontSize:i<3?14:10,
                      background:C.bg,borderRadius:"50%",padding:"1px 2px"}}>{medal(i)}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{fontSize:16,fontWeight:800}}>{p.name}</div>
                      {tr.cups>0&&<span style={{fontSize:12}}>{"🏆".repeat(Math.min(tr.cups,3))}{tr.cups>3?`+${tr.cups-3}`:""}</span>}
                      {tr.crowns>0&&<span style={{fontSize:12}}>{"👑".repeat(Math.min(tr.crowns,3))}{tr.crowns>3?`+${tr.crowns-3}`:""}</span>}
                    </div>
                    <div style={{fontSize:11,color:C.sub,marginTop:1}}>
                      {st.games} {st.games===1?"игра":st.games<5?"игры":"игр"} · {wr}% побед
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:2,marginTop:6}}>
                      <div style={{height:"100%",width:`${barPct}%`,borderRadius:2,background:barColor,transition:"width .5s"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"center",minWidth:54}}>
                    <div style={{fontSize:26,fontWeight:900,color:bigColor,lineHeight:1}}>{bigVal}</div>
                    <div style={{fontSize:9,color:C.sub,letterSpacing:0.8,marginTop:3}}>{bigLabel}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-around",marginTop:12,
                  paddingTop:10,borderTop:"1px solid "+C.border}}>
                  {[[st.wins,"ПОБЕДЫ",C.green],[st.losses,"ПОРАЖ.",C.red],[st.games,"ИГРЫ",C.sub],
                    [st.scored,"ЗАБИЛ",C.sky],[st.conceded,"ПРОП.",C.sub],
                    [diff>=0?`+${diff}`:diff,"±",diff>0?C.green:diff<0?C.red:C.sub]
                  ].map(([v,l2,c])=>(
                    <div key={l2} style={{textAlign:"center"}}>
                      <div style={{fontSize:16,fontWeight:900,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                      <div style={{fontSize:9,color:C.sub,letterSpacing:0.7,marginTop:1}}>{l2}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>)}

        {/* ══ HISTORY ══ */}
        {tab==="history"&&(<>
          {isAdmin&&pendingCount>0&&(
            <div style={{...card,background:C.pending+"18",border:"1px solid "+C.pending+"55",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:C.pending}}>{t.pendingLabel} {pendingCount}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{t.pendingDesc}</div>
              </div>
              <button onClick={approveAll} style={{...btn(C.pending,true),color:"#fff"}}>{t.approveAll}</button>
            </div>
          )}

          {matches.length===0&&(
            <div style={{textAlign:"center",color:C.sub,marginTop:60}}>
              <div style={{fontSize:48}}>📋</div>
              <div style={{marginTop:8}}>{t.noMatches}</div>
            </div>
          )}

          {gameDays.map(day=>{
            const dm=matches.filter(m=>m.date===day);
            const link=dayLinks[day];
            return (
              <div key={day}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,marginTop:4}}>
                  <div style={{fontSize:12,color:C.sand,fontWeight:700,letterSpacing:0.8,flex:1}}>
                    📅 {fmtDate(day)} · {dm.length} матч{dm.length===1?"":"ей"}
                  </div>
                  {link&&(
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:C.sky,fontWeight:700,textDecoration:"none",
                        background:C.sky+"22",borderRadius:20,padding:"3px 9px",
                        border:"1px solid "+C.sky+"44",whiteSpace:"nowrap"}}>🎬 Видео</a>
                  )}
                  {isAdmin&&(
                    editingLinkDay===day?(
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        <input autoFocus value={linkInput} onChange={e=>setLinkInput(e.target.value)}
                          placeholder="https://..."
                          onKeyDown={async e=>{
                            if(e.key==="Enter"){await fbSetDayLink(day,linkInput.trim());setEditingLinkDay(null);}
                            if(e.key==="Escape") setEditingLinkDay(null);
                          }}
                          style={{...inp,padding:"4px 8px",fontSize:11,width:160,borderRadius:8}}/>
                        <button onClick={async()=>{await fbSetDayLink(day,linkInput.trim());setEditingLinkDay(null);}}
                          style={{...btn(C.green,true),padding:"4px 8px",fontSize:11}}>✓</button>
                        <button onClick={()=>setEditingLinkDay(null)}
                          style={{...btn(C.cardHi,true),padding:"4px 8px",fontSize:11,color:C.sub,border:"1px solid "+C.border}}>✕</button>
                      </div>
                    ):(
                      <button onClick={()=>{setEditingLinkDay(day);setLinkInput(link||"");}}
                        style={{background:"none",border:"1px solid "+C.border,borderRadius:20,
                          padding:"3px 8px",color:C.sub,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
                        {link?"✏️":t.videoLink}
                      </button>
                    )
                  )}
                </div>
                {dm.map(m=>{
                  const w1=m.score1>m.score2;
                  return (
                    <div key={m.id} style={{...card,
                      borderColor:m.pending?C.pending:C.border,
                      background:m.pending?C.pending+"0a":C.card}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        {m.pending?(
                          <div style={{fontSize:10,fontWeight:800,color:C.pending,
                            background:C.pending+"22",borderRadius:10,padding:"2px 8px"}}>{t.pending}</div>
                        ):<div/>}
                        {isAdmin&&(
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            {m.pending&&(
                              <button onClick={()=>approveMatch(m.id)}
                                style={{...btn(C.green,true),fontSize:10,padding:"3px 10px"}}>{t.approveOne}</button>
                            )}
                            <button onClick={()=>setEditingMatch(m)}
                              style={{background:"none",border:"1px solid "+C.border,borderRadius:6,
                                color:C.sub,cursor:"pointer",fontSize:11,padding:"2px 8px"}}>✏️</button>
                            <button onClick={()=>fbDeleteMatch(m.id)}
                              style={{background:"none",border:"none",color:C.border,cursor:"pointer",fontSize:14}}>✕</button>
                          </div>
                        )}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:4,marginBottom:4}}>
                            <Avatar player={pObj(m.t1p1)} size={26}/><Avatar player={pObj(m.t1p2)} size={26}/>
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:w1?C.green:C.sub}}>
                            {pObj(m.t1p1).name} & {pObj(m.t1p2).name}
                          </div>
                          {w1&&<div style={{fontSize:10,color:C.green,fontWeight:700}}>🏆 ПОБЕДА</div>}
                        </div>
                        <div style={{textAlign:"center",flexShrink:0}}>
                          <div style={{fontSize:24,fontWeight:900,letterSpacing:-1}}>
                            <span style={{color:w1?C.green:C.red}}>{m.score1}</span>
                            <span style={{color:C.sub}}> : </span>
                            <span style={{color:!w1?C.green:C.red}}>{m.score2}</span>
                          </div>
                        </div>
                        <div style={{flex:1,textAlign:"right"}}>
                          <div style={{display:"flex",gap:4,marginBottom:4,justifyContent:"flex-end"}}>
                            <Avatar player={pObj(m.t2p1)} size={26}/><Avatar player={pObj(m.t2p2)} size={26}/>
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:!w1?C.green:C.sub}}>
                            {pObj(m.t2p1).name} & {pObj(m.t2p2).name}
                          </div>
                          {!w1&&<div style={{fontSize:10,color:C.green,fontWeight:700}}>🏆 ПОБЕДА</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>)}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,background:"#0D0D1A",
        borderTop:"1px solid "+C.border,padding:"7px 16px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.sub}}>🏖️ Beach 2×2</span>
        <span style={{fontSize:11,color:isAdmin?C.sand:C.sub,fontWeight:700}}>
          {isAdmin?t.adminMode:t.viewMode}
        </span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { width:100%; min-height:100vh; background:#0D0D1A; }
        body { overflow-x:hidden; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input::placeholder { color:#7070A0; }
        select option { background:#161626; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#2A2A45; border-radius:2px; }
      `}</style>
    </div>
  );
}
