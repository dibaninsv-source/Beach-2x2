import { useState, useMemo, useRef, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, getDocs, query, where
} from "firebase/firestore";

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const SUPER_ADMIN_PASSWORD = "132333";

const SPORTS = [
  { id:"beach_volleyball", emoji:"🏐", name:"Beach Volleyball", color:"#2EC4B6" },
  { id:"beach_tennis",     emoji:"🎾", name:"Beach Tennis",     color:"#F7C948" },
  { id:"padel",            emoji:"🏓", name:"Padel",            color:"#3DDC97" },
  { id:"tennis",           emoji:"🎽", name:"Tennis",           color:"#FF6B35" },
];


// Sports that use sets/games scoring instead of points
const TENNIS_SPORTS = ["tennis","padel","beach_tennis"];
const isTennisSport = id => TENNIS_SPORTS.includes(id);

// Parse tennis score string like "6:3 6:4" -> winner
// Returns 1 if team1 wins, 2 if team2 wins, 0 if unclear
function parseTennisWinner(setsStr) {
  if (!setsStr || !setsStr.trim()) return 0;
  const sets = setsStr.trim().split(/\s+/);
  let w1=0, w2=0;
  for (const s of sets) {
    const parts = s.split(":");
    if (parts.length !== 2) continue;
    const a = parseInt(parts[0]), b = parseInt(parts[1]);
    if (isNaN(a)||isNaN(b)) continue;
    if (a > b) w1++; else if (b > a) w2++;
  }
  if (w1 > w2) return 1;
  if (w2 > w1) return 2;
  return 0;
}

// Convert sets array [{a,b}] to string "6:3 6:4"
function setsToString(sets) {
  return sets.filter(s=>s.a!==""||s.b!=="").map(s=>`${s.a||0}:${s.b||0}`).join(" ");
}

const AVATAR_COLORS = ["#FF6B35","#F7C948","#2EC4B6","#E94F7C","#6C63FF","#3DDC97","#FF9F1C","#00B4D8","#EF476F","#06D6A0"];
const avatarColor = name => AVATAR_COLORS[(name.charCodeAt(0)+name.length) % AVATAR_COLORS.length];

const C = {
  bg:"#0D0D1A", card:"#161626", cardHi:"#1E1E35", border:"#2A2A45",
  sand:"#F7C948", sky:"#2EC4B6", red:"#FF6B6B", green:"#3DDC97",
  text:"#E8E8F0", sub:"#7070A0", accent:"#6C63FF", king:"#FFB347", pending:"#FF8C42"
};

const LANG = {
  ru:{
    selectSport:"Выберите вид спорта",
    teams:"Команды", createTeam:"+ Создать команду", joinTeam:"Войти в команду",
    teamName:"Название команды", teamPassword:"Пароль команды",
    create:"Создать", join:"Войти", cancel:"Отмена",
    captainHint:"Вы станете капитаном этой команды",
    passwordHint:"Пароль для входа игроков",
    enterPassword:"Введите пароль команды",
    wrongPassword:"Неверный пароль",
    noTeams:"Команд пока нет. Создайте первую!",
    back:"← Назад",
    addPlayer:"ДОБАВИТЬ ИГРОКА", playerPlaceholder:"Имя игрока",
    playing:"КТО ИГРАЕТ СЕГОДНЯ", viewOnly:"просмотр",
    suggestions:"💡 ВАРИАНТЫ ПАР",
    recordMatch:"ЗАПИСАТЬ МАТЧ", date:"ДАТА",
    sets:"СЕТЫ (например: 6:3 6:4)",setsPlaceholder:"6:3 6:4",setsHint:"Введи счёт по сетам через пробел",
    team1:"КОМАНДА 1", team2:"КОМАНДА 2", p1:"Игрок 1", p2:"Игрок 2",
    noTie:"⚠️ Ничья не допускается",
    save:"✓ Сохранить", sendReview:"⏳ Отправить на проверку",
    pendingTag:"⏳ На проверке",
    pendingBanner:"⏳ Ждут проверки", pendingDesc:"Игры добавленные игроками",
    approveAll:"✓ Все OK", approveOne:"✓ OK",
    noMatches:"Нет матчей. Запишите первый!",
    tabGame:"⚡ Игра", tabStats:"📊 Статы", tabHistory:"📋 История",
    allTime:"Всё время", totalMatches:"Всего матчей", matchesOf:"Матчей",
    wins:"ПОБЕДЫ", losses:"ПОРАЖ.", games:"ИГРЫ", scored:"ЗАБИЛ", conceded:"ПРОП.", pm:"±",
    winRate:"побед", gamesLabel:(n)=>n===1?"игра":n<5?"игры":"игр",
    rankGames:"🏆 Games", rankGamesHint:"Кто больше выиграл игр",
    rankKing:"👑 King", rankKingHint:"Кто больше в ±очках",
    period:"ПЕРИОД", periodHint:"· ℹ️ детали дня",
    noPlayers:"Добавь игроков на вкладке «Игра»",
    roster:"👥 СОСТАВ", trophyTitle:"🏆 Доска наград",
    gamesWinner:"= победитель Games", kingWinner:"= победитель King",
    noAwards:"нет наград", dayResults:"ИТОГИ ДНЯ", victory:"🏆 ПОБЕДА",
    captainMode:"🔑 Капитан", viewMode:"👁 Просмотр", superMode:"👑 Супер-Админ",
    captainBtn:"🔑 Капитан", logout:"выйти",
    deleteTitle:"Удалить игрока?", deleteDesc:"будет удалён",
    deleteBtn:"Удалить", photoTitle:"Фото профиля",
    uploadPhoto:"📷 Загрузить фото", deletePhoto:"🗑 Удалить фото",
    editMatchTitle:"✏️ Редактировать матч",
    videoAdd:"+ видео", videoLink:"🎬 Видео",
    loading:"Загрузка...", matches:"матчей", players:"игроков",
    superAdminTitle:"Супер-Админ", superAdminHint:"Главный администратор платформы",
    deleteTeam:"🗑 Удалить команду", confirmDeleteTeam:"Удалить эту команду и все данные?",
    teamPublic:"🌍 Открытая", teamPrivate:"🔒 Закрытая",
    teamPublicHint:"Все могут смотреть без пароля", teamPrivateHint:"Нужен пароль для просмотра",
    privateTag:"🔒 Закрытая", publicTag:"🌍 Открытая",
  },
  lv:{
    selectSport:"Izvēlies sporta veidu",
    teams:"Komandas", createTeam:"+ Izveidot komandu", joinTeam:"Pievienoties",
    teamName:"Komandas nosaukums", teamPassword:"Komandas parole",
    create:"Izveidot", join:"Ienākt", cancel:"Atcelt",
    captainHint:"Jūs kļūsiet par šīs komandas kapteini",
    passwordHint:"Parole spēlētāju ienākšanai",
    enterPassword:"Ievadiet komandas paroli",
    wrongPassword:"Nepareiza parole",
    noTeams:"Komandu vēl nav. Izveidojiet pirmo!",
    back:"← Atpakaļ",
    addPlayer:"PIEVIENOT SPĒLĒTĀJU", playerPlaceholder:"Spēlētāja vārds",
    playing:"KAS SPĒLĒ ŠODIEN", viewOnly:"skatīties",
    suggestions:"💡 KOMANDU VARIANTI",
    recordMatch:"IERAKSTĪT SPĒLI", date:"DATUMS",
    sets:"SETI (piemēram: 6:3 6:4)",setsPlaceholder:"6:3 6:4",setsHint:"Ievadi setu rezultātus ar atstarpi",
    team1:"KOMANDA 1", team2:"KOMANDA 2", p1:"Spēlētājs 1", p2:"Spēlētājs 2",
    noTie:"⚠️ Neizšķirts nav atļauts",
    save:"✓ Saglabāt", sendReview:"⏳ Nosūtīt pārbaudei",
    pendingTag:"⏳ Pārbaude",
    pendingBanner:"⏳ Gaida pārbaudi", pendingDesc:"Spēles pievienotas spēlētājiem",
    approveAll:"✓ Viss OK", approveOne:"✓ OK",
    noMatches:"Nav spēļu. Ierakstiet pirmo!",
    tabGame:"⚡ Spēle", tabStats:"📊 Statistika", tabHistory:"📋 Vēsture",
    allTime:"Viss laiks", totalMatches:"Kopā spēles", matchesOf:"Spēles",
    wins:"UZVARAS", losses:"ZAUD.", games:"SPĒLES", scored:"IEMESTI", conceded:"IELAISTI", pm:"±",
    winRate:"uzvaras", gamesLabel:(n)=>n===1?"spēle":"spēles",
    rankGames:"🏆 Games", rankGamesHint:"Kurš uzvarēja vairāk",
    rankKing:"👑 King", rankKingHint:"Kurš labāks ±punktos",
    period:"PERIODS", periodHint:"· ℹ️ detaļas",
    noPlayers:"Pievieno spēlētājus cilnē «Spēle»",
    roster:"👥 SASTĀVS", trophyTitle:"🏆 Apbalvojumi",
    gamesWinner:"= Games uzvarētājs", kingWinner:"= King uzvarētājs",
    noAwards:"nav apbalvojumu", dayResults:"DIENAS REZULTĀTI", victory:"🏆 UZVARA",
    captainMode:"🔑 Kapteinis", viewMode:"👁 Skatīties", superMode:"👑 Super-Admin",
    captainBtn:"🔑 Kapteinis", logout:"iziet",
    deleteTitle:"Dzēst spēlētāju?", deleteDesc:"tiks dzēsts",
    deleteBtn:"Dzēst", photoTitle:"Profila foto",
    uploadPhoto:"📷 Foto", deletePhoto:"🗑 Dzēst foto",
    editMatchTitle:"✏️ Rediģēt spēli",
    videoAdd:"+ video", videoLink:"🎬 Video",
    loading:"Ielādē...", matches:"spēles", players:"spēlētāji",
    superAdminTitle:"Super-Admin", superAdminHint:"Galvenais platformas administrators",
    deleteTeam:"🗑 Dzēst komandu", confirmDeleteTeam:"Dzēst šo komandu un visus datus?",
    teamPublic:"🌍 Atklāta", teamPrivate:"🔒 Slēgta",
    teamPublicHint:"Visi var skatīties bez paroles", teamPrivateHint:"Vajag paroli lai skatītos",
    privateTag:"🔒 Slēgta", publicTag:"🌍 Atklāta",
  },
  en:{
    selectSport:"Choose your sport",
    teams:"Teams", createTeam:"+ Create team", joinTeam:"Join team",
    teamName:"Team name", teamPassword:"Team password",
    create:"Create", join:"Join", cancel:"Cancel",
    captainHint:"You will become the captain of this team",
    passwordHint:"Password for players to join",
    enterPassword:"Enter team password",
    wrongPassword:"Wrong password",
    noTeams:"No teams yet. Create the first one!",
    back:"← Back",
    addPlayer:"ADD PLAYER", playerPlaceholder:"Player name",
    playing:"WHO PLAYS TODAY", viewOnly:"view only",
    suggestions:"💡 PAIR OPTIONS",
    recordMatch:"RECORD MATCH", date:"DATE",
    sets:"SETS (e.g.: 6:3 6:4)",setsPlaceholder:"6:3 6:4",setsHint:"Enter set scores separated by spaces",
    team1:"TEAM 1", team2:"TEAM 2", p1:"Player 1", p2:"Player 2",
    noTie:"⚠️ Tie not allowed",
    save:"✓ Save", sendReview:"⏳ Send for review",
    pendingTag:"⏳ Pending",
    pendingBanner:"⏳ Awaiting review", pendingDesc:"Matches added by players",
    approveAll:"✓ All OK", approveOne:"✓ OK",
    noMatches:"No matches. Record the first!",
    tabGame:"⚡ Game", tabStats:"📊 Stats", tabHistory:"📋 History",
    allTime:"All time", totalMatches:"Total matches", matchesOf:"Matches",
    wins:"WINS", losses:"LOSSES", games:"GAMES", scored:"SCORED", conceded:"CONCEDED", pm:"±",
    winRate:"wins", gamesLabel:(n)=>n===1?"game":"games",
    rankGames:"🏆 Games", rankGamesHint:"Who won most games",
    rankKing:"👑 King", rankKingHint:"Who has best ±points",
    period:"PERIOD", periodHint:"· ℹ️ day details",
    noPlayers:"Add players in the «Game» tab",
    roster:"👥 ROSTER", trophyTitle:"🏆 Trophy Board",
    gamesWinner:"= Games winner", kingWinner:"= King winner",
    noAwards:"no awards", dayResults:"DAY RESULTS", victory:"🏆 WIN",
    captainMode:"🔑 Captain", viewMode:"👁 View", superMode:"👑 Super-Admin",
    captainBtn:"🔑 Captain", logout:"logout",
    deleteTitle:"Delete player?", deleteDesc:"will be removed",
    deleteBtn:"Delete", photoTitle:"Profile photo",
    uploadPhoto:"📷 Upload photo", deletePhoto:"🗑 Remove photo",
    editMatchTitle:"✏️ Edit match",
    videoAdd:"+ video", videoLink:"🎬 Video",
    loading:"Loading...", matches:"matches", players:"players",
    superAdminTitle:"Super-Admin", superAdminHint:"Main platform administrator",
    deleteTeam:"🗑 Delete team", confirmDeleteTeam:"Delete this team and all data?",
    teamPublic:"🌍 Public", teamPrivate:"🔒 Private",
    teamPublicHint:"Anyone can view without password", teamPrivateHint:"Password required to view",
    privateTag:"🔒 Private", publicTag:"🌍 Public",
  }
};

function fmtDate(d) {
  if (!d) return "";
  const [y,m,day] = d.split("-");
  return `${parseInt(day)} ${["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][parseInt(m)-1]} ${y}`;
}

function computeStats(players, matches) {
  const st = {};
  players.forEach(p => { st[p.id]={games:0,wins:0,losses:0,scored:0,conceded:0}; });
  matches.forEach(m => {
    [{pair:[m.t1p1,m.t1p2],sc:m.score1,cn:m.score2},{pair:[m.t2p1,m.t2p2],sc:m.score2,cn:m.score1}]
      .forEach(({pair,sc,cn}) => pair.forEach(pid => {
        if (!st[pid]) return;
        st[pid].games++; st[pid].scored+=sc; st[pid].conceded+=cn;
        if (sc>cn) st[pid].wins++; else st[pid].losses++;
      }));
  });
  return st;
}

function computeTrophies(players, matches) {
  const tr = {};
  players.forEach(p => { tr[p.id]={cups:0,crowns:0}; });
  const days = [...new Set(matches.map(m=>m.date))];
  days.forEach(day => {
    const dm = matches.filter(m=>m.date===day);
    if (!dm.length) return;
    const st = computeStats(players, dm);
    const byWins = [...players].sort((a,b) => {
      const sa=st[a.id],sb=st[b.id];
      if (sb.wins!==sa.wins) return sb.wins-sa.wins;
      return (sb.games?sb.wins/sb.games:0)-(sa.games?sa.wins/sa.games:0);
    });
    if (byWins[0]&&st[byWins[0].id].wins>0) tr[byWins[0].id].cups++;
    const byDiff = [...players].sort((a,b) => {
      const da=st[a.id].scored-st[a.id].conceded,db=st[b.id].scored-st[b.id].conceded;
      return db!==da?db-da:st[b.id].scored-st[a.id].scored;
    });
    if (byDiff[0]&&st[byDiff[0].id].games>0) tr[byDiff[0].id].crowns++;
  });
  return tr;
}

function generatePairings(players) {
  const n=players.length; if (n<4) return [];
  const seen=new Set(),pairs=[];
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++)
    for (let k=0;k<n;k++) for (let l=k+1;l<n;l++)
      if (i!==k&&i!==l&&j!==k&&j!==l) {
        const key=[[players[i].id,players[j].id].sort().join("-"),[players[k].id,players[l].id].sort().join("-")].sort().join("|");
        if (!seen.has(key)){seen.add(key);pairs.push([players[i],players[j],players[k],players[l]]);}
      }
  return pairs;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cs = { background:C.card,borderRadius:14,padding:14,border:`1px solid ${C.border}`,marginBottom:10 };
const is = { background:C.cardHi,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 12px",
  color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box" };
const bs = (bg,sm) => ({ background:bg,border:"none",borderRadius:9,
  padding:sm?"7px 14px":"10px 18px",color:"#fff",fontWeight:700,
  fontFamily:"'Outfit',sans-serif",fontSize:sm?13:14,cursor:"pointer" });
const ls = { fontSize:11,color:C.sub,fontWeight:700,letterSpacing:1.2,marginBottom:6 };
const ss = { background:C.cardHi,border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 10px",
  color:C.text,fontFamily:"'Outfit',sans-serif",fontSize:13,outline:"none",appearance:"none" };

function Avatar({ player, size=38, onClick }) {
  const name = typeof player==="string"?player:player?.name??"?";
  const photo = typeof player==="object"?player?.photo:null;
  return (
    <div onClick={onClick} style={{width:size,height:size,borderRadius:"50%",
      background:photo?"transparent":avatarColor(name),
      display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:900,fontSize:size*0.38,color:"#fff",flexShrink:0,
      boxShadow:"0 0 0 2px #1a1a2e",overflow:"hidden",cursor:onClick?"pointer":"default"}}>
      {photo?<img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={name}/>:name.slice(0,2).toUpperCase()}
    </div>
  );
}

function ScoreInput({ val, setVal, color, label }) {
  const num = val===""?0:parseInt(val)||0;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{fontSize:10,color:C.sub,fontWeight:700,letterSpacing:0.8}}>{label}</div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <button onClick={()=>setVal(Math.max(0,num-1))}
          style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:8,width:32,height:32,
            color:C.sub,fontSize:18,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        <input type="number" min="0" value={val}
          onChange={e=>{const v=e.target.value;setVal(v===""?"":parseInt(v)||0);}}
          style={{width:52,height:44,background:C.cardHi,border:`2px solid ${color}44`,borderRadius:10,
            color,fontWeight:900,fontSize:26,textAlign:"center",fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
        <button onClick={()=>setVal(num+1)}
          style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:8,width:32,height:32,
            color:C.text,fontSize:18,cursor:"pointer",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
      </div>
    </div>
  );
}

// ── Sport Selection Screen ────────────────────────────────────────────────────
function SportScreen({ lang, onSelect }) {
  const t = LANG[lang];
  return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"24px 20px 16px",textAlign:"center"}}>
        <img src="/icon-512.png" alt="Play 2x2"
          style={{width:72,height:72,borderRadius:16,objectFit:"cover",marginBottom:12}}/>
        <div style={{fontSize:26,fontWeight:900,letterSpacing:-0.5}}>
          Play <span style={{color:C.sand}}>2x2</span>
        </div>
        <div style={{fontSize:13,color:C.sub,marginTop:4}}>{t.selectSport}</div>
      </div>
      <div style={{padding:"0 16px",flex:1}}>
        {SPORTS.map(sport => (
          <button key={sport.id} onClick={()=>onSelect(sport)}
            style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,
              borderRadius:16,padding:"20px 24px",marginBottom:12,cursor:"pointer",
              display:"flex",alignItems:"center",gap:16,
              transition:"all .15s",textAlign:"left"}}>
            <div style={{fontSize:44,lineHeight:1}}>{sport.emoji}</div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:C.text}}>{sport.name}</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>2 × 2</div>
            </div>
            <div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:sport.color}}/>
          </button>
        ))}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
      `}</style>
    </div>
  );
}

// ── Teams List Screen ─────────────────────────────────────────────────────────
function TeamsScreen({ lang, sport, teams, onBack, onSelectTeam, onCreateTeam, isSuperAdmin }) {
  const t = LANG[lang];
  const [showJoin, setShowJoin] = useState(null);
  const [joinPw, setJoinPw] = useState("");
  const [err, setErr] = useState(false);
  const sportTeams = teams.filter(tm=>tm.sport===sport.id);

  const handleJoin = (team) => {
    if (joinPw === team.password || isSuperAdmin) {
      setShowJoin(null); setJoinPw(""); setErr(false);
      onSelectTeam(team, joinPw === team.password ? "captain" : "viewer");
    } else { setErr(true); setTimeout(()=>setErr(false),1500); }
  };

  return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      {showJoin && (
        <div style={{position:"fixed",inset:0,zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24,
          background:"linear-gradient(135deg,#0D0D1Aee,#1a1a35ee)"}}
          onClick={()=>{setShowJoin(null);setJoinPw("");}}>
          <div style={{background:"linear-gradient(160deg,#1a1a35,#0D0D1A)",
            borderRadius:20,padding:28,width:"100%",maxWidth:300,
            border:`1px solid ${sport.color}55`,
            boxShadow:`0 0 60px ${sport.color}30, 0 24px 60px #000`}}
            onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:6}}>{sport.emoji}</div>
              <div style={{fontSize:17,fontWeight:800,color:C.text}}>{showJoin.name}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:4}}>
                {showJoin.isPrivate ? "🔒 "+t.teamPrivateHint : "🔑 "+t.captainBtn}
              </div>
            </div>
            <input autoFocus type="password" value={joinPw}
              onChange={e=>{setJoinPw(e.target.value);setErr(false);}}
              onKeyDown={e=>e.key==="Enter"&&handleJoin(showJoin)}
              placeholder="••••••"
              style={{background:"#0D0D1A",border:`1.5px solid ${err?"#FF6B6B":sport.color+"66"}`,
                borderRadius:10,padding:"12px 14px",color:C.text,
                fontFamily:"'Outfit',sans-serif",fontSize:16,outline:"none",
                width:"100%",boxSizing:"border-box",
                textAlign:"center",letterSpacing:4,marginBottom:6}}/>
            {err&&<div style={{fontSize:12,color:"#FF6B6B",marginBottom:6,textAlign:"center"}}>{t.wrongPassword}</div>}
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>{setShowJoin(null);setJoinPw("");}}
                style={{...bs(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
              <button onClick={()=>handleJoin(showJoin)}
                style={{...bs(sport.color),flex:2,color:"#0D0D1A",fontWeight:800}}>{t.join}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,#0D0D1A,#1a1a35)",
        padding:"12px 16px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack}
            style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,fontFamily:"'Outfit',sans-serif"}}>
            {t.back}
          </button>
          <div style={{fontSize:24}}>{sport.emoji}</div>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>{sport.name}</div>
            <div style={{fontSize:11,color:C.sub}}>{sportTeams.length} {t.teams}</div>
          </div>
        </div>
      </div>

      <div style={{flex:1,padding:"12px 12px 80px",overflowY:"auto"}}>
        <button onClick={onCreateTeam}
          style={{...bs(sport.color),width:"100%",marginBottom:12,color:"#0D0D1A",fontSize:15,padding:"14px"}}>
          {t.createTeam}
        </button>

        {sportTeams.length===0 && (
          <div style={{textAlign:"center",color:C.sub,marginTop:40}}>
            <div style={{fontSize:40}}>{sport.emoji}</div>
            <div style={{marginTop:8}}>{t.noTeams}</div>
          </div>
        )}

        {sportTeams.map(team => (
          <div key={team.id} style={{...cs,cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
            onClick={()=>{
              if(isSuperAdmin){onSelectTeam(team,"superadmin");}
              else if(!team.isPrivate){onSelectTeam(team,"viewer");}
              else{setShowJoin(team);}
            }}>
            <div style={{width:44,height:44,borderRadius:12,background:sport.color+"33",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
              {sport.emoji}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:15,fontWeight:700}}>{team.name}</div>
                <div style={{fontSize:10,fontWeight:700,
                  color:team.isPrivate?"#FF6B6B":"#3DDC97",
                  background:team.isPrivate?"#FF6B6B22":"#3DDC9722",
                  borderRadius:10,padding:"1px 7px"}}>
                  {team.isPrivate?t.privateTag:t.publicTag}
                </div>
              </div>
              <div style={{fontSize:11,color:C.sub}}>{team.playerCount||0} {t.players} · {team.matchCount||0} {t.matches}</div>
            </div>
            <div style={{color:C.sub,fontSize:18}}>›</div>
          </div>
        ))}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
      `}</style>
    </div>
  );
}

// ── Create Team Screen ────────────────────────────────────────────────────────
function CreateTeamScreen({ lang, sport, onCreate, onBack }) {
  const t = LANG[lang];
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const valid = name.trim().length>0 && pw.trim().length>=3;
  return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,#0D0D1A,#1a1a35)",
        padding:"12px 16px",borderBottom:"1px solid "+C.border}}>
        <button onClick={onBack}
          style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14,fontFamily:"'Outfit',sans-serif"}}>
          {t.back}
        </button>
      </div>
      <div style={{flex:1,padding:"24px 16px"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40}}>{sport.emoji}</div>
          <div style={{fontSize:20,fontWeight:800,marginTop:8}}>{t.createTeam}</div>
          <div style={{fontSize:12,color:C.sub,marginTop:4}}>{sport.name}</div>
        </div>
        <div style={{...cs}}>
          <div style={ls}>{t.teamName}</div>
          <input style={is} value={name} onChange={e=>setName(e.target.value)}
            placeholder={t.teamName} onKeyDown={e=>e.key==="Enter"&&valid&&onCreate(name.trim(),pw.trim())}/>
        </div>
        <div style={{...cs}}>
          <div style={ls}>{t.teamPassword}</div>
          <input style={is} type="password" value={pw} onChange={e=>setPw(e.target.value)}
            placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&valid&&onCreate(name.trim(),pw.trim())}/>
          <div style={{fontSize:11,color:C.sub,marginTop:6}}>🔑 {t.passwordHint}</div>
        </div>
        {/* Privacy toggle */}
        <div style={{...cs}}>
          <div style={ls}>ТИП КОМАНДЫ</div>
          <div style={{display:"flex",gap:8}}>
            {[false,true].map(priv=>(
              <div key={priv?1:0} onClick={()=>setIsPrivate(priv)}
                style={{flex:1,textAlign:"center",borderRadius:10,padding:"10px 8px",cursor:"pointer",
                  background:isPrivate===priv?sport.color+"22":C.cardHi,
                  border:`1.5px solid ${isPrivate===priv?sport.color:C.border}`}}>
                <div style={{fontSize:16,marginBottom:4}}>{priv?"🔒":"🌍"}</div>
                <div style={{fontSize:13,fontWeight:700,color:isPrivate===priv?sport.color:C.sub}}>
                  {priv?t.teamPrivate:t.teamPublic}
                </div>
                <div style={{fontSize:10,color:C.sub,marginTop:2}}>
                  {priv?t.teamPrivateHint:t.teamPublicHint}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{...cs,background:sport.color+"11",border:`1px solid ${sport.color}33`}}>
          <div style={{fontSize:12,color:C.sub}}>👑 {t.captainHint}</div>
        </div>
        <button onClick={()=>valid&&onCreate(name.trim(),pw.trim(),isPrivate)}
          style={{...bs(valid?sport.color:C.border),width:"100%",color:valid?"#0D0D1A":C.sub,
            opacity:valid?1:0.6,fontSize:16,padding:"14px"}}>
          {t.create}
        </button>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
      `}</style>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState("ru");
  const t = LANG[lang];

  // Navigation: "sports" | "teams" | "create_team" | "team"
  const [screen, setScreen] = useState("sports");
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);

  // Role: "viewer" | "captain" | "superadmin"
  const [role, setRole] = useState("viewer");
  const isCaptain = role==="captain" || role==="superadmin";
  const isSuperAdmin = role==="superadmin";

  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Show splash for 2 seconds on first load
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Firebase data
  const [allTeams, setAllTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [dayLinks, setDayLinks] = useState({});

  // Team tab state
  const [tab, setTab] = useState("game");
  const [newName, setNewName] = useState("");
  const [sessionIds, setSessionIds] = useState([]);
  const [matchDate, setMatchDate] = useState(today());
  const [t1p1,setT1p1]=useState(""); const [t1p2,setT1p2]=useState("");
  const [t2p1,setT2p1]=useState(""); const [t2p2,setT2p2]=useState("");
  const [score1,setScore1]=useState(""); const [score2,setScore2]=useState("");
  const [tennisScore,setTennisScore]=useState("");
  const [sets,setSets]=useState([{a:"",b:""},{a:"",b:""}]); // per-set score boxes
  const isTennis = currentTeam ? isTennisSport(currentTeam.sport) : false;
  // singles mode (1v1) for tennis/padel
  const [singlesMode,setSinglesMode]=useState(false);
  const [rankMode,setRankMode]=useState("games");
  const [dayFilter,setDayFilter]=useState("all");
  const [dayDetailDay,setDayDetailDay]=useState(null);
  const [editingMatch,setEditingMatch]=useState(null);
  const [showTrophies,setShowTrophies]=useState(false);
  const [photoPickerPlayer,setPhotoPickerPlayer]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [editingLinkDay,setEditingLinkDay]=useState(null);
  const [linkInput,setLinkInput]=useState("");

  // Load all teams
  useEffect(() => {
    const u = onSnapshot(collection(db,"teams"), snap => {
      setAllTeams(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    });
    return u;
  }, []);

  // Load team data when inside a team
  useEffect(() => {
    if (!currentTeam) return;
    const u1 = onSnapshot(collection(db,`teams/${currentTeam.id}/players`), snap => {
      setPlayers(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u2 = onSnapshot(collection(db,`teams/${currentTeam.id}/matches`), snap => {
      const ms = snap.docs.map(d=>({id:d.id,...d.data()}));
      ms.sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0));
      setMatches(ms);
    });
    const u3 = onSnapshot(collection(db,`teams/${currentTeam.id}/dayLinks`), snap => {
      const links={};
      snap.docs.forEach(d=>{links[d.id]=d.data().url;});
      setDayLinks(links);
    });
    return ()=>{u1();u2();u3();};
  }, [currentTeam]);

  const fbAddPlayer = async name => {
    const id=uid();
    await setDoc(doc(db,`teams/${currentTeam.id}/players`,id),{name,photo:null,createdAt:Date.now()});
    await updateDoc(doc(db,"teams",currentTeam.id),{playerCount:(currentTeam.playerCount||0)+1});
  };
  const fbUpdatePlayer = async (id,data) => await updateDoc(doc(db,`teams/${currentTeam.id}/players`,id),data);
  const fbDeletePlayer = async id => await deleteDoc(doc(db,`teams/${currentTeam.id}/players`,id));
  const fbAddMatch = async data => {
    const id=uid();
    await setDoc(doc(db,`teams/${currentTeam.id}/matches`,id),{...data,id,createdAt:Date.now()});
    await updateDoc(doc(db,"teams",currentTeam.id),{matchCount:(currentTeam.matchCount||0)+1});
  };
  const fbUpdateMatch = async (id,data) => await updateDoc(doc(db,`teams/${currentTeam.id}/matches`,id),data);
  const fbDeleteMatch = async id => await deleteDoc(doc(db,`teams/${currentTeam.id}/matches`,id));
  const fbSetDayLink = async (date,url) => await setDoc(doc(db,`teams/${currentTeam.id}/dayLinks`,date),{url});

  const createTeam = async (name, password, isPrivate=false) => {
    const id = uid();
    const sport = selectedSport;
    await setDoc(doc(db,"teams",id),{
      id, name, password, sport:sport.id, isPrivate,
      playerCount:0, matchCount:0, createdAt:Date.now()
    });
    const team = {id,name,password,sport:sport.id,playerCount:0,matchCount:0};
    setCurrentTeam(team);
    setRole("captain");
    setScreen("team");
    setTab("game");
  };

  const enterTeam = (team, entryRole) => {
    setCurrentTeam(team);
    setRole(entryRole);
    setScreen("team");
    setTab("game");
    setSessionIds([]);
    setPlayers([]);
    setMatches([]);
  };

  const leaveTeam = () => {
    setCurrentTeam(null);
    setPlayers([]);
    setMatches([]);
    setDayLinks({});
    setSessionIds([]);
    setRole("viewer");
    setScreen("teams");
    setTab("game");
  };

  const pendingCount = matches.filter(m=>m.pending).length;
  const sessionPlayers = players.filter(p=>sessionIds.includes(p.id));
  const toggleSession = id => setSessionIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);

  const setsStr = setsToString(sets);
  const matchValid = singlesMode
    ? (t1p1 && t2p1 && t1p1!==t2p1 && (isTennis ? parseTennisWinner(setsStr)!==0 : (score1!==""&&score2!==""&&parseInt(score1)!==parseInt(score2))))
    : (t1p1&&t1p2&&t2p1&&t2p2&&new Set([t1p1,t1p2,t2p1,t2p2]).size===4
      &&(isTennis ? parseTennisWinner(setsStr)!==0 : (score1!==""&&score2!==""&&parseInt(score1)!==parseInt(score2))));

  const saveMatch = async () => {
    if (!matchValid) return;
    const finalT1p2 = singlesMode ? "" : t1p2;
    const finalT2p2 = singlesMode ? "" : t2p2;
    if (isTennis) {
      const winner = parseTennisWinner(setsStr);
      await fbAddMatch({date:matchDate,t1p1,t1p2:finalT1p2,t2p1,t2p2:finalT2p2,
        score1:winner===1?1:0,score2:winner===2?1:0,
        tennisScore:setsStr,singles:singlesMode,pending:!isCaptain});
      setSets([{a:"",b:""},{a:"",b:""}]);
    } else {
      await fbAddMatch({date:matchDate,t1p1,t1p2:finalT1p2,t2p1,t2p2:finalT2p2,
        score1:parseInt(score1),score2:parseInt(score2),singles:singlesMode,pending:!isCaptain});
      setScore1("");setScore2("");
    }
    setT1p1("");setT1p2("");setT2p1("");setT2p2("");
  };

  const approveAll = async () => { for (const m of matches.filter(m=>m.pending)) await fbUpdateMatch(m.id,{pending:false}); };

  const gameDays = useMemo(()=>[...new Set(matches.map(m=>m.date))].sort((a,b)=>b.localeCompare(a)),[matches]);
  const filteredMatches = useMemo(()=>dayFilter==="all"?matches:matches.filter(m=>m.date===dayFilter),[matches,dayFilter]);
  const stats = useMemo(()=>computeStats(players,filteredMatches),[players,filteredMatches]);
  const trophies = useMemo(()=>computeTrophies(players,matches),[players,matches]);
  const sortedPlayers = useMemo(()=>[...players].sort((a,b)=>{
    const sa=stats[a.id]||{wins:0,games:0,scored:0,conceded:0};
    const sb=stats[b.id]||{wins:0,games:0,scored:0,conceded:0};
    if (rankMode==="games"){if(sb.wins!==sa.wins)return sb.wins-sa.wins;return(sb.games?sb.wins/sb.games:0)-(sa.games?sa.wins/sa.games:0);}
    const da=sa.scored-sa.conceded,db=sb.scored-sb.conceded;
    return db!==da?db-da:sb.scored-sa.scored;
  }),[players,stats,rankMode]);
  const suggestions = useMemo(()=>generatePairings(sessionPlayers).slice(0,6),[sessionPlayers]);
  const pObj = id=>players.find(p=>p.id===id)||{name:"?",photo:null};
  const medal = i=>i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
  const tabStyle = on=>({flex:1,padding:"11px 0",border:"none",
    background:on?C.card:"transparent",color:on?C.sand:C.sub,
    borderTop:on?`2px solid ${C.sand}`:"2px solid transparent",
    fontFamily:"'Outfit',sans-serif",fontWeight:on?700:500,fontSize:12,cursor:"pointer"});

  if (loading || showSplash) return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Outfit',sans-serif",position:"relative",overflow:"hidden"}}>
      {/* Background glow */}
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",
        background:"radial-gradient(circle, #F7C94820 0%, transparent 70%)",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>
      <img src="/icon-512.png" alt="Play 2x2"
        style={{width:180,height:180,borderRadius:36,objectFit:"cover",
          marginBottom:28,boxShadow:"0 20px 60px #F7C94840",
          animation:"splashPop .5s ease-out"}}/>
      <div style={{fontSize:36,fontWeight:900,letterSpacing:-1,color:C.text}}>
        Play <span style={{color:C.sand}}>2x2</span>
      </div>
      <div style={{fontSize:14,color:C.sub,marginTop:8,letterSpacing:1}}>
        BEACH · TENNIS · PADEL
      </div>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
        @keyframes splashPop{from{transform:scale(0.7);opacity:0;}to{transform:scale(1);opacity:1;}}
      `}</style>
    </div>
  );

  // ── Sport selection screen
  if (screen==="sports") return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      {/* Super-admin popup */}
      {showAdminPopup && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
          onClick={()=>{setShowAdminPopup(false);setAdminPw("");}}>
          <div style={{background:"#161626",borderRadius:18,padding:24,width:"100%",maxWidth:300,
            border:"1px solid "+C.border,boxShadow:"0 24px 60px #000"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:26,textAlign:"center",marginBottom:6}}>👑</div>
            <div style={{fontSize:14,fontWeight:800,textAlign:"center",color:C.text,marginBottom:4}}>{t.superAdminTitle}</div>
            <div style={{fontSize:11,color:C.sub,textAlign:"center",marginBottom:16}}>{t.superAdminHint}</div>
            <input autoFocus type="password" value={adminPw}
              onChange={e=>{setAdminPw(e.target.value);setAdminErr(false);}}
              onKeyDown={e=>{if(e.key==="Enter"){if(adminPw===SUPER_ADMIN_PASSWORD){setRole("superadmin");setShowAdminPopup(false);setAdminPw("");}else{setAdminErr(true);setTimeout(()=>setAdminErr(false),1500);}}}}
              placeholder="••••••"
              style={{...is,border:`1.5px solid ${adminErr?"#FF6B6B":C.border}`,marginBottom:6}}/>
            {adminErr&&<div style={{fontSize:12,color:"#FF6B6B",marginBottom:6}}>{t.wrongPassword}</div>}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={()=>{setShowAdminPopup(false);setAdminPw("");}}
                style={{...bs(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
              <button onClick={()=>{if(adminPw===SUPER_ADMIN_PASSWORD){setRole("superadmin");setShowAdminPopup(false);setAdminPw("");}else{setAdminErr(true);setTimeout(()=>setAdminErr(false),1500);}}}
                style={{...bs(C.sand),flex:2,color:"#0D0D1A"}}>OK</button>
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"20px 20px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/icon-512.png" alt="" style={{width:40,height:40,borderRadius:10,objectFit:"cover"}}/>
            <div>
              <div style={{fontSize:18,fontWeight:900}}>Play <span style={{color:C.sand}}>2x2</span></div>
              <div style={{fontSize:10,color:C.sub}}>{isSuperAdmin?"👑 Super-Admin":""}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* Language switcher */}
            {[["ru","🇷🇺"],["lv","🇱🇻"],["en","🇬🇧"]].map(([code,flag])=>(
              <button key={code} onClick={()=>setLang(code)}
                style={{background:lang===code?C.sand+"22":C.cardHi,
                  border:"1.5px solid "+(lang===code?C.sand:C.border),
                  borderRadius:20,padding:"3px 8px",color:lang===code?C.sand:C.sub,
                  fontSize:13,cursor:"pointer"}}>{flag}</button>
            ))}
            {isSuperAdmin?(
              <div style={{fontSize:10,fontWeight:700,color:C.sand,background:C.sand+"22",
                border:"1px solid "+C.sand+"55",borderRadius:20,padding:"3px 8px"}}>👑</div>
            ):(
              <button onClick={()=>setShowAdminPopup(true)}
                style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:20,
                  padding:"4px 10px",color:C.sub,fontSize:11,fontWeight:700,cursor:"pointer"}}>👑</button>
            )}
          </div>
        </div>
        <div style={{fontSize:14,color:C.sub,textAlign:"center",marginBottom:4}}>{t.selectSport}</div>
      </div>

      <div style={{padding:"0 16px",flex:1}}>
        {SPORTS.map(sport=>(
          <button key={sport.id} onClick={()=>{setSelectedSport(sport);setScreen("teams");}}
            style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,
              borderRadius:16,padding:"18px 20px",marginBottom:10,cursor:"pointer",
              display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
            <div style={{fontSize:42,lineHeight:1}}>{sport.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>{sport.name}</div>
              <div style={{fontSize:11,color:C.sub,marginTop:2}}>2 × 2</div>
            </div>
            <div style={{width:10,height:10,borderRadius:"50%",background:sport.color}}/>
          </button>
        ))}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
        body{overflow-x:hidden;}
      `}</style>
    </div>
  );

  // ── Teams list screen
  if (screen==="teams") return (
    <TeamsScreen lang={lang} sport={selectedSport} teams={allTeams}
      onBack={()=>setScreen("sports")}
      onSelectTeam={enterTeam}
      onCreateTeam={()=>setScreen("create_team")}
      isSuperAdmin={isSuperAdmin}/>
  );

  // ── Create team screen
  if (screen==="create_team") return (
    <CreateTeamScreen lang={lang} sport={selectedSport}
      onCreate={createTeam}
      onBack={()=>setScreen("teams")}/>
  );

  // ── Team screen
  const sport = SPORTS.find(s=>s.id===currentTeam?.sport)||SPORTS[0];

  return (
    <div style={{background:C.bg,minHeight:"100vh",width:"100%",maxWidth:430,margin:"0 auto",
      fontFamily:"'Outfit',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>

      {/* Popups */}
      {editingMatch&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={()=>setEditingMatch(null)}>
          <div style={{background:"#161626",borderRadius:16,padding:18,width:"100%",maxWidth:360,
            border:"1px solid "+C.border,boxShadow:"0 24px 60px #000",maxHeight:"90vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:13,fontWeight:800,color:C.sand,marginBottom:14}}>{t.editMatchTitle}</div>
            {/* simplified edit - just scores */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:14}}>
              <ScoreInput val={editingMatch.score1} setVal={v=>setEditingMatch(m=>({...m,score1:v}))} color={C.sky} label={t.team1}/>
              <div style={{fontSize:20,fontWeight:900,color:C.sub,paddingTop:18}}>:</div>
              <ScoreInput val={editingMatch.score2} setVal={v=>setEditingMatch(m=>({...m,score2:v}))} color={C.red} label={t.team2}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setEditingMatch(null)} style={{...bs(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
              <button onClick={async()=>{await fbUpdateMatch(editingMatch.id,{score1:parseInt(editingMatch.score1),score2:parseInt(editingMatch.score2)});setEditingMatch(null);}}
                style={{...bs(C.sand),flex:2,color:"#0D0D1A"}}>{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {dayDetailDay&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setDayDetailDay(null)}>
          <div style={{background:"#161626",borderRadius:"16px 16px 0 0",padding:"18px 16px 30px",
            width:"100%",maxWidth:430,border:"1px solid "+C.border,maxHeight:"80vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontSize:13,fontWeight:800,color:C.sand,marginBottom:12}}>
              📅 {fmtDate(dayDetailDay)} · {matches.filter(m=>m.date===dayDetailDay).length} {t.matches}
            </div>
            {matches.filter(m=>m.date===dayDetailDay).map(m=>{
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
                    <div style={{fontSize:20,fontWeight:900,letterSpacing:-1}}>
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
            <div style={{fontSize:11,color:C.sub,fontWeight:700,letterSpacing:1,marginTop:14,marginBottom:8}}>{t.dayResults}</div>
            {players.filter(p=>stats[p.id]?.games>0).sort((a,b)=>{
              const da=stats[a.id].scored-stats[a.id].conceded,db=stats[b.id].scored-stats[b.id].conceded;return db-da;
            }).map(p=>{
              const s=stats[p.id]; const diff=s.scored-s.conceded;
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,
                  background:C.bg,borderRadius:8,padding:"7px 10px",marginBottom:6}}>
                  <Avatar player={p} size={28}/>
                  <div style={{flex:1,fontSize:12,fontWeight:700}}>{p.name}</div>
                  <div style={{display:"flex",gap:10,fontSize:12}}>
                    <span style={{color:C.green}}>{s.wins}В</span>
                    <span style={{color:C.red}}>{s.losses}П</span>
                    <span style={{color:diff>=0?C.green:C.red,fontWeight:800}}>{diff>=0?"+":""}{diff}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTrophies&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowTrophies(false)}>
          <div style={{background:"#161626",borderRadius:"16px 16px 0 0",padding:"18px 16px 30px",
            width:"100%",maxWidth:430,border:"1px solid "+C.border,maxHeight:"70vh",overflowY:"auto"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 14px"}}/>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:10,textAlign:"center"}}>{t.trophyTitle}</div>
            {[...players].sort((a,b)=>{
              const ta=trophies[a.id]||{cups:0,crowns:0},tb=trophies[b.id]||{cups:0,crowns:0};
              return (tb.cups+tb.crowns)-(ta.cups+ta.crowns);
            }).map((p,i)=>{
              const tr=trophies[p.id]||{cups:0,crowns:0}; const has=tr.cups>0||tr.crowns>0;
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,
                  background:has?avatarColor(p.name)+"11":C.cardHi,
                  borderRadius:10,padding:"10px 12px",marginBottom:7,
                  border:`1px solid ${has?avatarColor(p.name)+"44":C.border}`}}>
                  <div style={{fontWeight:800,fontSize:13,color:C.sub,minWidth:18}}>#{i+1}</div>
                  <Avatar player={p} size={34}/>
                  <div style={{flex:1,fontWeight:700,fontSize:14}}>{p.name}</div>
                  <div style={{display:"flex",gap:4}}>
                    {tr.cups>0&&<div>{"🏆".repeat(Math.min(tr.cups,5))}{tr.cups>5&&<span style={{fontSize:11}}>×{tr.cups}</span>}</div>}
                    {tr.crowns>0&&<div>{"👑".repeat(Math.min(tr.crowns,5))}{tr.crowns>5&&<span style={{fontSize:11}}>×{tr.crowns}</span>}</div>}
                    {!has&&<span style={{fontSize:11,color:C.sub}}>{t.noAwards}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {photoPickerPlayer&&(()=>{
        const fileRef2={current:null};
        return (
          <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:400,
            display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
            onClick={()=>setPhotoPickerPlayer(null)}>
            <div style={{background:"#161626",borderRadius:18,padding:24,width:"100%",maxWidth:300,
              border:"1px solid "+C.border,boxShadow:"0 24px 60px #000",textAlign:"center"}}
              onClick={e=>e.stopPropagation()}>
              <Avatar player={photoPickerPlayer} size={72}/>
              <div style={{fontSize:14,fontWeight:800,color:C.text,margin:"12px 0 4px"}}>{photoPickerPlayer.name}</div>
              <div style={{fontSize:12,color:C.sub,marginBottom:20}}>{t.photoTitle}</div>
              <input ref={fileRef2} type="file" accept="image/*" style={{display:"none"}}
                onChange={e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{fbUpdatePlayer(photoPickerPlayer.id,{photo:ev.target.result});setPhotoPickerPlayer(null);};reader.readAsDataURL(file);}}/>
              <button onClick={()=>fileRef2.current?.click()} style={{...bs(C.accent),width:"100%",marginBottom:10}}>{t.uploadPhoto}</button>
              {photoPickerPlayer.photo&&<button onClick={()=>{fbUpdatePlayer(photoPickerPlayer.id,{photo:null});setPhotoPickerPlayer(null);}}
                style={{...bs(C.cardHi),width:"100%",color:C.red,border:"1px solid "+C.border,marginBottom:10}}>{t.deletePhoto}</button>}
              <button onClick={()=>setPhotoPickerPlayer(null)} style={{...bs(C.cardHi),width:"100%",color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
            </div>
          </div>
        );
      })()}

      {deleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:400,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setDeleteConfirm(null)}>
          <div style={{background:"#161626",borderRadius:16,padding:22,width:"100%",maxWidth:300,
            border:"1px solid "+C.border}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:22,textAlign:"center",marginBottom:8}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:800,textAlign:"center",marginBottom:8}}>{t.deleteTitle}</div>
            <div style={{fontSize:12,color:C.sub,textAlign:"center",marginBottom:18}}>
              {players.find(p=>p.id===deleteConfirm)?.name} {t.deleteDesc}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{...bs(C.cardHi),flex:1,color:C.sub,border:"1px solid "+C.border}}>{t.cancel}</button>
              <button onClick={async()=>{await fbDeletePlayer(deleteConfirm);setSessionIds(ids=>ids.filter(id=>id!==deleteConfirm));setDeleteConfirm(null);}}
                style={{...bs(C.red),flex:1}}>{t.deleteBtn}</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0D0D1A,#1a1a35)",
        padding:"10px 16px 8px",borderBottom:"1px solid "+C.border}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={leaveTeam}
              style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:13,fontFamily:"'Outfit',sans-serif"}}>
              {t.back}
            </button>
            <div style={{fontSize:20}}>{sport.emoji}</div>
            <div>
              <div style={{fontSize:15,fontWeight:800}}>{currentTeam?.name}</div>
              <div style={{fontSize:10,color:C.sub}}>{matches.length} {t.matches} · {players.length} {t.players}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>setShowTrophies(true)}
              style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:20,
                padding:"5px 8px",color:C.sand,fontSize:12,cursor:"pointer"}}>🏆</button>
            {isCaptain?(
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                {pendingCount>0&&(
                  <div style={{fontSize:10,fontWeight:800,color:C.pending,background:C.pending+"22",
                    border:"1px solid "+C.pending+"55",borderRadius:20,padding:"3px 7px",cursor:"pointer"}}
                    onClick={()=>setTab("history")}>⏳{pendingCount}</div>
                )}
                <div style={{fontSize:10,fontWeight:700,
                  color:isSuperAdmin?C.king:C.sand,
                  background:(isSuperAdmin?C.king:C.sand)+"22",
                  border:`1px solid ${isSuperAdmin?C.king:C.sand}55`,
                  borderRadius:20,padding:"3px 8px"}}>
                  {isSuperAdmin?"👑":"🔑"}
                </div>
                <button onClick={()=>{setRole("viewer");}}
                  style={{background:"none",border:"none",color:C.sub,fontSize:10,cursor:"pointer"}}>{t.logout}</button>
              </div>
            ):(
              <button onClick={()=>{
                const pw = prompt(t.enterPassword);
                if (pw===currentTeam?.password||pw===SUPER_ADMIN_PASSWORD) setRole(pw===SUPER_ADMIN_PASSWORD?"superadmin":"captain");
              }} style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:20,
                padding:"5px 10px",color:C.sub,fontSize:11,fontWeight:700,cursor:"pointer"}}>{t.captainBtn}</button>
            )}
          </div>
        </div>
        {/* Lang switcher */}
        <div style={{display:"flex",gap:6}}>
          {[["ru","🇷🇺 RU"],["lv","🇱🇻 LV"],["en","🇬🇧 EN"]].map(([code,label])=>(
            <button key={code} onClick={()=>setLang(code)}
              style={{background:lang===code?C.sand+"22":C.cardHi,
                border:"1.5px solid "+(lang===code?C.sand:C.border),
                borderRadius:20,padding:"3px 10px",color:lang===code?C.sand:C.sub,
                fontSize:11,fontWeight:700,cursor:"pointer"}}>{label}</button>
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

        {/* GAME TAB */}
        {tab==="game"&&(<>
          <div style={cs}>
            <div style={ls}>{t.addPlayer}</div>
            <div style={{display:"flex",gap:8}}>
              <input style={{...is,flex:1}} placeholder={t.playerPlaceholder} value={newName}
                onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){const n=newName.trim();if(n&&!players.find(p=>p.name.toLowerCase()===n.toLowerCase())){fbAddPlayer(n);setNewName("");}}}}/>
              <button style={bs(C.accent)} onClick={()=>{const n=newName.trim();if(n&&!players.find(p=>p.name.toLowerCase()===n.toLowerCase())){fbAddPlayer(n);setNewName("");}}}>+</button>
            </div>
          </div>

          {players.length>0&&(
            <div style={cs}>
              <div style={ls}>{t.playing} ({sessionIds.length})
                {!isCaptain&&<span style={{color:C.sub,fontWeight:400,marginLeft:6,fontSize:10}}>· {t.viewOnly}</span>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {players.map(p=>{
                  const on=sessionIds.includes(p.id);
                  return (
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,
                      background:on?avatarColor(p.name)+"33":C.cardHi,
                      border:`1.5px solid ${on?avatarColor(p.name):C.border}`,
                      borderRadius:20,padding:"5px 12px 5px 6px",cursor:"pointer"}}
                      onClick={()=>toggleSession(p.id)}>
                      <div onClick={e=>{if(isCaptain){e.stopPropagation();setPhotoPickerPlayer(p);}}}>
                        <Avatar player={p} size={22}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:600,color:on?C.text:C.sub}}>{p.name}</span>
                      {isCaptain&&(
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
            <div style={cs}>
              <div style={ls}>{t.suggestions}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {suggestions.map(([a,b,c,d],i)=>(
                  <div key={i} onClick={()=>{setT1p1(a.id);setT1p2(b.id);setT2p1(c.id);setT2p2(d.id);}}
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

          <div style={{...cs,border:"1px solid "+(isCaptain?C.sand+"30":C.pending+"30")}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={ls}>{t.recordMatch}</div>
              {!isCaptain&&<div style={{fontSize:10,color:C.pending,fontWeight:700,
                background:C.pending+"22",borderRadius:10,padding:"2px 8px"}}>{t.pendingTag}</div>}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{...ls,marginBottom:4}}>{t.date}</div>
              <input type="date" style={is} value={matchDate} onChange={e=>setMatchDate(e.target.value)}/>
            </div>
            {/* Singles/Doubles toggle for tennis sports */}
            {isTennis && (
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {[[false,"👥 2×2"],[true,"🎾 1×1"]].map(([val,label])=>(
                  <div key={val?1:0} onClick={()=>{setSinglesMode(val);setT1p2("");setT2p2("");}}
                    style={{flex:1,textAlign:"center",borderRadius:10,padding:"8px 6px",cursor:"pointer",
                      background:singlesMode===val?C.sky+"22":C.cardHi,
                      border:"1.5px solid "+(singlesMode===val?C.sky:C.border)}}>
                    <div style={{fontSize:13,fontWeight:700,color:singlesMode===val?C.sky:C.sub}}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:8,borderLeft:"3px solid "+C.sky}}>
              <div style={{...ls,color:C.sky}}>{t.team1}</div>
              <div style={{display:"flex",gap:6}}>
                <select style={{...ss,flex:1}} value={t1p1} onChange={e=>setT1p1(e.target.value)}>
                  <option value="">{t.p1}</option>
                  {sessionPlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!singlesMode&&(
                  <select style={{...ss,flex:1}} value={t1p2} onChange={e=>setT1p2(e.target.value)}>
                    <option value="">{t.p2}</option>
                    {sessionPlayers.filter(p=>p.id!==t1p1).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div style={{background:C.cardHi,borderRadius:10,padding:10,marginBottom:14,borderLeft:"3px solid "+C.red}}>
              <div style={{...ls,color:C.red}}>{t.team2}</div>
              <div style={{display:"flex",gap:6}}>
                <select style={{...ss,flex:1}} value={t2p1} onChange={e=>setT2p1(e.target.value)}>
                  <option value="">{t.p1}</option>
                  {sessionPlayers.filter(p=>![t1p1,singlesMode?"":t1p2].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!singlesMode&&(
                  <select style={{...ss,flex:1}} value={t2p2} onChange={e=>setT2p2(e.target.value)}>
                    <option value="">{t.p2}</option>
                    {sessionPlayers.filter(p=>![t1p1,t1p2,t2p1].includes(p.id)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            {isTennis ? (
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{...ls,marginBottom:0}}>СЧЁТ ПО СЕТАМ</div>
                  <button onClick={()=>setSets(s=>s.length<5?[...s,{a:"",b:""}]:s)}
                    style={{background:C.cardHi,border:"1px solid "+C.border,borderRadius:8,
                      padding:"4px 10px",color:C.sub,fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                    + Сет
                  </button>
                </div>
                {sets.map((set,idx)=>(
                  <div key={idx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{fontSize:11,color:C.sub,minWidth:40,fontWeight:700}}>Сет {idx+1}</div>
                    <input type="number" min="0" max="99" value={set.a}
                      onChange={e=>setSets(s=>s.map((x,i)=>i===idx?{...x,a:e.target.value}:x))}
                      style={{width:56,height:42,background:C.cardHi,border:"2px solid "+C.sky+"55",
                        borderRadius:10,color:C.sky,fontWeight:900,fontSize:22,textAlign:"center",
                        fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
                    <div style={{fontSize:20,fontWeight:900,color:C.sub}}>:</div>
                    <input type="number" min="0" max="99" value={set.b}
                      onChange={e=>setSets(s=>s.map((x,i)=>i===idx?{...x,b:e.target.value}:x))}
                      style={{width:56,height:42,background:C.cardHi,border:"2px solid "+C.red+"55",
                        borderRadius:10,color:C.red,fontWeight:900,fontSize:22,textAlign:"center",
                        fontFamily:"'Outfit',sans-serif",outline:"none"}}/>
                    {sets.length>2&&(
                      <button onClick={()=>setSets(s=>s.filter((_,i)=>i!==idx))}
                        style={{background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:14}}>✕</button>
                    )}
                  </div>
                ))}
                {setsStr&&parseTennisWinner(setsStr)!==0&&(
                  <div style={{fontSize:12,color:C.green,marginTop:4,fontWeight:700}}>
                    ✓ {parseTennisWinner(setsStr)===1?"Команда 1":"Команда 2"} побеждает {setsStr}
                  </div>
                )}
              </div>
            ) : (
              <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginBottom:14}}>
                <ScoreInput val={score1} setVal={setScore1} color={C.sky} label={t.team1}/>
                <div style={{fontSize:22,fontWeight:900,color:C.sub,paddingTop:18}}>:</div>
                <ScoreInput val={score2} setVal={setScore2} color={C.red} label={t.team2}/>
              </div>
              {score1!==""&&score2!==""&&parseInt(score1)===parseInt(score2)&&(
                <div style={{textAlign:"center",color:C.sand,fontSize:12,marginBottom:8}}>{t.noTie}</div>
              )}
              </>
            )}
            <button style={{...bs(matchValid?(isCaptain?C.sand:C.pending):C.border),width:"100%",
              color:matchValid?"#0D0D1A":C.sub,opacity:matchValid?1:0.6}} onClick={saveMatch}>
              {isCaptain?t.save:t.sendReview}
            </button>
          </div>

          {players.length>0&&(
            <div style={cs}>
              <div style={{...ls,marginBottom:10}}>{t.roster}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
                {players.map(p=>(
                  <div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,width:56}}>
                    <div style={{position:"relative"}}>
                      <Avatar player={p} size={46} onClick={isCaptain?()=>setPhotoPickerPlayer(p):undefined}/>
                      {isCaptain&&<div style={{position:"absolute",bottom:-2,right:-2,background:C.accent,
                        borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:9,cursor:"pointer"}}
                        onClick={()=>setPhotoPickerPlayer(p)}>📷</div>}
                    </div>
                    <div style={{fontSize:10,fontWeight:700,textAlign:"center",color:C.text,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:56}}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* STATS TAB */}
        {tab==="stats"&&(<>
          <div style={{...cs,padding:"10px 12px"}}>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[["games",t.rankGames,t.rankGamesHint,C.green],["king",t.rankKing,t.rankKingHint,C.king]].map(([mode,label,hint,ac])=>{
                const on=rankMode===mode;
                return (
                  <div key={mode} onClick={()=>setRankMode(mode)} style={{
                    flex:1,textAlign:"center",borderRadius:10,padding:"9px 6px",
                    background:on?ac+"22":C.cardHi,border:"1.5px solid "+(on?ac:C.border),cursor:"pointer"}}>
                    <div style={{fontSize:15,fontWeight:900,color:on?ac:C.sub}}>{label}</div>
                    <div style={{fontSize:10,color:on?ac+"cc":C.sub,marginTop:2}}>{hint}</div>
                  </div>
                );
              })}
            </div>
            <div style={ls}>{t.period} <span style={{fontWeight:400,fontSize:10,color:C.sub}}>{t.periodHint}</span></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["all",...gameDays].map(d=>{
                const on=dayFilter===d;
                return (
                  <div key={d} style={{display:"flex",alignItems:"center"}}>
                    <div onClick={()=>setDayFilter(d)} style={{
                      borderRadius:d==="all"?20:"20px 0 0 20px",padding:"5px 10px",
                      background:on?C.sky+"33":C.cardHi,border:"1.5px solid "+(on?C.sky:C.border),
                      fontSize:12,fontWeight:700,color:on?C.sky:C.sub,cursor:"pointer",whiteSpace:"nowrap",
                      borderRight:d!=="all"?"none":undefined}}>
                      {d==="all"?t.allTime:fmtDate(d)}
                    </div>
                    {d!=="all"&&(
                      <div onClick={()=>setDayDetailDay(d)} style={{
                        borderRadius:"0 20px 20px 0",padding:"5px 8px",
                        background:C.cardHi,border:"1.5px solid "+C.border,
                        fontSize:11,color:C.sub,cursor:"pointer",borderLeft:"none"}}>ℹ️</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {filteredMatches.length>0&&(
            <div style={{...cs,background:C.cardHi,padding:"10px 16px",
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
            const barPct=isKing?Math.min(100,Math.max(0,50+diff*3)):wr;
            const barColor=isKing?(diff>0?C.king:diff<0?C.red:C.sub):(wr>=60?C.green:wr>=40?C.sand:C.red);
            const tr=trophies[p.id]||{cups:0,crowns:0};
            return (
              <div key={p.id} style={{...cs,border:i===0?`1px solid ${isKing?C.king:C.green}55`:"1px solid "+C.border}}>
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
                      {st.games} {t.gamesLabel(st.games)} · {wr}% {t.winRate}
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:2,marginTop:6}}>
                      <div style={{height:"100%",width:`${barPct}%`,borderRadius:2,background:barColor,transition:"width .5s"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"center",minWidth:54}}>
                    <div style={{fontSize:26,fontWeight:900,color:bigColor,lineHeight:1}}>{bigVal}</div>
                    <div style={{fontSize:9,color:C.sub,letterSpacing:0.8,marginTop:3}}>{isKing?t.pm:t.wins}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-around",marginTop:12,
                  paddingTop:10,borderTop:"1px solid "+C.border}}>
                  {[[st.wins,t.wins,C.green],[st.losses,t.losses,C.red],[st.games,t.games,C.sub],
                    [st.scored,t.scored,C.sky],[st.conceded,t.conceded,C.sub],
                    [diff>=0?`+${diff}`:diff,t.pm,diff>0?C.green:diff<0?C.red:C.sub]
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

        {/* HISTORY TAB */}
        {tab==="history"&&(<>
          {isCaptain&&pendingCount>0&&(
            <div style={{...cs,background:C.pending+"18",border:"1px solid "+C.pending+"55",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:C.pending}}>{t.pendingBanner}: {pendingCount}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>{t.pendingDesc}</div>
              </div>
              <button onClick={approveAll} style={{...bs(C.pending,true),color:"#fff"}}>{t.approveAll}</button>
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
                    📅 {fmtDate(day)} · {dm.length} {t.matches}
                  </div>
                  {link&&(
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:11,color:C.sky,fontWeight:700,textDecoration:"none",
                        background:C.sky+"22",borderRadius:20,padding:"3px 9px",
                        border:"1px solid "+C.sky+"44",whiteSpace:"nowrap"}}>{t.videoLink}</a>
                  )}
                  {isCaptain&&(
                    editingLinkDay===day?(
                      <div style={{display:"flex",gap:4,alignItems:"center"}}>
                        <input autoFocus value={linkInput} onChange={e=>setLinkInput(e.target.value)}
                          placeholder="https://..."
                          onKeyDown={async e=>{if(e.key==="Enter"){await fbSetDayLink(day,linkInput.trim());setEditingLinkDay(null);}if(e.key==="Escape")setEditingLinkDay(null);}}
                          style={{...is,padding:"4px 8px",fontSize:11,width:160,borderRadius:8}}/>
                        <button onClick={async()=>{await fbSetDayLink(day,linkInput.trim());setEditingLinkDay(null);}}
                          style={{...bs(C.green,true),padding:"4px 8px",fontSize:11}}>✓</button>
                        <button onClick={()=>setEditingLinkDay(null)}
                          style={{...bs(C.cardHi,true),padding:"4px 8px",fontSize:11,color:C.sub,border:"1px solid "+C.border}}>✕</button>
                      </div>
                    ):(
                      <button onClick={()=>{setEditingLinkDay(day);setLinkInput(link||"");}}
                        style={{background:"none",border:"1px solid "+C.border,borderRadius:20,
                          padding:"3px 8px",color:C.sub,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
                        {link?"✏️":t.videoAdd}
                      </button>
                    )
                  )}
                </div>
                {dm.map(m=>{
                  const w1=m.score1>m.score2;
                  return (
                    <div key={m.id} style={{...cs,borderColor:m.pending?C.pending:C.border,
                      background:m.pending?C.pending+"0a":C.card}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        {m.pending?<div style={{fontSize:10,fontWeight:800,color:C.pending,
                          background:C.pending+"22",borderRadius:10,padding:"2px 8px"}}>{t.pendingTag}</div>:<div/>}
                        {isCaptain&&(
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            {m.pending&&<button onClick={()=>fbUpdateMatch(m.id,{pending:false})}
                              style={{...bs(C.green,true),fontSize:10,padding:"3px 10px"}}>{t.approveOne}</button>}
                            <button onClick={()=>setEditingMatch({...m})}
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
                          {w1&&<div style={{fontSize:10,color:C.green,fontWeight:700}}>{t.victory}</div>}
                        </div>
                        <div style={{textAlign:"center",flexShrink:0}}>
                          <div style={{fontSize:m.tennisScore?13:24,fontWeight:900,letterSpacing:m.tennisScore?0:-1,
                            color:w1?C.green:C.red,textAlign:"center",maxWidth:90}}>
                            {m.tennisScore || (
                              <><span style={{color:w1?C.green:C.red}}>{m.score1}</span>
                              <span style={{color:C.sub}}> : </span>
                              <span style={{color:!w1?C.green:C.red}}>{m.score2}</span></>
                            )}
                          </div>
                        </div>
                        <div style={{flex:1,textAlign:"right"}}>
                          <div style={{display:"flex",gap:4,marginBottom:4,justifyContent:"flex-end"}}>
                            <Avatar player={pObj(m.t2p1)} size={26}/><Avatar player={pObj(m.t2p2)} size={26}/>
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:!w1?C.green:C.sub}}>
                            {pObj(m.t2p1).name} & {pObj(m.t2p2).name}
                          </div>
                          {!w1&&<div style={{fontSize:10,color:C.green,fontWeight:700}}>{t.victory}</div>}
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

      {/* FOOTER */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,background:"#0D0D1A",
        borderTop:"1px solid "+C.border,padding:"7px 16px",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <img src="/icon-512.png" alt="" style={{width:20,height:20,borderRadius:4,objectFit:"cover"}}/>
          <span style={{fontSize:11,color:C.sub}}>Play 2x2</span>
        </div>
        <span style={{fontSize:11,fontWeight:700,
          color:isSuperAdmin?C.king:isCaptain?C.sand:C.sub}}>
          {isSuperAdmin?t.superMode:isCaptain?t.captainMode:t.viewMode}
        </span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;background:#0D0D1A;}
        body{overflow-x:hidden;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        input::placeholder{color:#7070A0;}
        select option{background:#161626;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#2A2A45;border-radius:2px;}
      `}</style>
    </div>
  );
}
